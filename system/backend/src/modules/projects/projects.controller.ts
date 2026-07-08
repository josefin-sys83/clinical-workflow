import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, InternalServerErrorException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { CreateProjectDto, UpdateProjectDto, UpdateSectionContentDto } from './dto';
import { ProjectsService } from './projects.service';
import { AiService, PROTOCOL_SECTION_TITLES } from '../ai/ai.service';
import { GenerationProgressService } from '../ai/generation-progress.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowService } from '../workflow/workflow.service';
import { MilestoneService } from '../milestones/milestone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { SYNOPSIS_UPLOAD_OPTIONS, getSafeDownloadHeaders } from '../../common/upload-security';

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
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@ApiTags('projects')
@Controller('/api/projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
    private readonly workflow: WorkflowService,
    private readonly milestones: MilestoneService,
    private readonly generationProgress: GenerationProgressService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.projects.list(req.user?.companyId, req.user?.isSuperadmin);
  }

  @Get('/completed')
  listCompleted(@Req() req: any) {
    return this.projects.listCompleted(req.user?.companyId, req.user?.isSuperadmin);
  }

  @Get('/:projectId/report-sections')
  async getReportSections(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const scope = project?.data?.scope || {};
    const projectData = project?.data?.projectData || {};

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
      scope?.targetMarkets ||
      projectData?.targetMarkets ||
      (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

    const sections = this.getDynamicReportSections(targetMarkets, scope);
    return {
      sections,
      targetMarkets,
      deviceCategory: scope?.deviceCategory || '',
      studyType: project?.data?.synopsis?.studyType || '',
    };
  }

  @Get('/:projectId')
  get(@Param('projectId') projectId: string) { return this.projects.get(projectId); }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    // Plan-limit enforcement and last-active touch happen inside projects.create()
    // itself now, under the same locked transaction as the insert — see
    // AdminService.enforceProjectLimit() for why that's required to close the race.
    const companyId: string | undefined = req.user?.companyId;
    return this.projects.create(dto, companyId);
  }

  @Patch('/:projectId')
  async update(@Param('projectId') projectId: string, @Body() body: UpdateProjectDto, @Req() req: any) {
    const existing = await this.projects.get(projectId);

    // Role assignments decide who can later sign this project's protocol/report (see
    // createSignature()'s claimedRole check) and, via ProjectsService.syncProjectMembers(),
    // who shows up as a real project member — this endpoint's otherwise-arbitrary `data`
    // blob merge is not an appropriate place for any project-scoped user to grant
    // themselves (or anyone) a role. This product's role model only has two system roles
    // (admin/author, see AdminService/SettingsService) with no separate "project manager"
    // system role to delegate to instead, so admin is the natural boundary. Only blocks
    // when roles actually differ from what's stored — same pattern as the scope-lock check
    // below — so callers that round-trip the full data blob without touching roles aren't affected.
    const rolesChanged = body.data?.roles !== undefined &&
      JSON.stringify(body.data.roles) !== JSON.stringify(existing?.data?.roles);
    if (rolesChanged && !req.user?.roles?.includes('admin')) {
      throw new ForbiddenException('Only a company admin can change project role assignments');
    }

    // Check if scope is locked (protocol has been finalized). Callers that save
    // unrelated data (e.g. report section state) commonly round-trip the full
    // project `data` blob, so `scope` is present but unchanged — only block when
    // the incoming scope actually differs from what's stored, not merely present.
    const scopeChanged = body.data?.scope !== undefined &&
      JSON.stringify(body.data.scope) !== JSON.stringify(existing?.data?.scope);
    if (scopeChanged) {
      const workflowSteps = await this.workflow.getSnapshot(projectId);
      const protocolFinal = workflowSteps?.steps?.['protocol-pdf']?.state === 'final';
      if (protocolFinal) {
        return { error: 'Scope is locked after protocol finalization', locked: true };
      }
    }
    const result = await this.projects.update(projectId, body);
    if (body.data?.roles) {
      await this.projects.syncProjectMembers(projectId, body.data.roles);
      const oldRoles: any[] = existing?.data?.roles || [];
      const changes: string[] = [];
      for (const newRole of body.data.roles) {
        const oldRole = oldRoles.find((r: any) => r.title === newRole.title);
        const oldPeople = (oldRole?.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
        const newPeople = (newRole.assignedTo || []).map((p: any) => p.name + ' (' + p.email + ')').join(', ') || 'unassigned';
        if (oldPeople !== newPeople) {
          changes.push(newRole.title + ': ' + oldPeople + ' -> ' + newPeople);
        }
      }
      if (changes.length > 0) {
        await this.audit.create(projectId, {
          type: 'project.roles.updated',
          message: 'Project roles updated',
          stepId: 'project-setup',
          actorUserId: 'unknown',
          metadataJson: JSON.stringify({ roles: changes.join(' | ') })
        });
      }
    }
    if (body.name) {
      await this.audit.create(projectId, {
        type: 'project.setup.completed',
        message: 'Project setup completed: ' + body.name,
        stepId: 'project-setup',
        actorUserId: 'unknown',
        metadataJson: JSON.stringify({ projectName: body.name, description: body.description })
      });
    }

    // This endpoint accepts an arbitrary `data` blob, so a caller can silently overwrite
    // or delete any nested field (e.g. clearing protocol.amendments) without it ever
    // showing up in the audit trail — the blocks above only cover `roles` and `name`
    // specifically. Log one diff-summary entry per call covering every top-level `data`
    // key that actually changed, so the audit trail reflects every write through this
    // endpoint, not just the ones a dedicated code path happened to call out.
    if (body.data) {
      const changedKeys: string[] = [];
      const summaries: string[] = [];
      const changes: Record<string, { before: any; after: any }> = {};
      for (const key of Object.keys(body.data)) {
        const before = existing?.data?.[key];
        const after = result?.data?.[key];
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          changedKeys.push(key);
          summaries.push(summarizeFieldChange(key, before, after));
          changes[key] = { before, after };
        }
      }
      if (changedKeys.length > 0) {
        await this.audit.create(projectId, {
          type: 'project.data.updated',
          message: `Project data updated: ${summaries.join('; ')}`,
          stepId: 'project-setup',
          actorUserId: 'unknown',
          metadataJson: JSON.stringify({ changedKeys, changes }),
        });
      }
    }

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
    const projectRoles: any[] = project?.data?.roles || [];
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
    const { signatures: allSignatures } = await this.projects.updateSignaturesAtomic(projectId, (existing) => {
      const filtered = existing.filter((s: any) => s.role !== body.role);
      return [...filtered, sigRecord];
    });

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
            actorUserId: identity.id,
          } as any);
        }
      }
    }

    // Regulatory audit record — full metadata for tamper-evident trail
    await this.audit.create(projectId, {
      type: 'protocol.signed',
      message: `Protocol electronically signed by ${identity.name} (${body.roleTitle})`,
      stepId: 'protocol-pdf',
      actorUserId: identity.id,
      metadataJson: JSON.stringify({
        signatureId: id,
        signerName: identity.name,
        signerEmail: identity.email,
        signerUserId: identity.id,
        role: body.role,
        roleTitle: body.roleTitle,
        documentHash: body.documentHash,
        signedAt,
        ipAddress,
      }),
    });

    return sigRecord;
  }

  @Patch('/:projectId/protocol/sections/:sectionId')
  async updateSection(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateSectionContentDto,
  ) {
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol;
    if (!protocol) return null;
    const now = new Date().toISOString();
    const section = protocol.sections.find((s: any) => s.id === sectionId);
    // Section content is rendered client-side via dangerouslySetInnerHTML, so it must
    // never be stored as raw, attacker-controlled HTML — sanitize on the way in rather
    // than trusting the frontend to sanitize on the way out.
    const sanitizedContent = sanitizeSectionHtml(body.content);
    // Spread DB section first (preserves all fields), then apply content update.
    // If the caller explicitly sends approval fields, apply those too so that saving
    // content can never silently clear an already-approved status.
    const approvalOverrides: Record<string, any> = {};
    if (body.approvalStatus !== undefined) approvalOverrides.approvalStatus = body.approvalStatus;
    if (body.approvedBy !== undefined) approvalOverrides.approvedBy = body.approvedBy;
    if (body.approvedAt !== undefined) approvalOverrides.approvedAt = body.approvedAt;
    const sections = protocol.sections.map((s: any) =>
      s.id === sectionId ? { ...s, ...approvalOverrides, content: sanitizedContent, updatedAt: now } : s
    );
    await this.projects.update(projectId, {
      data: { ...project.data, protocol: { ...protocol, sections } }
    });

    // Detect structural additions/removals for summary annotation
    const prevContent = body.previousContent || '';
    const newContent = sanitizedContent;
    const hasTable = (s: string) => /^\|.+\|/m.test(s);
    const hasImage = (s: string) => /!\[.*?\]\(.*?\)/.test(s);
    const structuralNotes: string[] = [];
    if (!hasTable(prevContent) && hasTable(newContent))  structuralNotes.push('Table added');
    if (hasTable(prevContent)  && !hasTable(newContent)) structuralNotes.push('Table removed');
    if (!hasImage(prevContent) && hasImage(newContent))  structuralNotes.push('Image added');
    if (hasImage(prevContent)  && !hasImage(newContent)) structuralNotes.push('Image removed');
    const messageSuffix = structuralNotes.length > 0 ? ` (${structuralNotes.join(', ')})` : '';

    // Log audit event
    await this.audit.create(projectId, {
      type: 'section.content.updated',
      message: `Section "${section?.title || sectionId}" content updated${messageSuffix}`,
      stepId: 'protocol-make',
      actorUserId: body.userId || 'unknown',
      metadataJson: JSON.stringify({ sectionId, sectionTitle: section?.title, updatedAt: now, editedBy: body.userName || 'Unknown user', reason: body.reason || '', previousContent: prevContent, newContent })
    });

    return { ok: true, updatedAt: now };
  }

  @Post('/:projectId/synopsis-file')
  @UseInterceptors(FileInterceptor('file', SYNOPSIS_UPLOAD_OPTIONS))
  async uploadSynopsisFile(@Param('projectId') projectId: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.projects.saveSynopsisFile(projectId, file.originalname, file.buffer, file.mimetype ?? 'application/octet-stream');
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
    const targetMarkets = existing?.data?.projectData?.targetMarkets || existing?.data?.scope?.targetMarkets || [];

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
  async generateProtocol(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project?.data?.roles || [];
    const scope = project?.data?.scope || {};
    const synopsisData = project?.data?.synopsis || {};
    const synopsisText = synopsisData.extractedText ||
      (synopsisData.readinessChecklist?.map((i: any) => i.reason).filter(Boolean).join(' ') ?? '');
    const targetMarkets = projectData?.targetMarkets || ['EU'];
    const deviceCategory = scope?.deviceCategory || '';
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
      await this.audit.create(projectId, {
        type: 'protocol.generation_failed',
        message: `Protocol generation failed: ${message}`,
        stepId: 'protocol-make',
        actorUserId: 'system',
        metadataJson: JSON.stringify({ error: message, failedAt: new Date().toISOString() })
      });
      throw new InternalServerErrorException('Protocol generation failed. Please try again or contact support if the problem persists.');
    } finally {
      this.generationProgress.clear(progressKey);
    }
    if (!protocol) return null;

    // AI-generated section content is returned directly to the caller here and is
    // later persisted verbatim via updateSection()/PATCH — sanitize at the source so
    // a prompt-injected or hallucinated HTML response can't reach dangerouslySetInnerHTML.
    protocol.sections = (protocol.sections || []).map((s: any) =>
      s && typeof s.content === 'string' ? { ...s, content: sanitizeSectionHtml(s.content) } : s
    );

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

    // Log audit event
    await this.audit.create(projectId, {
      type: 'protocol.generated',
      message: 'Protocol generated by AI',
      stepId: 'protocol-make',
      actorUserId: 'system',
      metadataJson: JSON.stringify({ sections: protocol.sections.length, generatedAt: new Date().toISOString() })
    });

    return protocol;
  }

  @Post('/:projectId/analyze-section')
  @UseGuards(AiThrottlerGuard)
  async analyzeSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; sectionId?: string; requiredElements?: any[] }
  ) {
    const project = await this.projects.get(projectId);
    return this.runSectionAnalysis(project, body.sectionTitle, body.sectionContent, body.sectionId, body.requiredElements);
  }

  @Post('/:projectId/analyze-sections')
  @UseGuards(AiThrottlerGuard)
  async analyzeSections(
    @Param('projectId') projectId: string,
    @Body() body: { sectionIds?: string[] } = {},
  ) {
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
    const targetMarkets = project?.data?.projectData?.targetMarkets || ['EU'];
    const deviceCategory = project?.data?.scope?.deviceCategory || '';
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

    const result = await this.ai.analyzeSection(sectionTitle, sectionContent, targetMarkets, deviceCategory, intendedUse, requiredElements, amendmentContext, crossSectionContext, acceptedRequirements, synopsisExcerpt);

    // A failed AI call/parse is a distinct, explicit error state — return it
    // untouched so the caller can tell "analysis failed" apart from "analysis
    // succeeded and found nothing." Never merge partial/rule-based data into it.
    if (result?.error) return result;

    // Deterministic rule-based checks always run alongside the AI analysis, so
    // regulatory-reference and specificity gaps are caught even if the AI misses them.
    const ruleIssues = getRuleBasedIssues(
      { id: sectionId || section?.id || sectionTitle, title: sectionTitle, content: sectionContent },
      targetMarkets,
      project?.data?.projectData || {},
    );
    result.issues = mergeIssues(result.issues || [], ruleIssues);
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
      createdBy: string;
    }
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
        createdBy: body.createdBy,
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
    });

    await this.audit.create(projectId, {
      type: 'amendment.created',
      message: `Amendment ${newAmendment.number}: ${body.title}`,
      stepId: 'protocol-make',
      actorUserId: body.createdBy,
      metadataJson: JSON.stringify({ amendmentId: newAmendment.id, reason: body.reason, affectedProtocolSections: body.affectedProtocolSections })
    });

    // Block report-make while the amendment is pending approval
    try {
      await this.workflow.transition(projectId, 'report-make', { action: 'request_changes', reason: `Amendment ${newAmendment.number} pending approval` });
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
    }
  ) {
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const amendments: any[] = protocol.amendments || [];

    const amendment = amendments.find((a: any) => a.id === amendmentId);
    if (!amendment) return { error: 'Amendment not found' };

    if (!amendment.approvals) amendment.approvals = {};

    if (body.action === 'approve-protocol-lead') {
      amendment.approvals.protocolLead = { approved: true, by: body.by, at: new Date().toISOString() };
    } else if (body.action === 'approve-vp') {
      amendment.approvals.clinicalAffairsVP = { approved: true, by: body.by, at: new Date().toISOString() };
    } else if (body.action === 'reject') {
      amendment.status = 'rejected';
    } else if (body.action === 'finalize') {
      amendment.status = 'finalized';
      await this.audit.create(projectId, {
        type: 'amendment.finalized',
        message: `Amendment ${amendment.number}: ${amendment.title} finalized`,
        stepId: 'protocol-make',
        actorUserId: body.by || 'system',
        metadataJson: JSON.stringify({ amendmentId: amendment.id }),
      });
      await this.projects.update(projectId, {
        data: { ...project.data, protocol: { ...protocol, amendments, sections: protocol.sections } }
      });
      return amendment;
    }

    // Check if fully approved
    const protocolLeadApproved = !!amendment.approvals.protocolLead?.approved;
    const vpApproved = !!amendment.approvals.clinicalAffairsVP?.approved;

    if ((protocolLeadApproved || vpApproved) && amendment.status !== 'rejected') {
      amendment.status = 'approved';

      // Mark affected protocol sections as amended
      const sections = protocol.sections || [];
      sections.forEach((s: any) => {
        if (amendment.affectedProtocolSections.includes(s.id)) {
          s.amended = true;
          s.amendmentId = amendmentId;
          s.amendmentNumber = amendment.number;
          s.approvalStatus = 'needs-review';
        }
      });

      // Unblock report-make only if no other amendment is still pending
      const stillPendingAmendments = amendments.filter((a: any) =>
        a.id !== amendmentId && a.status === 'draft'
      );
      const shouldUnblock = stillPendingAmendments.length === 0;
      if (shouldUnblock) {
        try {
          await this.workflow.transition(projectId, 'report-make', { action: 'approve' });
        } catch (e: any) {
          console.warn('[amendment] Could not unblock report-make:', e?.message);
        }
      }

      await this.audit.create(projectId, {
        type: 'amendment.approved',
        message: `Amendment ${amendment.number}: ${amendment.title} fully approved`,
        stepId: 'protocol-make',
        actorUserId: body.by,
        metadataJson: JSON.stringify({ amendmentId: amendment.id })
      });
    }

    if (body.action === 'reject') {
      // Unblock report-make on rejection too, only if no other amendment is still pending
      const stillPendingAmendments = amendments.filter((a: any) =>
        a.id !== amendmentId && a.status === 'draft'
      );
      const shouldUnblock = stillPendingAmendments.length === 0;
      if (shouldUnblock) {
        try {
          await this.workflow.transition(projectId, 'report-make', { action: 'approve' });
        } catch (e: any) {
          console.warn('[amendment] Could not unblock report-make:', e?.message);
        }
      }

      await this.audit.create(projectId, {
        type: 'amendment.rejected',
        message: `Amendment ${amendment.number}: ${amendment.title} rejected`,
        stepId: 'protocol-make',
        actorUserId: body.by,
        metadataJson: JSON.stringify({ amendmentId: amendment.id })
      });
    }

    await this.projects.update(projectId, {
      data: {
        ...project.data,
        protocol: { ...protocol, amendments, sections: protocol.sections }
      }
    });

    return amendment;
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
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project?.data?.roles || [];
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
      scope?.targetMarkets ||
      projectData?.targetMarkets ||
      (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

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

    await this.projects.update(projectId, {
      data: {
        ...project.data,
        report: { ...existingReport, sections: newSections, sectionDefs },
      },
    });

    await this.audit.create(projectId, {
      type: 'report.ai.generated',
      message: 'Clinical Investigation Report generated by AI',
      stepId: 'report-make',
      actorUserId: 'system',
      metadataJson: JSON.stringify({
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
        sectionsGenerated: sectionDefs.length,
        targetMarkets,
        deviceName,
        generatedAt: new Date().toISOString(),
      }),
    });

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
    const project = await this.projects.get(projectId);
    const projectData = project?.data?.projectData || {};
    const roles = project?.data?.roles || [];
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
      scope?.targetMarkets ||
      projectData?.targetMarkets ||
      (uniqueInferred.length > 0 ? uniqueInferred : ['EU']);

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

    await this.projects.update(projectId, {
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
    });

    await this.audit.create(projectId, {
      type: 'report.section.ai.generated',
      message: `Report section "${body.sectionTitle}" generated by AI`,
      stepId: 'report-make',
      actorUserId: 'system',
      metadataJson: JSON.stringify({
        sectionId: body.sectionId,
        sectionTitle: body.sectionTitle,
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
        generatedAt: new Date().toISOString(),
      }),
    });

    return { sectionId: body.sectionId, content: trimmedContent };
  }

  @Post('/:projectId/analyze-report-section')
  @UseGuards(AiThrottlerGuard)
  async analyzeReportSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; appendicesList?: string[] },
  ) {
    const project = await this.projects.get(projectId);
    const targetMarkets = project?.data?.projectData?.targetMarkets || project?.data?.scope?.targetMarkets || ['EU'];
    const deviceCategory = project?.data?.scope?.deviceCategory || '';
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
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const report = project?.data?.report || {};
    const targetMarkets = project?.data?.projectData?.targetMarkets || ['EU'];
    const deviceCategory = project?.data?.scope?.deviceCategory || '';

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
    const targetMarkets = project?.data?.projectData?.targetMarkets || ['EU'];

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
}

// Produces a short, human-readable note for one changed top-level `data` key. Nested
// array fields (e.g. data.protocol.amendments) are the common shape for the kind of
// silent, hard-to-notice change this audit entry exists to catch, so a length change one
// level down is called out specifically instead of just "protocol changed".
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
};

function isDuplicateOfAiIssue(ruleIssue: any, aiIssues: any[]): boolean {
  const topic = ruleIssue.id.match(/^rule-([a-z]+)-/)?.[1] || '';
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