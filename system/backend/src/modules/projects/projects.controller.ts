import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, InternalServerErrorException, ForbiddenException, UnauthorizedException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { CreateProjectDto, UpdateProjectDto, UpdateSectionContentDto } from './dto';
import { ProjectsService, type ProjectAuditEvent } from './projects.service';
import { AiService, PROTOCOL_SECTION_TITLES } from '../ai/ai.service';
import { GenerationProgressService } from '../ai/generation-progress.service';
import { WorkflowService } from '../workflow/workflow.service';
import { MilestoneService } from '../milestones/milestone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { SYNOPSIS_UPLOAD_OPTIONS, getSafeDownloadHeaders } from '../../common/upload-security';
import { getMissingProtocolAttachmentIssues } from './protocol-attachment-reference';

// The PDF steps (protocol-pdf/report-pdf) only ever reach the workflow's 'signed' state
// through advanceWorkflowStep() — nothing in the UI ever calls the document-artifact
// finalize endpoint that's the only other code path to 'final' (see documents.controller.ts).
// That leaves protocolFinalized/isLocked (useProtocolStatus.ts) permanently false and the
// Setup/Synopsis/Scope pages permanently unlocked, no matter how many signatures are
// collected. Rather than wire in the artifact/addendum subsystem — its finalize() builds
// its own generic PDFKit document (workflow snapshot + audit log) that has nothing to do
// with the actual protocol/report content rendered and printed by ProtocolDocument.tsx /
// ClinicalInvestigationReport.tsx, so treating it as "the" signed record would be wrong —
// this maps each signature slot straight to its step and fires the workflow's own
// 'finalize' transition once every required slot for that step is filled.
const SIGNATURE_STEP_ROLES: Record<string, { stepId: string; requiredRoles: string[] }> = {
  investigator: { stepId: 'protocol-pdf', requiredRoles: ['investigator', 'sponsor'] },
  sponsor: { stepId: 'protocol-pdf', requiredRoles: ['investigator', 'sponsor'] },
  'report-investigator': { stepId: 'report-pdf', requiredRoles: ['report-investigator', 'report-sponsor'] },
  'report-sponsor': { stepId: 'report-pdf', requiredRoles: ['report-investigator', 'report-sponsor'] },
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
    private readonly generationProgress: GenerationProgressService,
  ) { }

  // Same "done" set the frontend's shared/workflow/gate.ts uses to decide a step is
  // actually complete, duplicated here because the frontend's WorkflowStepGuard is a
  // client-side redirect only — it stops a user clicking into a page they shouldn't, but
  // does nothing for a direct API call (curl, a modified client, or the QA regression
  // testing that found this). Every route below that can trigger a real, billed AI call
  // or write to a project's data needs its own backend-side check.
  private static readonly WORKFLOW_DONE_STATES = new Set(['approved', 'signed', 'final']);

  // Refuses AI generation/analysis once the corresponding PDF step has been signed. A
  // signed protocol/report is a finalized regulatory artifact — regenerating or
  // re-analyzing it is never correct, and QA regression testing found the frontend alone
  // doesn't reliably prevent it: opening report/make or protocol/make on an
  // already-signed project re-runs AI analysis on every page load regardless, burning a
  // real Azure OpenAI call and a DB write each time. This is the permanent backend
  // backstop for that, independent of whatever the frontend does or doesn't skip.
  private async assertDocumentNotSigned(projectId: string, pdfStepId: 'protocol-pdf' | 'report-pdf') {
    const snapshot = await this.workflow.getSnapshot(projectId);
    const state = snapshot.steps?.[pdfStepId]?.state;
    if (state === 'signed' || state === 'final') {
      throw new BadRequestException(
        `This ${pdfStepId === 'protocol-pdf' ? 'protocol' : 'report'} has already been finalized and signed and can no longer be regenerated or re-analyzed.`,
      );
    }
  }

  // Backend enforcement of the same prerequisite the frontend's WorkflowStepGuard checks
  // for protocol-make (synopsis and scope must both be done first) — see comment above on
  // why the frontend guard alone isn't sufficient. Returns a fast, explicit 400 instead of
  // letting generateProtocol() run against empty synopsis/scope data, which previously
  // just hung until the AI call itself timed out.
  private async assertProtocolPrerequisites(projectId: string) {
    const snapshot = await this.workflow.getSnapshot(projectId);
    const synopsisDone = ProjectsController.WORKFLOW_DONE_STATES.has(snapshot.steps?.synopsis?.state ?? '');
    const scopeDone = ProjectsController.WORKFLOW_DONE_STATES.has(snapshot.steps?.scope?.state ?? '');
    if (!synopsisDone || !scopeDone) {
      throw new BadRequestException('Synopsis and scope must both be completed before protocol generation can start.');
    }
  }
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

  @Get('/completed')
  listCompleted(@Req() req: any) {
    return this.projects.listCompleted(req.user?.companyId, req.user?.isSuperadmin);
  }

  @Get('/:projectId/standards')
  getProjectStandards(@Param('projectId') projectId: string) {
    return this.projects.getProjectStandards(projectId);
  }

  @Get('/:projectId/report-sections')
  async getReportSections(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const scope = project?.data?.scope || {};

    const inferredFromRequirements: string[] = (scope?.requirements || [])
      .filter((r: any) => r.status === 'accepted')
      .map((r: any) => {
        if (r.title.includes('FDA') || r.title.includes('US')) return 'FDA';
        if (r.title.includes('EU') || r.title.includes('MDR')) return 'EU';
        return null;
      })
      .filter(Boolean);
    const uniqueInferred = [...new Set(inferredFromRequirements)] as string[];
    const targetMarkets: string[] =
      project.targetMarkets.length > 0
        ? project.targetMarkets
        : (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

    const sections = this.getDynamicReportSections(targetMarkets, scope);
    return {
      sections,
      targetMarkets,
      deviceCategory: project.deviceCategory || '',
      studyType: project?.data?.synopsis?.studyType || '',
    };
  }

  @Get('/:projectId')
  get(@Param('projectId') projectId: string) { return this.projects.get(projectId); }

  @Post()
  @Roles('admin', 'author')
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    // Plan-limit enforcement and last-active touch happen inside projects.create()
    // itself now, under the same locked transaction as the insert — see
    // AdminService.enforceProjectLimit() for why that's required to close the race.
    const companyId: string | undefined = req.user?.companyId;
    return this.projects.create(dto, companyId, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
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
    const preSignSnapshot = await this.workflow.getSnapshot(projectId);
    if (preSignSnapshot.steps?.[stepConfigForRole.stepId]?.state !== 'signed') {
      throw new BadRequestException(
        `${stepConfigForRole.stepId} must be fully reviewed and approved (workflow state 'signed') before it can be signed — current state: ${preSignSnapshot.steps?.[stepConfigForRole.stepId]?.state ?? 'unknown'}`,
      );
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
    const documentKind = body.role.startsWith('report-') ? 'Report' : 'Protocol';
    const signatureStepId = body.role.startsWith('report-') ? 'report-pdf' : 'protocol-pdf';
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
    if (stepConfig) {
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

  @Patch('/:projectId/protocol/sections/:sectionId')
  async updateSection(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateSectionContentDto,
    @Req() req: any,
  ) {
    return this.projects.updateProtocolSection(
      projectId,
      sectionId,
      {
        content: body.content,
        previousContent: body.previousContent,
        reason: body.reason,
        approvalStatus: body.approvalStatus,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt,
      },
      req.user,
    );
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
    if (!file) throw new BadRequestException('No file uploaded');
    let text = '';
    const mimetype = file.mimetype || '';
    const filename = file.originalname || '';
    if (mimetype.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else {
      text = file.buffer.toString('utf-8');
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

  @Get('/:projectId/generate-protocol/progress')
  getGenerateProtocolProgress(@Param('projectId') projectId: string) {
    const entry = this.generationProgress.get(`protocol:${projectId}`);
    if (!entry) return { active: false, completed: 0, total: 0, currentLabel: null };
    return { active: true, ...entry };
  }

  @Post('/:projectId/generate-protocol')
  @UseGuards(AiThrottlerGuard)
  async generateProtocol(@Param('projectId') projectId: string, @Req() req: any) {
    await this.assertDocumentNotSigned(projectId, 'protocol-pdf');
    await this.assertProtocolPrerequisites(projectId);
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project.roles || [];
    const scope = project?.data?.scope || {};
    const synopsisData = project?.data?.synopsis || {};
    const synopsisText = synopsisData.extractedText ||
      (synopsisData.readinessChecklist?.map((i: any) => i.reason).filter(Boolean).join(' ') ?? '');
    const targetMarkets = project.targetMarkets.length > 0 ? project.targetMarkets : ['EU'];
    const deviceCategory = project.deviceCategory || '';
    const intendedUse = scope?.intendedUse || '';

    const progressKey = `protocol:${projectId}`;
    let protocol: any;
    try {
      this.generationProgress.start(progressKey, PROTOCOL_SECTION_TITLES.length);
      protocol = await this.ai.generateProtocol(
        projectData, roles, synopsisText, scope,
        (title) => this.generationProgress.increment(progressKey, title),
      );
    } catch (err) {
      // The real error (whatever an AI integration happens to throw — could include
      // upstream response bodies, internal URLs, etc.) is logged and audited
      // server-side only. The client always gets the same generic, predefined message.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[generateProtocol] failed for project ${projectId}:`, err);
      await this.projects.recordProjectEvent(projectId, {
        type: 'protocol.generation_failed',
        message: `Protocol generation failed: ${message}`,
        stepId: 'protocol-make',
        entityType: 'protocol',
        entityId: projectId,
        entityLabel: 'Protocol',
        metadata: { error: message, failedAt: new Date().toISOString() },
      });
      throw new InternalServerErrorException('Protocol generation failed. Please try again or contact support if the problem persists.');
    } finally {
      this.generationProgress.clear(progressKey);
    }
    if (!protocol) return null;

    // Sanitize AI-generated section content before the relational save so a
    // prompt-injected or hallucinated HTML response cannot reach rendered content.
    protocol.sections = (protocol.sections || []).map((s: any) =>
      s && typeof s.content === 'string' ? { ...s, content: sanitizeSectionHtml(s.content) } : s
    );
    if (!Array.isArray(protocol.amendments)) protocol.amendments = [];

    // Batched (not all-at-once) to avoid tripping Azure OpenAI rate limits.
    const REQUIRED_ELEMENTS_BATCH_SIZE = 3;
    for (let i = 0; i < protocol.sections.length; i += REQUIRED_ELEMENTS_BATCH_SIZE) {
      const batch = protocol.sections.slice(i, i + REQUIRED_ELEMENTS_BATCH_SIZE);
      await Promise.all(
        batch.map(async (section: any) => {
          const elements = await this.ai.generateRequiredElements(
            section.title,
            targetMarkets,
            deviceCategory,
            intendedUse
          );
          section.requiredElements = elements;
        })
      );
    }

    // Store generation and its audit event atomically. The response is now a view of
    // committed relational rows rather than an unsaved browser-only protocol.
    const savedProject = await this.projects.update(
      projectId,
      { data: { protocol } },
      req.user,
      [{
        type: 'protocol.generated',
        message: 'Protocol generated by AI',
        stepId: 'protocol-make',
        entityType: 'protocol',
        entityId: projectId,
        entityLabel: 'Protocol',
        metadata: { sections: protocol.sections.length, generatedAt: new Date().toISOString() },
      }],
    );

    return savedProject.data?.protocol ?? protocol;
  }

  @Post('/:projectId/analyze-section')
  @UseGuards(AiThrottlerGuard)
  async analyzeSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; sectionId?: string; requiredElements?: any[] }
  ) {
    await this.assertDocumentNotSigned(projectId, 'protocol-pdf');
    const project = await this.projects.get(projectId);
    return this.runSectionAnalysis(project, body.sectionTitle, body.sectionContent, body.sectionId, body.requiredElements);
  }

  @Post('/:projectId/analyze-sections')
  @UseGuards(AiThrottlerGuard)
  async analyzeSections(
    @Param('projectId') projectId: string,
    @Body() body: { sectionIds?: string[] } = {},
  ) {
    await this.assertDocumentNotSigned(projectId, 'protocol-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const sections = (protocol.sections || []).filter((s: any) =>
      s.content && (!body.sectionIds || body.sectionIds.includes(s.id))
    );

    // Batches of 3 (same pattern as generateProtocol) keep concurrent Azure OpenAI
    // requests low enough to avoid tripping per-minute rate limits.
    const results = await this.ai.mapInBatches(sections, 3, async (section: any) => {
      const result = await this.runSectionAnalysis(project, section.title, section.content, section.id, section.requiredElements);
      return { sectionId: section.id, ...result };
    });

    return { results };
  }

  private async runSectionAnalysis(project: any, sectionTitle: string, sectionContent: string, sectionId: string | undefined, requiredElements: any[] | undefined) {
    const targetMarkets = project?.targetMarkets?.length > 0 ? project.targetMarkets : ['EU'];
    const deviceCategory = project?.deviceCategory || '';
    const intendedUse = project?.data?.scope?.intendedUse || '';

    const protocol = project?.data?.protocol || {};
    const section = (protocol.sections || []).find((s: any) => s.title === sectionTitle || s.id === sectionId);
    const amendmentContext = section?.amended && section?.amendmentId
      ? (protocol.amendments || []).find((a: any) => a.id === section.amendmentId) || null
      : null;

    const crossSectionContext = (protocol.sections || [])
      .filter((s: any) => ['Study Design', 'Study Rationale & Objectives'].includes(s.title) && s.title !== sectionTitle && s.content)
      .map((s: any) => ({ title: s.title, content: s.content }));

    const acceptedRequirements = (project?.data?.scope?.requirements || [])
      .filter((r: any) => r.status === 'accepted')
      .map((r: any) => `${r.title}: ${r.description}`)
      .join('\n');

    const synopsisExcerpt = project?.data?.synopsis?.extractedText || '';

    const protocolAttachments = await this.projects.listProtocolAttachmentsForAnalysis(project.id);
    const attachmentLabels = protocolAttachments.map((attachment) =>
      `Appendix ${attachment.appendixNumber}: ${attachment.filename}${attachment.description ? ` — ${attachment.description}` : ''}`,
    );
    const attachmentIssues = getMissingProtocolAttachmentIssues(
      { id: sectionId || section?.id || sectionTitle, title: sectionTitle, content: sectionContent },
      protocolAttachments.map((attachment) => attachment.appendixNumber),
    );

    const ruleIssues = getRuleBasedIssues(
      { id: sectionId || section?.id || sectionTitle, title: sectionTitle, content: sectionContent },
      targetMarkets,
      project?.data?.projectData || {},
    );

    // This integrity check does not need AI. Return known-broken references
    // immediately, which also keeps this acceptance path usable before the AI
    // integration is configured. Once fixed, the normal AI review runs below.
    if (attachmentIssues.length > 0) {
      return {
        issues: mergeIssues(ruleIssues, attachmentIssues),
        requiredElements: requiredElements || [],
        analysisSource: 'deterministic',
      };
    }

    const result = await this.ai.analyzeSection(sectionTitle, sectionContent, targetMarkets, deviceCategory, intendedUse, requiredElements, amendmentContext, crossSectionContext, acceptedRequirements, synopsisExcerpt, attachmentLabels);

    if (result?.error) return result;

    // Deterministic rule-based checks always run alongside the AI analysis, so
    // regulatory-reference and specificity gaps are caught even if the AI misses them.
    result.issues = mergeIssues(mergeIssues(result.issues || [], ruleIssues), attachmentIssues);
    return result;
  }

  // ── Protocol amendments ─────────────────────────────────────────────────
  @Post('/:projectId/amendments')
  async createAmendment(
    @Param('projectId') projectId: string,
    @Body() body: {
      title: string;
      reason: string;
      description: string;
      affectedProtocolSections: string[];
    },
    @Req() req: any,
  ) {
    let newAmendment: any;
    await this.projects.updateProtocolAtomic(projectId, (protocol) => {
      // Everything the previous version computed from an unprotected get() — sections,
      // amendments length, sequence number — is now read from `protocol` as handed in
      // under the row lock, so it reflects every concurrent write already committed.
      const amendments: any[] = protocol.amendments ? [...protocol.amendments] : [];

      // Capture a snapshot of every protocol section's content at the moment the amendment
      // is initiated — this is the "before" state used for track-changes rendering.
      const protocolSections: any[] = protocol.sections || [];
      const protocolSnapshot: Record<string, { title: string; content: string; version: string }> = {};
      for (const section of protocolSections) {
        if (section.id) {
          protocolSnapshot[section.id] = {
            title: section.title || section.id,
            content: section.content || '',
            version: protocol.version || '1.0',
          };
        }
      }

      newAmendment = {
        id: `amd-${randomUUID()}`,
        number: amendments.length + 1,
        title: body.title,
        reason: body.reason,
        description: body.description,
        affectedProtocolSections: body.affectedProtocolSections,
        affectedReportSections: this.getAffectedReportSections(body.affectedProtocolSections),
        status: 'draft',
        // Attribution is always taken from the authenticated session, never the body.
        createdBy: req.user?.name ?? 'Unknown user',
        createdAt: new Date().toISOString(),
        protocolVersion: protocol.version || '1.0',
        protocolSnapshot,
        approvals: {
          pi: { approved: false, by: null, at: null },
          sponsor: { approved: false, by: null, at: null },
          ethicsCommittee: { status: 'pending', uploadedDoc: null, confirmedAt: null }
        }
      };

      amendments.push(newAmendment);
      return { ...protocol, amendments };
    }, req.user, () => ({
      type: 'amendment.created',
      message: `Amendment ${newAmendment.number}: ${body.title}`,
      stepId: 'protocol-make',
      entityType: 'amendment',
      entityId: newAmendment.id,
      entityLabel: body.title,
      metadata: {
        amendmentId: newAmendment.id,
        reason: body.reason,
        affectedProtocolSections: body.affectedProtocolSections,
      },
    }));

    // Block report-make while the amendment is pending approval
    try {
      await this.workflow.transition(
        projectId,
        'report-make',
        { action: 'request_changes', reason: `Amendment ${newAmendment.number} pending approval` },
        req.user,
      );
    } catch (e: any) {
      console.warn('[amendment] Could not block report-make:', e?.message);
    }

    return newAmendment;
  }

  @Patch('/:projectId/amendments/:amendmentId')
  async updateAmendment(
    @Param('projectId') projectId: string,
    @Param('amendmentId') amendmentId: string,
    @Body() body: {
      action: 'approve-protocol-lead' | 'approve-vp' | 'reject' | 'finalize';
      by?: string;
    },
    @Req() req: any,
  ) {
    let updatedAmendment: any;
    let shouldUnblock = false;

    await this.projects.updateProtocolAtomic(projectId, (protocol) => {
      const amendments: any[] = Array.isArray(protocol.amendments)
        ? protocol.amendments.map((item: any) => ({ ...item }))
        : [];
      const amendment = amendments.find((item: any) => item.id === amendmentId);
      if (!amendment) throw new BadRequestException('Amendment not found');

      amendment.approvals = { ...(amendment.approvals ?? {}) };
      const actedAt = new Date().toISOString();
      const actorName = req.user?.name ?? 'Unknown user';

      if (body.action === 'approve-protocol-lead') {
        amendment.approvals.protocolLead = { approved: true, by: actorName, at: actedAt };
      } else if (body.action === 'approve-vp') {
        amendment.approvals.clinicalAffairsVP = { approved: true, by: actorName, at: actedAt };
      } else if (body.action === 'reject') {
        amendment.status = 'rejected';
      } else {
        amendment.status = 'finalized';
      }

      if (
        body.action !== 'reject' &&
        body.action !== 'finalize' &&
        (amendment.approvals.protocolLead?.approved || amendment.approvals.clinicalAffairsVP?.approved)
      ) {
        amendment.status = 'approved';
        const sections = Array.isArray(protocol.sections)
          ? protocol.sections.map((section: any) => ({ ...section }))
          : [];
        for (const section of sections) {
          if (amendment.affectedProtocolSections?.includes(section.id)) {
            section.amended = true;
            section.amendmentId = amendmentId;
            section.amendmentNumber = amendment.number;
            section.approvalStatus = 'needs-review';
          }
        }
        protocol = { ...protocol, sections };
      }

      shouldUnblock = (amendment.status === 'approved' || amendment.status === 'rejected') &&
        !amendments.some((item: any) => item.id !== amendmentId && item.status === 'draft');
      updatedAmendment = amendment;
      return { ...protocol, amendments };
    }, req.user, () => ({
      type: `amendment.${updatedAmendment.status}`,
      message: `Amendment ${updatedAmendment.number}: ${updatedAmendment.title} ${updatedAmendment.status}`,
      stepId: 'protocol-make',
      entityType: 'amendment',
      entityId: amendmentId,
      entityLabel: updatedAmendment.title,
      metadata: { amendmentId, action: body.action, status: updatedAmendment.status },
    }));

    if (shouldUnblock) {
      try {
        await this.workflow.transition(projectId, 'report-make', { action: 'approve' }, req.user);
      } catch (e: any) {
        console.warn('[amendment] Could not unblock report-make:', e?.message);
      }
    }

    return updatedAmendment;
  }

  @Get('/:projectId/amendments')
  async getAmendments(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    return project?.data?.protocol?.amendments || [];
  }

  private getAffectedReportSections(protocolSectionIds: string[]): string[] {
    const map: Record<string, string[]> = {
      'section-1': ['section-2', 'section-3'], // Protocol Overview → Introduction, Objectives
      'section-2': ['section-2', 'section-3'], // Study Rationale → Introduction, Objectives
      'section-3': ['section-2'],               // Device Description → Introduction
      'section-4': ['section-4', 'section-6'], // Study Design → Clinical Investigation Design, Subject Disposition
      'section-5': ['section-6'],               // Subject Eligibility → Subject Disposition
      'section-6': ['section-4', 'section-7'], // Study Procedures → Clinical Design, Performance Results
      'section-7': ['section-8', 'section-9'], // Safety Monitoring → Safety Analysis, Conclusions
      'section-8': ['section-5', 'section-7'], // Statistical → Statistical Methods, Performance Results
      'section-9': ['section-1'],               // Ethics → Executive Summary
    };

    const affected = new Set<string>();
    protocolSectionIds.forEach(id => {
      (map[id] || []).forEach(r => affected.add(r));
    });
    return Array.from(affected);
  }

  private getDynamicReportSections(
    targetMarkets: string[],
    scope: any,
  ): Array<{ id: string; title: string; number: number }> {
    const baseSections = [
      { id: 'section-1', title: 'Executive Summary', number: 1 },
      { id: 'section-2', title: 'Introduction and Background', number: 2 },
      { id: 'section-3', title: 'Objectives and Endpoints', number: 3 },
      { id: 'section-4', title: 'Clinical Investigation Design', number: 4 },
      { id: 'section-5', title: 'Statistical Methods', number: 5 },
      { id: 'section-6', title: 'Subject Disposition and Baseline', number: 6 },
      { id: 'section-7', title: 'Clinical Performance Results', number: 7 },
      { id: 'section-8', title: 'Safety Analysis', number: 8 },
      { id: 'section-9', title: 'Conclusions and Benefit-Risk Assessment', number: 9 },
    ];

    const dynamicSections: Array<{ id: string; title: string }> = [];
    if (targetMarkets.includes('EU')) {
      dynamicSections.push({
        id: 'section-eu-compliance',
        title: 'Regulatory Compliance Statement (EU MDR 2017/745)',
      });
    }
    if (targetMarkets.includes('FDA') || targetMarkets.includes('US')) {
      dynamicSections.push({
        id: 'section-us-ide',
        title: 'Investigational Device Exemption (IDE) Compliance Summary',
      });
    }

    const numbered = dynamicSections.map((s, i) => ({ ...s, number: 10 + i }));
    const appendicesNumber = 10 + dynamicSections.length;

    return [
      ...baseSections,
      ...numbered,
      { id: 'section-appendices', title: 'Report Appendices', number: appendicesNumber },
    ];
  }

  @Post('/:projectId/generate-report')
  @UseGuards(AiThrottlerGuard)
  async generateReport(@Param('projectId') projectId: string) {
    await this.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project.roles || [];
    const scope = project?.data?.scope || {};
    const protocolSections = project?.data?.protocol?.sections || [];
    const existingReport = project?.data?.report || {};
    const existingSections = existingReport.sections || {};

    // Resolve targetMarkets from multiple sources
    const inferredFromRequirements: string[] = (scope?.requirements || [])
      .filter((r: any) => r.status === 'accepted')
      .map((r: any) => {
        if (r.title.includes('FDA') || r.title.includes('US')) return 'FDA';
        if (r.title.includes('EU') || r.title.includes('MDR')) return 'EU';
        return null;
      })
      .filter(Boolean);
    const uniqueInferred = [...new Set(inferredFromRequirements)] as string[];
    const targetMarkets: string[] =
      project.targetMarkets.length > 0
        ? project.targetMarkets
        : (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

    // Resolve device name from multiple sources
    const deviceName: string =
      projectData?.deviceName ||
      scope?.deviceName ||
      project?.description?.match(/Device:\s*([^|]+)/)?.[1]?.trim() ||
      project?.name ||
      '[Device Name]';

    // Build enriched synopsis context from whichever fields are populated
    const rawSynopsis = project?.data?.synopsis || {};
    const synopsisTextParts = [
      rawSynopsis.synopsisText || rawSynopsis.text || rawSynopsis.content || '',
      rawSynopsis.studyTitle ? 'Study Title: ' + rawSynopsis.studyTitle : '',
      rawSynopsis.studyType ? 'Study Type: ' + rawSynopsis.studyType : '',
      rawSynopsis.primaryEndpoint ? 'Primary Endpoint: ' + rawSynopsis.primaryEndpoint : '',
      rawSynopsis.readinessChecklist
        ? rawSynopsis.readinessChecklist
          .filter((i: any) => i.status === 'complete')
          .map((i: any) => i.label + ': ' + (i.reason || ''))
          .join('\n')
          .slice(0, 1000)
        : '',
    ].filter(Boolean);
    const enrichedSynopsis = {
      ...rawSynopsis,
      synopsisText: synopsisTextParts.join('\n'),
    };

    // Enrich scope with resolved values so AI service picks them up
    const enrichedScope = { ...scope, targetMarkets, deviceName };

    const sectionDefs = this.getDynamicReportSections(targetMarkets, scope);

    // Sanitized immediately: this array feeds both the stored `newSections` below and
    // the HTTP response returned to the caller, and the frontend renders the response
    // directly via dangerouslySetInnerHTML without necessarily re-fetching first — so
    // relying on ProjectsService.update()'s storage-side sanitization alone would leave
    // the immediate response unsanitized.
    const generatedContents: string[] = [];
    for (const s of sectionDefs) {
      const content = await this.ai.generateReportSection(
        s.title, s.number, protocolSections, enrichedSynopsis, enrichedScope, projectData, roles, []
      );
      generatedContents.push(sanitizeSectionHtml(content));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const newSections: Record<string, any> = {};
    sectionDefs.forEach((s, i) => {
      newSections[s.id] = { ...(existingSections[s.id] || {}), content: generatedContents[i].trim() };
    });

    await this.projects.update(
      projectId,
      {
        data: {
          ...project.data,
          report: { ...existingReport, sections: newSections, sectionDefs },
        },
      },
      { name: 'System' },
      [{
        type: 'report.ai.generated',
        message: 'Clinical Investigation Report generated by AI',
        stepId: 'report-make',
        entityType: 'report',
        entityId: projectId,
        entityLabel: 'Clinical Investigation Report',
        metadata: {
          model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
          sectionsGenerated: sectionDefs.length,
          targetMarkets,
          deviceName,
          generatedAt: new Date().toISOString(),
        },
      }],
    );

    return sectionDefs.map((s, i) => ({
      id: s.id,
      title: s.title,
      number: s.number,
      content: generatedContents[i].trim(),
    }));
  }

  @Post('/:projectId/generate-report-section')
  @UseGuards(AiThrottlerGuard)
  async generateReportSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionId: string; sectionTitle: string; sectionNumber: number },
  ) {
    await this.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project.roles || [];
    const scope = project?.data?.scope || {};
    const protocolSections = project?.data?.protocol?.sections || [];
    const existingReport = project?.data?.report || {};
    // report.sections is sometimes persisted as an array rather than an id-keyed
    // object — normalize so the spread below doesn't corrupt it into a hybrid
    // array-plus-extra-key object.
    const rawExistingSections = existingReport.sections || {};
    const existingSections: Record<string, any> = Array.isArray(rawExistingSections)
      ? Object.fromEntries(rawExistingSections.map((s: any) => [s.id, s]))
      : rawExistingSections;

    // Same context resolution as generate-report
    const inferredFromRequirements: string[] = (scope?.requirements || [])
      .filter((r: any) => r.status === 'accepted')
      .map((r: any) => {
        if (r.title.includes('FDA') || r.title.includes('US')) return 'FDA';
        if (r.title.includes('EU') || r.title.includes('MDR')) return 'EU';
        return null;
      })
      .filter(Boolean);
    const uniqueInferred = [...new Set(inferredFromRequirements)] as string[];
    const targetMarkets: string[] =
      project.targetMarkets.length > 0
        ? project.targetMarkets
        : (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

    const deviceName: string =
      projectData?.deviceName ||
      scope?.deviceName ||
      project?.description?.match(/Device:\s*([^|]+)/)?.[1]?.trim() ||
      project?.name ||
      '[Device Name]';

    const rawSynopsis = project?.data?.synopsis || {};
    const synopsisTextParts = [
      rawSynopsis.synopsisText || rawSynopsis.text || rawSynopsis.content || '',
      rawSynopsis.studyTitle ? 'Study Title: ' + rawSynopsis.studyTitle : '',
      rawSynopsis.studyType ? 'Study Type: ' + rawSynopsis.studyType : '',
      rawSynopsis.primaryEndpoint ? 'Primary Endpoint: ' + rawSynopsis.primaryEndpoint : '',
      rawSynopsis.readinessChecklist
        ? rawSynopsis.readinessChecklist
          .filter((i: any) => i.status === 'complete')
          .map((i: any) => i.label + ': ' + (i.reason || ''))
          .join('\n')
          .slice(0, 1000)
        : '',
    ].filter(Boolean);
    const enrichedSynopsis = { ...rawSynopsis, synopsisText: synopsisTextParts.join('\n') };
    const enrichedScope = { ...scope, targetMarkets, deviceName };

    const content = await this.ai.generateReportSection(
      body.sectionTitle,
      body.sectionNumber,
      protocolSections,
      enrichedSynopsis,
      enrichedScope,
      projectData,
      roles,
      [],
    );

    // Sanitized immediately for the same reason as generateReport(): this value is
    // both stored and returned directly in the HTTP response.
    const trimmedContent = sanitizeSectionHtml(content.trim());

    await this.projects.update(
      projectId,
      {
        data: {
          ...project.data,
          report: {
            ...existingReport,
            sections: {
              ...existingSections,
              [body.sectionId]: { ...(existingSections[body.sectionId] || {}), content: trimmedContent },
            },
          },
        },
      },
      { name: 'System' },
      [{
        type: 'report.section.ai.generated',
        message: `Report section "${body.sectionTitle}" generated by AI`,
        stepId: 'report-make',
        entityType: 'report_section',
        entityId: body.sectionId,
        entityLabel: body.sectionTitle,
        metadata: {
          sectionId: body.sectionId,
          sectionTitle: body.sectionTitle,
          model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
          generatedAt: new Date().toISOString(),
        },
      }],
    );

    return { sectionId: body.sectionId, content: trimmedContent };
  }

  @Post('/:projectId/analyze-report-section')
  @UseGuards(AiThrottlerGuard)
  async analyzeReportSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; appendicesList?: string[] },
  ) {
    await this.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const targetMarkets = project.targetMarkets.length > 0 ? project.targetMarkets : ['EU'];
    const deviceCategory = project.deviceCategory || '';
    const intendedUse = project?.data?.scope?.intendedUse || '';

    const protocol = project?.data?.protocol || {};
    const reportSections = project?.data?.report?.sections || {};
    const amendments = protocol.amendments || [];

    // Find approved amendments that affect this report section
    const affectedAmendment = amendments.find((a: any) =>
      a.status === 'approved' &&
      (a.affectedReportSections || []).includes(
        Object.keys(reportSections).find(id =>
          reportSections[id]?.title === body.sectionTitle
        ) || ''
      )
    ) || null;

    const amendmentContext = affectedAmendment ? {
      number: affectedAmendment.number,
      title: affectedAmendment.title,
      reason: affectedAmendment.reason,
      description: affectedAmendment.description,
    } : null;

    const result = await this.ai.analyzeReportSection(body.sectionTitle, body.sectionContent, targetMarkets, deviceCategory, intendedUse, body.appendicesList, amendmentContext);
    return result;
  }

  @Post('/:projectId/check-cross-consistency')
  @UseGuards(AiThrottlerGuard)
  async checkCrossConsistency(
    @Param('projectId') projectId: string,
  ) {
    await this.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const report = project?.data?.report || {};
    const targetMarkets = project.targetMarkets.length > 0 ? project.targetMarkets : ['EU'];
    const deviceCategory = project.deviceCategory || '';

    const protocolSections = (protocol.sections || []).map((s: any) => ({
      title: s.title,
      content: s.content || '',
    })).filter((s: any) => s.content);

    // Report sections are stored keyed by id (e.g. 'section-7') with no title field —
    // map ids to the human-readable titles the AI service's section maps expect.
    const sectionTitleMap: Record<string, string> = {
      'section-1': 'Executive Summary',
      'section-2': 'Introduction and Background',
      'section-3': 'Objectives and Endpoints',
      'section-4': 'Clinical Investigation Design',
      'section-5': 'Statistical Methods',
      'section-6': 'Subject Disposition and Baseline',
      'section-7': 'Clinical Performance Results',
      'section-8': 'Safety Analysis',
      'section-9': 'Conclusions and Benefit-Risk Assessment',
      'section-eu-compliance': 'Regulatory Compliance Statement (EU MDR 2017/745)',
      'section-us-ide': 'Investigational Device Exemption (IDE) Compliance Summary',
      'section-appendices': 'Report Appendices',
    };

    const reportSections = Object.entries(report.sections || {}).map(([id, data]: [string, any]) => ({
      title: sectionTitleMap[id] || data.title || id,
      content: data.content || '',
    })).filter((s: any) => s.content);

    const result = await this.ai.checkCrossConsistency(protocolSections, reportSections, targetMarkets, deviceCategory);

    // Cache the result on the project so the frontend only has to re-run this (AI,
    // non-deterministic wording) check on an explicit user action, not on every page
    // load — otherwise a "Won't fix" dismissal keyed on the finding's text can lapse
    // as soon as the AI rewords the same finding on the next automatic re-check.
    await this.projects.update(projectId, {
      data: { report: { crossConsistencyIssues: result.issues } },
    });

    return result;
  }

  @Post('/:projectId/check-synopsis-consistency')
  @UseGuards(AiThrottlerGuard)
  async checkSynopsisConsistency(
    @Param('projectId') projectId: string,
  ) {
    await this.assertDocumentNotSigned(projectId, 'protocol-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const synopsis = project?.data?.synopsis || {};

    const synopsisText = synopsis.readiness || synopsis.text || synopsis.content ||
      Object.values(synopsis).filter(v => typeof v === 'string').join('\n') || '';

    const protocolSections = (protocol.sections || []).map((s: any) => ({
      title: s.title,
      content: s.content || '',
    })).filter((s: any) => s.content);

    return this.ai.checkSynopsisConsistency(synopsisText, protocolSections);
  }

  @Post('/:projectId/validate-statistics')
  async validateStatistics(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const reportSections = project?.data?.report?.sections || {};
    const targetMarkets = project.targetMarkets.length > 0 ? project.targetMarkets : ['EU'];

    // Find relevant sections
    const findSection = (keywords: string[]) => {
      const entry = Object.entries(reportSections).find(([id, s]: [string, any]) =>
        keywords.some(k => id.includes(k) || s.title?.toLowerCase().includes(k.toLowerCase()))
      );
      return entry ? (entry[1] as any).content || '' : '';
    };

    const statisticalContent = findSection(['section-5', 'statistical']);
    const resultsContent = findSection(['section-7', 'performance', 'clinical-performance']);
    const safetyContent = findSection(['section-8', 'safety']);

    // Run deterministic checks on results sections
    const resultsValidation = this.ai.validateStatisticalValues(resultsContent, 'Clinical Performance Results');
    const safetyValidation = this.ai.validateStatisticalValues(safetyContent, 'Safety Analysis');

    // Run AI cross-check
    const aiCrossCheck = await this.ai.checkStatisticalConsistency(
      statisticalContent,
      resultsContent,
      targetMarkets
    );

    return {
      deterministicIssues: [
        ...resultsValidation.issues.map(i => ({ ...i, section: 'Clinical Performance Results' })),
        ...safetyValidation.issues.map(i => ({ ...i, section: 'Safety Analysis' })),
      ],
      aiCrossCheckIssues: aiCrossCheck.issues,
    };
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

@Post('/:projectId/workflow/force-protocol-draft')
async forceProtocolDraft(@Param('projectId') projectId: string, @Req() req: any) {
  if (process.env.NODE_ENV === 'production' && !req.user?.roles?.includes('admin')) {
    throw new ForbiddenException('This endpoint is only available in development or for admins');
  }

  return this.projects.forceProtocolDraft(projectId, PROTOCOL_SECTION_TITLES, req.user);
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

// ── Deterministic rule-based section checks ──────────────────────────────
// These always run alongside AI analysis so specific regulatory-reference and
// specificity gaps are caught even if the AI misses them.
function getRuleBasedIssues(section: { id: string; title: string; content: string }, targetMarkets: string[], projectData: any): any[] {
  const issues: any[] = [];
  const content = section.content || '';
  const sectionTitle = section.title || '';

  // Rule 1: EU MDR reference missing
  if (targetMarkets?.includes('EU') && !content.includes('MDR') && !content.includes('2017/745')) {
    issues.push({ id: `rule-eu-${section.id}`, severity: 'warning', description: 'EU MDR 2017/745 not referenced in this section', reference: 'EU MDR 2017/745 Annex XV', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 2: FDA reference missing
  if (targetMarkets?.includes('US') && !content.includes('21 CFR') && !content.includes('FDA')) {
    issues.push({ id: `rule-fda-${section.id}`, severity: 'warning', description: 'FDA 21 CFR reference missing in this section', reference: 'FDA 21 CFR Part 812', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 3: ISO 14155 missing
  if (!content.includes('ISO 14155') && !['Protocol Overview'].includes(sectionTitle)) {
    issues.push({ id: `rule-iso-${section.id}`, severity: 'warning', description: 'ISO 14155:2020 not referenced in this section', reference: 'ISO 14155:2020', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 4: Statistical significance missing
  if (sectionTitle.includes('Statistical') && !content.includes('0.05') && !content.includes('significance') && !content.includes('confidence interval')) {
    issues.push({ id: `rule-stats-${section.id}`, severity: 'blocker', description: 'Statistical significance level or confidence interval not specified', reference: 'ISO 14155:2020 §7.4.4', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  return issues;
}

// Each rule's id encodes its topic as `rule-<topic>-<sectionId>`; duplicate detection reuses
// the same keywords the rule itself checks for, so a rule is suppressed only when an AI issue
// already covers that exact regulatory gap.
const RULE_TOPIC_KEYWORDS: Record<string, string[]> = {
  eu: ['mdr', '2017/745'],
  fda: ['fda', '21 cfr'],
  iso: ['iso 14155'],
  stats: ['significance', 'confidence interval', '0.05'],
  appendix: ['appendix', 'attachment'],
};

function isDuplicateOfAiIssue(ruleIssue: any, aiIssues: any[]): boolean {
  const topic = ruleIssue.id.match(/^rule-([a-z]+)-/)?.[1] || '';
  if (topic === 'appendix') {
    const appendixNumber = ruleIssue.id.match(/^rule-appendix-(\d+)-/)?.[1];
    return appendixNumber
      ? aiIssues.some((ai: any) => `${ai.description || ''} ${ai.reference || ''}`.toLowerCase().includes(`appendix ${appendixNumber}`))
      : false;
  }
  const keywords = RULE_TOPIC_KEYWORDS[topic] || [];
  return aiIssues.some((ai: any) => {
    const text = `${ai.description || ''} ${ai.reference || ''}`.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
}

function mergeIssues(aiIssues: any[], ruleIssues: any[]): any[] {
  const newRuleIssues = ruleIssues.filter((r) => !isDuplicateOfAiIssue(r, aiIssues));
  return [...aiIssues, ...newRuleIssues];
}
