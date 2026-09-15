import { Body, Controller, Get, Header, Param, Patch, Post, Req, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, UnauthorizedException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectsService, type ProjectAuditEvent } from './projects.service';
import { AiService } from '../ai/ai.service';
import { WorkflowService } from '../workflow/workflow.service';
import { MilestoneService } from '../milestones/milestone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { SYNOPSIS_UPLOAD_OPTIONS, getSafeDownloadHeaders } from '../../common/upload-security';

// Required signing slots for each document; amendments do not advance a PDF step.
const SIGNATURE_STEP_ROLES: Record<string, { stepId?: string; requiredRoles: string[]; documentKind?: 'Protocol Amendment' }> = {
  investigator: { stepId: 'protocol-pdf', requiredRoles: ['investigator', 'sponsor'] },
  sponsor: { stepId: 'protocol-pdf', requiredRoles: ['investigator', 'sponsor'] },
  'report-investigator': { stepId: 'report-pdf', requiredRoles: ['report-investigator', 'report-sponsor'] },
  'report-sponsor': { stepId: 'report-pdf', requiredRoles: ['report-investigator', 'report-sponsor'] },
  'amendment-lead': { requiredRoles: ['amendment-lead', 'amendment-vp'], documentKind: 'Protocol Amendment' },
  'amendment-vp': { requiredRoles: ['amendment-lead', 'amendment-vp'], documentKind: 'Protocol Amendment' },
};

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@ApiTags('projects')
@Controller('/api/projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly ai: AiService,
    private readonly workflow: WorkflowService,
    private readonly milestones: MilestoneService,
  ) {}

 @Get('/requirements')
  async getRequirements(
    @Query('risk') risk: string,
    @Query('deviceCategory') deviceCategory: string,
    @Query('markets') markets: string, // comma-separated
  ) {
    const marketCodes = markets ? markets.split(',') : [];
    return this.projects.getRequirements(risk, deviceCategory, marketCodes);
  }
  @Get('markets')
async getMarkets() {
  return this.projects.getMarkets();
}
  @Get()
  list(@Req() req: any) {
    return this.projects.list(req.user?.companyId, req.user?.isSuperadmin);
  }

  @Post('/milestones/preview')
  previewMilestoneWarnings(@Body() body: { projectData?: Record<string, any>; synopsis?: Record<string, any>; targetMarkets?: string[]; deviceCategory?: string | null; risk?: string | null }) {
    const projectData = {
      ...(body.projectData || {}),
      targetMarkets: body.targetMarkets || body.projectData?.targetMarkets || [],
      deviceCategory: body.deviceCategory || body.projectData?.deviceCategory || '',
      risk: body.risk ?? body.projectData?.risk ?? '',
    };
    const complexity = this.milestones.calculateComplexity(projectData, body.synopsis || {});
    return {
      warnings: this.milestones.computeWarnings({
        data: {
          projectData,
          synopsis: body.synopsis || {},
        },
      }),
      complexity: {
        ...complexity,
        label: complexity.level === 'very_high'
          ? 'Very High'
          : complexity.level.charAt(0).toUpperCase() + complexity.level.slice(1),
      },
    };
  }

  @Get('/completed')
  listCompleted(@Req() req: any) {
    return this.projects.listCompleted(req.user?.companyId, req.user?.isSuperadmin);
  }

  @Get('/:projectId/standards')
  getProjectStandards(@Param('projectId') projectId: string) {
    return this.projects.getProjectStandards(projectId);
  }

  @Get('/:projectId')
  @Header('Cache-Control', 'no-store')
  get(@Param('projectId') projectId: string) { return this.projects.get(projectId); }

  @Post('/:projectId/synopsis/complete')
  @Roles('admin', 'author')
  completeSynopsis(
    @Param('projectId') projectId: string,
    @Body() body: { synopsis?: Record<string, any> },
    @Req() req: any,
  ) {
    return this.projects.completeSynopsis(projectId, body.synopsis || {}, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
  }

  @Post('/:projectId/synopsis/findings/:findingId/override')
  @Roles('admin', 'author')
  overrideSynopsisFinding(
    @Param('projectId') projectId: string,
    @Param('findingId') findingId: string,
    @Body() body: { justification?: string },
    @Req() req: any,
  ) {
    return this.projects.overrideSynopsisFinding(projectId, findingId, body.justification, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
  }

  @Post()
  @Roles('admin', 'author')
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    // Plan-limit enforcement and last-active touch happen inside projects.create()
    // itself now, under the same locked transaction as the insert — see
    // AdminService.enforceProjectLimit() for why that's required to close the race.
    const companyId: string | undefined = req.user?.companyId;
    const project = await this.projects.create(dto, companyId, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
    return { ...project, milestoneWarnings: this.milestones.computeWarnings(project) };
  }

  @Patch('/:projectId')
async update(@Param('projectId') projectId: string, @Body() body: UpdateProjectDto, @Req() req: any) {
  const existing = await this.projects.get(projectId);

  // 1. Role assignments: only admins can change them
  const rolesChanged = body.roles !== undefined &&
    JSON.stringify(normalizeRoleAssignments(body.roles)) !==
      JSON.stringify(normalizeRoleAssignments(existing.roles));
  if (rolesChanged && !req.user?.roles?.includes('admin')) {
    throw new ForbiddenException('Only a company admin can change project role assignments');
  }

  // 2. Scope lock check (only block if scope actually changed)
  const scopeChanged = body.data?.scope !== undefined &&
    JSON.stringify(body.data.scope) !== JSON.stringify(existing?.data?.scope);
  if (scopeChanged) {
    const workflowSteps = await this.workflow.getSnapshot(projectId);
    const protocolFinal = workflowSteps?.steps?.['protocol-pdf']?.state === 'final';
    if (protocolFinal) {
      return { error: 'Scope is locked after protocol finalization', locked: true };
    }
  }

  // Build readable audit events before the write, then hand them to ProjectsService so
  // every event is inserted with the same transaction client as the project mutation.
  const auditEvents: ProjectAuditEvent[] = [];
  if (body.roles) {
    const oldRoles: any[] = existing.roles || [];
    const changes: string[] = [];
    for (const newRole of body.roles) {
      const oldRole = oldRoles.find((r: any) => r.title === newRole.title);
      const oldPeople = (oldRole?.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
      const newPeople = (newRole.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
      if (oldPeople !== newPeople) {
        changes.push(newRole.title + ': ' + oldPeople + ' -> ' + newPeople);
      }
    }
    if (changes.length > 0) {
      auditEvents.push({
        type: 'project.roles.updated',
        message: 'Project roles updated',
        stepId: 'project-setup',
        entityType: 'project_member',
        entityId: projectId,
        entityLabel: 'Project roles',
        metadata: { roles: changes },
      });
    }
  }

  if (body.name !== undefined && body.name !== existing.name) {
    auditEvents.push({
      type: 'project.setup.completed',
      message: 'Project setup completed: ' + body.name,
      stepId: 'project-setup',
      entityType: 'project',
      entityId: projectId,
      entityLabel: body.name,
      metadata: { projectName: body.name, description: body.description ?? null },
    });
  }

  const relationalChanges: Record<string, { before: any; after: any }> = {};
  if (body.risk !== undefined && body.risk !== existing.risk) {
    relationalChanges.risk = { before: existing.risk, after: body.risk };
  }
  if (
    body.deviceCategory !== undefined &&
    body.deviceCategory !== existing.deviceCategory
  ) {
    relationalChanges.deviceCategory = { before: existing.deviceCategory, after: body.deviceCategory };
  }
  if (body.targetMarkets !== undefined) {
    const beforeMarkets = [...existing.targetMarkets].sort();
    const afterMarkets = [...body.targetMarkets].sort();
    if (JSON.stringify(beforeMarkets) !== JSON.stringify(afterMarkets)) {
      relationalChanges.targetMarkets = {
        before: beforeMarkets,
        after: afterMarkets,
      };
    }
  }
  if (Object.keys(relationalChanges).length > 0) {
    auditEvents.push({
      type: 'project.setup.relational.updated',
      message: `Project setup fields updated: ${Object.keys(relationalChanges).join(', ')}`,
      stepId: 'project-setup',
      entityType: 'project',
      entityId: projectId,
      metadata: { changes: relationalChanges },
    });
  }

  if (body.data) {
    const changedKeys: string[] = [];
    const summaries: string[] = [];
    const changes: Record<string, { before: any; after: any }> = {};
    for (const key of Object.keys(body.data)) {
      const before = existing?.data?.[key];
      const supplied = body.data[key];
      const after = before && supplied && typeof before === 'object' && typeof supplied === 'object' && !Array.isArray(before) && !Array.isArray(supplied)
        ? { ...before, ...supplied }
        : supplied;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changedKeys.push(key);
        summaries.push(summarizeFieldChange(key, before, after));
        changes[key] = key === 'protocol'
          ? { before: protocolAuditSnapshot(before), after: protocolAuditSnapshot(after) }
          : { before, after };
      }
    }
    if (changedKeys.length > 0) {
      const protocolOnly = changedKeys.length === 1 && changedKeys[0] === 'protocol';
      auditEvents.push({
        type: protocolOnly ? 'protocol.updated' : 'project.data.updated',
        message: `${protocolOnly ? 'Protocol' : 'Project data'} updated: ${summaries.join('; ')}`,
        stepId: protocolOnly ? 'protocol-make' : 'project-setup',
        entityType: protocolOnly ? 'protocol' : 'project',
        entityId: projectId,
        metadata: { changedKeys, changes },
      });
    }
  }

  const result = await this.projects.update(projectId, body, {
    userId: req.user?.userId,
    companyId: req.user?.companyId,
    name: req.user?.name,
    roles: req.user?.roles,
    isSuperadmin: req.user?.isSuperadmin,
  }, auditEvents);

  return result;
}

 
  // ── Electronic signature (21 CFR Part 11 / EU MDR compliant) ───────────────
  @Post('/:projectId/signatures')
  async createSignature(
    @Param('projectId') projectId: string,
    @Body() body: {
      role: string;
      roleTitle: string;
      documentHash: string;
    },
    @Req() req: any,
  ) {
    // Identity (who is signing) always comes from the authenticated session —
    // never from the request body — so a caller can't sign/approve as someone
    // else. `role` is the UI slot key ('investigator'/'sponsor') used purely for
    // storage/restore; `roleTitle` is the actual project role title, cross-checked
    // against the project's real role assignments so a user can't claim a role
    // they don't hold.
    const userId: string | undefined = req.user?.userId;
    const identity = userId ? await this.projects.getUserIdentity(userId) : null;
    if (!identity) throw new UnauthorizedException('Unable to resolve signer identity');

    const project = await this.projects.get(projectId);
    const projectRoles: any[] = project.roles || [];
    const claimedRole = projectRoles.find((r: any) =>
      r.title === body.roleTitle &&
      (r.assignedTo || []).some((p: any) => p.email?.toLowerCase() === identity.email?.toLowerCase())
    );
    if (!claimedRole) {
      throw new ForbiddenException(`You are not assigned to the "${body.roleTitle}" role on this project`);
    }

    // `role` must be one of the real signing slots (reusing the same map the
    // auto-finalize logic below uses) so we know which workflow step this signature is
    // actually for, and that step must already be 'signed' — the state
    // advanceWorkflowStep() puts it in once mark_ready/start_review/approve/sign have all
    // genuinely happened — before a signature can be recorded at all. Without this, a
    // document that was never authored, reviewed, or approved (still 'draft') could be
    // "signed" directly, indistinguishable in the UI from a properly executed one.
    const stepConfigForRole = SIGNATURE_STEP_ROLES[body.role];
    if (!stepConfigForRole) {
      throw new BadRequestException(`Unknown signature role "${body.role}"`);
    }
    if (stepConfigForRole.stepId) {
      const preSignSnapshot = await this.workflow.getSnapshot(projectId);
      const preSignState = preSignSnapshot.steps?.[stepConfigForRole.stepId]?.state;
      if (preSignState !== 'signed' && preSignState !== 'final') {
        throw new BadRequestException(
          `${stepConfigForRole.stepId} must be fully reviewed and approved (workflow state 'signed') before it can be signed — current state: ${preSignState ?? 'unknown'}`,
        );
      }
    } else {
      const approvedAmendments = (project.data?.protocol?.amendments || []).filter(
        (amendment: any) => amendment.status === 'approved',
      );
      if (approvedAmendments.length === 0) {
        throw new BadRequestException('An approved protocol amendment is required before amendment signatures can be recorded');
      }
    }

    const id = randomUUID();
    const signedAt = new Date().toISOString();

    // Resolve client IP — honour proxy headers first
    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const sigRecord = {
      id,
      projectId,
      role: body.role,
      roleTitle: body.roleTitle,
      signerName: identity.name,
      signerEmail: identity.email,
      signerUserId: identity.id,
      documentHash: body.documentHash,
      signedAt,
      ipAddress,
    };

    // Append to signatures array (preserves previous signatures on the same document).
    // Done via updateSignaturesAtomic() rather than a get()-then-update() pair so the
    // read, the "remove any prior signature for this role" dedupe, and the write all
    // happen inside one row-locked transaction — otherwise two signatures submitted close
    // together could each be computed against the same stale snapshot and one would
    // silently overwrite the other (pentest F8).
    const documentKind = stepConfigForRole.documentKind ?? (body.role.startsWith('report-') ? 'Report' : 'Protocol');
    const signatureStepId = stepConfigForRole.stepId;
    const { signatures: allSignatures } = await this.projects.updateSignaturesAtomic(
      projectId,
      (existing) => {
        const filtered = existing.filter((s: any) => s.role !== body.role);
        return [...filtered, sigRecord];
      },
      req.user,
      {
        type: `${documentKind.toLowerCase()}.signed`,
        message: `${documentKind} electronically signed by ${identity.name} (${body.roleTitle})`,
        stepId: signatureStepId,
        entityType: 'signature',
        entityId: id,
        entityLabel: `${documentKind} signature by ${identity.name}`,
        metadata: {
          signatureId: id,
          signerName: identity.name,
          signerEmail: identity.email,
          signerUserId: identity.id,
          role: body.role,
          roleTitle: body.roleTitle,
          documentHash: body.documentHash,
          signedAt,
          ipAddress,
        },
      },
    );

    // Once every required slot for this document is signed, finalize it — this is the
    // only place that ever does, see the SIGNATURE_STEP_ROLES comment above. Only fires
    // from 'signed' (the state advanceWorkflowStep() puts the step in before e-signing is
    // even offered); if the workflow is somehow in a different state, skip rather than
    // let an unrelated inconsistency turn a successful signature into a failed request.
    const stepConfig = SIGNATURE_STEP_ROLES[body.role];
    if (stepConfig?.stepId) {
      const hasAllRequiredSignatures = stepConfig.requiredRoles.every((r) =>
        allSignatures.some((s: any) => s.role === r),
      );
      if (hasAllRequiredSignatures) {
        const snapshot = await this.workflow.getSnapshot(projectId);
        if (snapshot.steps?.[stepConfig.stepId]?.state === 'signed') {
          await this.workflow.transition(projectId, stepConfig.stepId, {
            action: 'finalize',
            reason: `Finalized after both required signatures collected (${stepConfig.requiredRoles.join(', ')})`,
          }, req.user);
        }
      }
    }

    return sigRecord;
  }

  @Post('/:projectId/synopsis-file')
  @UseInterceptors(FileInterceptor('file', SYNOPSIS_UPLOAD_OPTIONS))
  async uploadSynopsisFile(@Param('projectId') projectId: string, @UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.projects.saveSynopsisFile(
      projectId,
      file.originalname,
      file.buffer,
      file.mimetype ?? 'application/octet-stream',
      req.user,
    );
    return { fileName: file.originalname };
  }

  @Get('/:projectId/synopsis-file')
  async getSynopsisFile(@Param('projectId') projectId: string, @Res() res: any) {
    const file = await this.projects.getSynopsisFile(projectId);
    // Never trust the stored/uploaded mimetype for how the browser should render this —
    // only a real .pdf is ever served inline; everything else is forced to attachment +
    // application/octet-stream so an uploaded HTML/script file can't execute as a page.
    const { contentType, contentDisposition } = getSafeDownloadHeaders(file.fileName);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.send(file.bytes);
  }

  @Post('/:projectId/analyze-synopsis')
  @UseGuards(AiThrottlerGuard)
  @UseInterceptors(FileInterceptor('file', SYNOPSIS_UPLOAD_OPTIONS))
  async analyzeSynopsis(@Param('projectId') projectId: string, @UploadedFile() file: any) {
    // Retry may happen after a page reload, when the browser no longer has the original
    // File object. In that case analyze the synopsis already stored for this project.
    const sourceFile = file || await this.projects.getSynopsisFile(projectId);
    let text = '';
    const mimetype = sourceFile.mimetype || sourceFile.contentType || '';
    const filename = sourceFile.originalname || sourceFile.fileName || '';
    const buffer = sourceFile.buffer || sourceFile.bytes;
    if (mimetype.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString('utf-8');
    }
    console.log('[analyzeSynopsis] extracted text length:', text.length, '| preview:', text.slice(0, 300));

    const existing = await this.projects.get(projectId);
    const existingSynopsis = existing?.data?.synopsis || {};
    const targetMarkets = existing.targetMarkets || [];

    const results = await this.ai.analyzeSynopsis(text, targetMarkets);
    console.log('[analyzeSynopsis] AI response:', JSON.stringify(results));

    // Persist extracted text and checklist so downstream steps (protocol generation, complexity) can use them
    await this.projects.update(projectId, {
      data: {
        synopsis: {
          ...existingSynopsis,
          extractedText: text,
          readinessChecklist: results,
          aiReviewComplete: true,
        },
      },
    });

    return results;
  }

  @Post('/:projectId/derive-scope')
  @UseGuards(AiThrottlerGuard)
  async deriveScope(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const synopsisText = project?.data?.synopsis?.extractedText;
    if (!synopsisText) return { deviceCategory: '', intendedUse: '', confidence: 'low' };
    return this.ai.deriveScopeFromSynopsis(synopsisText);
  }

  @Post('/:projectId/analyze-scope')
  @UseGuards(AiThrottlerGuard)
  async analyzeScope(@Param('projectId') projectId: string, @Body() body: { prompt: string }) {
    const results = await this.ai.analyzeScope(body.prompt);
    return results;
  }

  @Get('/:projectId/milestones')
  async getMilestones(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    if (!project) throw new BadRequestException('Project not found');

    const snapshot = await this.workflow.getSnapshot(projectId);
    const workflowStates: Record<string, string> = {};
    for (const [k, v] of Object.entries(snapshot.steps || {})) {
      workflowStates[k] = (v as any).state;
    }

    return this.milestones.computeMilestones(project, workflowStates);
  }

 @Post('/:projectId/workflow/force-synopsis')
async forceSynopsis(@Param('projectId') projectId: string, @Req() req: any) {
  // Restrict to dev or admin
  if (process.env.NODE_ENV === 'production' && !req.user?.roles?.includes('admin')) {
    throw new ForbiddenException('This endpoint is only available in development or for admins');
  }

  return this.workflow.forceSynopsis(projectId, req.user);
}
}


// Produces a short, human-readable note for one changed compatibility-response key.
// Protocol writes are intercepted by ProjectsService and stored relationally even
// while older frontend callers continue to send them under data.protocol.
function normalizeRoleAssignments(roles: any[] | undefined): string[] {
  if (!roles) return [];
  return roles
    .flatMap(role =>
      (role.assignedTo || []).map((person: any) =>
        `${String(role.title || '').trim()}|${String(person.email || '').trim().toLowerCase()}`,
      ),
    )
    .filter(Boolean)
    .sort();
}


function summarizeFieldChange(key: string, oldVal: any, newVal: any): string {
  if (
    oldVal && newVal &&
    typeof oldVal === 'object' && typeof newVal === 'object' &&
    !Array.isArray(oldVal) && !Array.isArray(newVal)
  ) {
    const noteworthy: string[] = [];
    const subKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    for (const subKey of subKeys) {
      const oldSub = oldVal[subKey];
      const newSub = newVal[subKey];
      if (Array.isArray(oldSub) || Array.isArray(newSub)) {
        const oldLen = Array.isArray(oldSub) ? oldSub.length : 0;
        const newLen = Array.isArray(newSub) ? newSub.length : 0;
        if (oldLen !== newLen) noteworthy.push(`${key}.${subKey}: ${oldLen} -> ${newLen} item(s)`);
      }
    }
    if (noteworthy.length > 0) return noteworthy.join('; ');
  }
  if (Array.isArray(oldVal) || Array.isArray(newVal)) {
    const oldLen = Array.isArray(oldVal) ? oldVal.length : 0;
    const newLen = Array.isArray(newVal) ? newVal.length : 0;
    if (oldLen !== newLen) return `${key}: ${oldLen} -> ${newLen} item(s)`;
  }
  return `${key} changed`;
}


function protocolAuditSnapshot(value: any): Record<string, any> | null {
  if (!value || typeof value !== 'object') return null;
  const sections = Array.isArray(value.sections) ? value.sections : [];
  const amendments = Array.isArray(value.amendments) ? value.amendments : [];
  return {
    protocolId: value.protocolId ?? null,
    version: value.version ?? null,
    status: value.status ?? null,
    sectionCount: sections.length,
    amendmentCount: amendments.length,
    sections: sections.map((section: any) => ({
      id: section.id ?? null,
      title: section.title ?? null,
      status: section.status ?? null,
      approvalStatus: section.approvalStatus ?? null,
      reviewStatus: section.reviewStatus ?? null,
      contentLength: typeof section.content === 'string' ? section.content.length : 0,
      commentCount: Array.isArray(section.comments) ? section.comments.length : 0,
      issueCount: Array.isArray(section.issues) ? section.issues.length : 0,
    })),
    amendments: amendments.map((amendment: any) => ({
      id: amendment.id ?? null,
      number: amendment.number ?? null,
      title: amendment.title ?? null,
      status: amendment.status ?? null,
    })),
  };
}
