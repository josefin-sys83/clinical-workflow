import { Delete, UseFilters, UseInterceptors, UploadedFile, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards, BadRequestException, HttpException, InternalServerErrorException, ForbiddenException, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from '../projects/projects.service';
import { DocumentWorkflowService } from '../projects/document-workflow.service';
import { AiService, PROTOCOL_SECTION_TITLES } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { requireGeneratedText } from '../../common/require-generated-text';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';
import { logAnalyzeSectionRequest } from '../../common/analysis-request-logger';
import { randomUUID } from 'crypto';
import { ProtocolsService } from './protocols.service';
import { UpdateSectionContentDto, UploadProtocolAttachmentDto, UpdateAttachmentRequirementsDto, FindingDecisionDto } from './dto';
import { GenerationProgressService } from '../ai/generation-progress.service';
import { WorkflowService } from '../workflow/workflow.service';
import { getMissingProtocolAttachmentIssues } from './protocol-attachment-reference';
import { getRuleBasedIssues, mergeIssues } from './protocol-analysis-rules';

import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { PROTOCOL_UPLOAD_OPTIONS } from '../../common/upload-security';
import { ProtocolUploadSizeExceptionFilter } from './protocol-upload-size.filter';
import { ProtocolAttachmentsService } from './protocol-attachments.service';
import { ProtocolFindingDocumentsService } from './protocol-finding-documents.service';
import { buildGenerationMetadataLog, buildProtocolGenerationContext, sourceSynopsisText } from '../projects/project-generation-context';
import { acceptedFindingRequirements, validateFindingRequirements } from '../projects/finding-requirements';
import { ConflictException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { sectionAnalysisHistory } from './protocol-analysis-history';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@ApiTags('protocols')
@Controller('/api/projects')
export class ProtocolsController {
  private readonly logger = new Logger(ProtocolsController.name);

  private assertRegeneratable(protocol: any) {
    const sections = protocol?.sections || [];
    if ((protocol?.amendments || []).length ||
        (protocol?.status && protocol.status !== 'draft') ||
        sections.some((s: any) => s.locked || s.approvedAt || s.approvedBy || s.amended ||
          (s.approvalStatus && s.approvalStatus !== 'draft') ||
          ['approved', 'signed', 'final', 'in_review', 'ready_for_review'].includes(s.status))) {
      throw new ConflictException('Full regeneration requires an unapproved draft without amendments. Existing review records cannot be replaced.');
    }
  }

  constructor(
    private readonly projects: ProjectsService,
    private readonly protocols: ProtocolsService,
    private readonly ai: AiService,
    private readonly workflow: WorkflowService,
    private readonly generationProgress: GenerationProgressService,
    private readonly documentWorkflow: DocumentWorkflowService,
    private readonly attachments: ProtocolAttachmentsService,
    private readonly findingDocuments?: ProtocolFindingDocumentsService,
  ) {}

  @Patch('/:projectId/protocol/sections/:sectionId')
  async updateSection(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateSectionContentDto,
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertProtocolEditable(projectId, sectionId);
    return this.protocols.updateSection(
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

  @Post('/:projectId/protocol/sections/:sectionId/comments')
  async addComment(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { content?: string; type?: string; parentCommentKey?: string },
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertProtocolEditable(projectId, sectionId);
    return this.protocols.addComment(projectId, sectionId, body, req.user);
  }

  @Post('/:projectId/protocol/sections/:sectionId/risk-acceptances')
  async acceptRisk(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { description?: string; reason?: string },
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertProtocolEditable(projectId, sectionId);
    return this.protocols.acceptRisk(projectId, sectionId, body, req.user);
  }

  @Delete('/:projectId/protocol/sections/:sectionId/risk-acceptances/:acceptanceId')
  async revokeRiskAcceptance(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Param('acceptanceId', ParseUUIDPipe) acceptanceId: string,
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertProtocolEditable(projectId, sectionId);
    return this.protocols.revokeRiskAcceptance(projectId, sectionId, acceptanceId, req.user);
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
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'protocol-pdf');
    await this.documentWorkflow.assertProtocolPrerequisites(projectId);
    const project = await this.projects.get(projectId);
    const originalProtocol = project?.data?.protocol || {};
    this.assertRegeneratable(originalProtocol);
    const { aiProjectData, scope, intendedUse } = buildProtocolGenerationContext(project);
    const roles = project.roles || [];
    const synopsisText = sourceSynopsisText(project?.data?.synopsis);
    const targetMarkets = aiProjectData.targetMarkets;
    const deviceCategory = aiProjectData.deviceCategory;

    const progressKey = `protocol:${projectId}`;
    let protocol: any;
    try {
      this.generationProgress.start(progressKey, PROTOCOL_SECTION_TITLES.length);
      this.logger.log(buildGenerationMetadataLog(
        'protocol', projectId, aiProjectData, scope, roles,
      ));
      protocol = await this.ai.generateProtocol(
        aiProjectData, roles, synopsisText, scope,
        (title) => this.generationProgress.increment(progressKey, title),
        projectId,
      );
    } catch (err) {
      // Audit the failure and preserve upstream status codes with a safe client message.
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
      const clientMessage = 'Protocol generation failed. Please try again or contact support if the problem persists.';
      if (err instanceof HttpException) throw new HttpException(clientMessage, err.getStatus());
      throw new InternalServerErrorException(clientMessage);
    } finally {
      this.generationProgress.clear(progressKey);
    }
    if (!Array.isArray(protocol?.sections) || protocol.sections.length !== PROTOCOL_SECTION_TITLES.length) {
      throw new InternalServerErrorException('AI returned an incomplete protocol. Please retry generation.');
    }

    // Sanitize AI-generated section content before the relational save so a
    // prompt-injected or hallucinated HTML response cannot reach rendered content.
    protocol.sections = (protocol.sections || []).map((s: any) =>
      ({ ...s, content: requireGeneratedText(s?.content, s?.title || 'Protocol section') })
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
            intendedUse,
            projectId,
          );
          section.requiredElements = elements;
        })
      );
    }

    // Store generation and its audit event atomically. The response is now a view of
    // committed relational rows rather than an unsaved browser-only protocol.
    const savedProtocol = await this.protocols.updateAtomic(
      projectId,
      current => {
        this.assertRegeneratable(current);
        if (!isDeepStrictEqual(current, originalProtocol)) {
          throw new ConflictException('The protocol changed during generation. Reload it before regenerating. Your saved changes were preserved.');
        }
        const previousSections = current.sections || [];
        if (previousSections.some((old: any) => !protocol.sections.some((s: any) => s.id === old.id))) {
          throw new ConflictException('Regeneration would remove existing sections. Your saved protocol was preserved.');
        }
        return {
          ...current,
          ...protocol,
          protocolId: current.protocolId || protocol.protocolId,
          amendments: current.amendments || [],
          sections: protocol.sections.map((s: any) => ({
            ...previousSections.find((old: any) => old.id === s.id),
            ...s,
            comments: previousSections.find((old: any) => old.id === s.id)?.comments || [],
            aiGenerated: true,
            updatedAt: new Date().toISOString(),
            issues: [],
            analysisStatus: 'not-run',
            analysisError: null,
            analysisRequestId: null,
          })),
        };
      },
      req.user,
      {
        type: 'protocol.generated',
        message: 'Protocol generated by AI',
        stepId: 'protocol-make',
        entityType: 'protocol',
        entityId: projectId,
        entityLabel: 'Protocol',
        metadata: { sections: protocol.sections.length, generatedAt: new Date().toISOString() },
      },
    );

    return savedProtocol ?? protocol;
  }

  @Post('/:projectId/analyze-section')
  @UseGuards(AiThrottlerGuard)
  async analyzeSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionTitle: string; sectionContent: string; sectionId?: string; requiredElements?: any[] },
    @Req() req?: any,
  ) {
    await this.documentWorkflow.assertProtocolEditable(projectId, body.sectionId);
    const project = await this.projects.get(projectId);
    if (!body.sectionId) throw new BadRequestException('sectionId is required');
    const { section, requestId } = await this.protocols.beginSectionAnalysis(projectId, body.sectionId, body.sectionContent, req?.user);
    try {
      const result = await this.runSectionAnalysis(project, section.title, section.content, section.id, section.requiredElements, section);
      if (!Array.isArray(result?.issues)) throw new InternalServerErrorException('AI returned invalid section analysis');
      const saved = await this.protocols.finishSectionAnalysis(projectId, section.id, requestId, result, null, req?.user, section.issues || []);
      return {
        ...result,
        issues: saved?.issues || result.issues,
        requiredElements: saved?.requiredElements || result.requiredElements,
        satisfiedRequirements: saved?.satisfiedRequirements || result.satisfiedRequirements || [],
      };
    } catch (error) {
      await this.protocols.finishSectionAnalysis(projectId, section.id, requestId, null,
        error instanceof Error ? error.message : 'Section analysis failed', req?.user);
      throw error;
    }
  }

  @Post('/:projectId/analyze-sections')
  @UseGuards(AiThrottlerGuard)
  async analyzeSections(
    @Param('projectId') projectId: string,
    @Body() body: { sectionIds?: string[] } = {},
    @Req() req?: any,
  ) {
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'protocol-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const sections = (protocol.sections || []).filter((s: any) =>
      s.content && (!body.sectionIds || body.sectionIds.includes(s.id))
    );

    // Batches of 3 (same pattern as generateProtocol) keep concurrent Azure OpenAI
    // requests low enough to avoid tripping per-minute rate limits.
    const results = await this.ai.mapInBatches(sections, 3, async (section: any) => {
      const result = await this.analyzeSection(projectId, {
        sectionId: section.id, sectionTitle: section.title, sectionContent: section.content,
        requiredElements: section.requiredElements,
      }, req);
      return { sectionId: section.id, ...result };
    });

    return { results };
  }

  private async runSectionAnalysis(project: any, sectionTitle: string, sectionContent: string, sectionId: string | undefined, requiredElements: any[] | undefined, savedSection?: any) {
    const { aiProjectData, intendedUse } = buildProtocolGenerationContext(project);
    const targetMarkets = aiProjectData.targetMarkets;
    const deviceCategory = aiProjectData.deviceCategory;

    const protocol = project?.data?.protocol || {};
    const section = savedSection || (protocol.sections || []).find((s: any) => s.id === sectionId || (!sectionId && s.title === sectionTitle));
    const amendment = section?.amended && section?.amendmentId
      ? (protocol.amendments || []).find((a: any) => a.id === section.amendmentId) || null
      : null;
    const amendmentContext = amendment ? {
      number: amendment.number, title: amendment.title, reason: amendment.reason, description: amendment.description,
    } : null;
    const requiredElementInputs = requiredElements?.map(({ id, name, reference }) => ({ id, name, reference }));

    const crossSectionContext = (protocol.sections || [])
      .filter((s: any) => s.title !== sectionTitle && s.content)
      .map((s: any) => ({ title: s.title, content: s.content }));

    const requirements = project?.data?.scope?.requirements;
    const accepted = acceptedFindingRequirements(requirements);
    const { previousDecisions, linkedIssues } = sectionAnalysisHistory(section, requirements);
    const excludedRequirements = new Set((section?.issues || [])
      .filter((issue: any) => issue.documentLink && issue.requirementId)
      .map((issue: any) => issue.requirementId));
    const filterLinkedRequirements = (issues: any[]) => issues.filter(issue => !excludedRequirements.has(issue.requirementId));
    const acceptedRequirements = accepted.map(({ title, description }) => ({ name: title, description }));

    const protocolAttachments = await this.attachments.supportingDocuments(project.id, requirements, true);
    // One API attachment links to one requirement; keep internal IDs and extraction metadata local.
    const aiAttachments = protocolAttachments.flatMap(attachment =>
      attachment.extractedText?.trim() ? attachment.requirements.map(requirement => ({
        name: attachment.label, content: attachment.extractedText, requirement: requirement.title,
      })) : []);
    const attachmentMetadata = protocolAttachments.map((attachment) => ({
      id: attachment.id,
      label: attachment.label,
      appendixNumber: attachment.appendixNumber,
      filename: attachment.filename,
      description: attachment.description,
      requirementIds: attachment.requirementIds,
      requirements: attachment.requirements,
      extractionError: attachment.extractionError,
    }));
    const attachmentIssues = getMissingProtocolAttachmentIssues(
      { id: sectionId || section?.id || sectionTitle, title: sectionTitle, content: sectionContent },
      protocolAttachments.map((attachment) => attachment.appendixNumber),
    );

    const ruleIssues = getRuleBasedIssues(
      { id: sectionId || section?.id || sectionTitle, title: sectionTitle, content: sectionContent },
      targetMarkets,
      project?.data?.projectData || {},
      requirements,
      protocolAttachments,
    );

    await logAnalyzeSectionRequest({
      projectId: project.id,
      sectionId,
      aiRequestSent: attachmentIssues.length === 0,
      endpoint: '/v1/ai/analyze-section',
      request: {
        projectId: project.id,
        sectionTitle,
        sectionContent,
        targetMarkets,
        deviceCategory,
        intendedUse,
        requiredElements: requiredElementInputs,
        amendmentContext,
        crossSectionContext,
        acceptedRequirements,
        protocolAttachments: aiAttachments,
        previousDecisions,
        linkedIssues,
      },
      // Keep a metadata summary alongside the complete AI request payload.
      protocolAttachments: attachmentMetadata,
    });

    // This integrity check does not need AI. Return known-broken references
    // immediately, which also keeps this acceptance path usable before the AI
    // integration is configured. Once fixed, the normal AI review runs below.
    if (attachmentIssues.length > 0) {
      return {
        issues: filterLinkedRequirements(validateFindingRequirements(mergeIssues(ruleIssues, attachmentIssues), requirements)),
        requiredElements: requiredElements || [],
        satisfiedRequirements: [],
        analysisSource: 'deterministic',
      };
    }

    this.logger.log(JSON.stringify({
      event: 'ai.protocol.section_analysis.documents',
      projectId: project.id,
      sectionId,
      sectionTitle,
      protocolAttachments: attachmentMetadata,
    }));

    const result = await this.ai.analyzeSection(sectionTitle, sectionContent, targetMarkets, deviceCategory, intendedUse, requiredElementInputs, amendmentContext, crossSectionContext, acceptedRequirements, aiAttachments, project.id, previousDecisions, linkedIssues);

    if (result?.error) return result;

    // AI returns the exact requirement name. Link only a unique accepted name;
    // source remains human-readable finding context.
    const aiIssues = (result.issues || []).map((issue: any) => {
      if (issue.requirementId !== undefined) return issue;
      const matches = accepted.filter(requirement => issue.requirement && issue.requirement === requirement.title);
      return { ...issue, requirementId: matches.length === 1 ? matches[0].id : null };
    });
    // Deterministic rule-based checks always run alongside the AI analysis, so
    // regulatory-reference and specificity gaps are caught even if the AI misses them.
    result.issues = filterLinkedRequirements(validateFindingRequirements(mergeIssues(
      mergeIssues(validateFindingRequirements(aiIssues, requirements, 'ai'), ruleIssues),
      attachmentIssues,
    ), requirements));
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
    await this.protocols.updateAtomic(projectId, (protocol) => {
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
    if (body.action === 'finalize') {
      const signatures = await this.projects.get(projectId).then((project) => project.signatures || []);
      const hasLeadSignature = signatures.some((signature: any) => signature.role === 'amendment-lead');
      const hasVpSignature = signatures.some((signature: any) => signature.role === 'amendment-vp');
      if (!hasLeadSignature || !hasVpSignature) {
        throw new BadRequestException('Both Protocol Lead and Clinical Affairs VP amendment signatures are required before finalization');
      }
    }

    let updatedAmendment: any;
    let shouldUnblock = false;

    await this.protocols.updateAtomic(projectId, (protocol) => {
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

      shouldUnblock = (amendment.status === 'finalized' || amendment.status === 'rejected') &&
        !amendments.some((item: any) =>
          item.id !== amendmentId && item.status !== 'finalized' && item.status !== 'rejected',
        );
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

  @Post('/:projectId/check-synopsis-consistency')
  @UseGuards(AiThrottlerGuard)
  async checkSynopsisConsistency(
    @Param('projectId') projectId: string,
  ) {
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'protocol-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const synopsisText = sourceSynopsisText(project?.data?.synopsis);

    const protocolSections = (protocol.sections || []).map((s: any) => ({
      title: s.title,
      content: s.content || '',
    })).filter((s: any) => s.content);

    return this.ai.checkSynopsisConsistency(synopsisText, protocolSections, projectId);
  }

@Post('/:projectId/workflow/force-protocol-draft')
async forceProtocolDraft(@Param('projectId') projectId: string, @Req() req: any) {
  if (process.env.NODE_ENV === 'production' && !req.user?.roles?.includes('admin')) {
    throw new ForbiddenException('This endpoint is only available in development or for admins');
  }

  return this.protocols.forceDraft(projectId, PROTOCOL_SECTION_TITLES, req.user);
}

  // Protocol attachments belong to the protocol as a whole. All project members
  // may list them; the service performs the authoritative project-role check for
  // upload/remove using project_members and the real JWT user id.
  @Get('/:projectId/documents/protocol/attachments')
  @Roles('admin', 'author', 'reviewer', 'approver')
  listProtocolAttachments(@Param('projectId') projectId: string) {
    return this.attachments.listProtocolAttachments({ projectId });
  }

  @Patch('/:projectId/documents/protocol/attachments/:attachmentId/requirements')
  @Roles('admin', 'author', 'reviewer', 'approver')
  updateAttachmentRequirements(@Param('projectId') projectId: string, @Param('attachmentId') attachmentId: string,
    @Body() body: UpdateAttachmentRequirementsDto, @Req() req: any) {
    return this.attachments.updateRequirements(projectId, attachmentId, body.requirementIds, req.user);
  }

  @Post('/:projectId/protocol/sections/:sectionId/findings/:issueId/decision')
  @Roles('admin', 'author', 'reviewer', 'approver')
  @UseGuards(AiThrottlerGuard)
  decideFinding(@Param('projectId') projectId: string, @Param('sectionId') sectionId: string,
    @Param('issueId') issueId: string, @Body() body: FindingDecisionDto, @Req() req: any) {
    return this.findingDocuments!.decide(projectId, sectionId, issueId, body.action, req.user, body.attachmentId, body.reason);
  }

  @Post('/:projectId/documents/protocol/attachments')
  @Roles('admin', 'author', 'reviewer', 'approver')
  @UseFilters(ProtocolUploadSizeExceptionFilter)
  @UseInterceptors(FileInterceptor('file', PROTOCOL_UPLOAD_OPTIONS))
  uploadProtocolAttachment(
    @Param('projectId') projectId: string,
    @UploadedFile() file: any,
    @Body() body: UploadProtocolAttachmentDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    const user: any = (req as any).user;
    return this.attachments.uploadProtocolAttachment({
      projectId,
      filename: file.originalname,
      mimeType: file.mimetype ?? 'application/octet-stream',
      bytes: file.buffer,
      description: body.description,
      actor: user,
    });
  }

  @Delete('/:projectId/documents/protocol/attachments/:attachmentId')
  @Roles('admin', 'author', 'reviewer', 'approver')
  removeProtocolAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
  ) {
    const user: any = (req as any).user;
    return this.attachments.removeProtocolAttachment({ projectId, attachmentId, actor: user });
  }
}
