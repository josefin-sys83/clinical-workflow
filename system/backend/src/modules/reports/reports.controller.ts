import { Body, Controller, Get, Header, Logger, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from '../projects/projects.service';
import { DocumentWorkflowService } from '../projects/document-workflow.service';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { requireGeneratedText } from '../../common/require-generated-text';
import { ReportsService } from './reports.service';
import { UpdateReportSectionsDto } from './dto';
import { getReportSectionDefinitions, resolveReportMarkets } from './report-section-definitions';
import { buildGenerationMetadataLog, buildProjectGenerationContext } from '../projects/project-generation-context';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@ApiTags('reports')
@Controller('/api/projects')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly projects: ProjectsService,
    private readonly reports: ReportsService,
    private readonly ai: AiService,
    private readonly documentWorkflow: DocumentWorkflowService,
  ) {}

  @Get('/:projectId/report-sections')
  @Header('Cache-Control', 'no-store')
  async getReportSections(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const scope = project?.data?.scope || {};

    const targetMarkets = resolveReportMarkets(project.targetMarkets, scope);

    const sections = this.getDynamicReportSections(targetMarkets, scope);
    return {
      sections,
      targetMarkets,
      deviceCategory: project.deviceCategory || '',
      studyType: project?.data?.synopsis?.studyType || '',
    };
  }

  @Patch('/:projectId/report/sections')
  updateReportSections(
    @Param('projectId') projectId: string,
    @Body() body: UpdateReportSectionsDto,
    @Req() req: any,
  ) {
    return this.reports.updateSections(projectId, body.sections, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
  }

  @Get('/:projectId/report')
  getReport(@Param('projectId') projectId: string) {
    return this.reports.getByProject(projectId);
  }

  @Patch('/:projectId/report/consistency-dismissals')
  dismissReportConsistency(@Param('projectId') projectId: string, @Body() body: { findingKeys: string[] }, @Req() req: any) {
    return this.reports.dismissConsistency(projectId, body.findingKeys, req.user);
  }

  @Post('/:projectId/report/sections/:sectionKey/comments')
  addReportComment(@Param('projectId') projectId: string, @Param('sectionKey') key: string,
    @Body() body: { content: string; type?: string; parentCommentKey?: string }, @Req() req: any) {
    return this.reports.addComment(projectId, key, body, req.user);
  }

  private getDynamicReportSections(
    targetMarkets: string[],
    scope: any,
  ): Array<{ id: string; title: string; number: number }> {
    return getReportSectionDefinitions(targetMarkets);
  }

  @Post('/:projectId/generate-report')
  @UseGuards(AiThrottlerGuard)
  async generateReport(
    @Param('projectId') projectId: string,
    @Body() body: { onlyMissing?: boolean } = {},
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const { aiProjectData, scope } = buildProjectGenerationContext(project);
    const roles = project.roles || [];
    const protocolSections = project?.data?.protocol?.sections || [];
    const existingReport = project?.report || {};
    const existingSections: Record<string, any> = existingReport.sections || {};
    if ((project?.data?.protocol?.amendments || []).some((a: any) => a.status !== 'finalized' && a.status !== 'rejected')) {
      throw new ForbiddenException('Finalize or reject pending protocol amendments before generating the report.');
    }

    const targetMarkets: string[] = aiProjectData.targetMarkets.length > 0 ? aiProjectData.targetMarkets : ['EU'];
    const deviceName: string = aiProjectData.deviceName || '[Device Name]';

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

    const sectionDefs = this.getDynamicReportSections(targetMarkets, scope);

    // Sanitize before persistence and before returning generated HTML to the browser.
    const sectionsToGenerate = body.onlyMissing
      ? sectionDefs.filter((section) => !String(existingSections[section.id]?.content || existingSections[section.id]?.aiDraft || '').trim())
      : sectionDefs;
    const generatedContents = new Map<string, string>();
    if (sectionsToGenerate.length > 0) {
      this.logger.log(buildGenerationMetadataLog(
        'report', projectId, aiProjectData, scope, roles,
      ));
    }
    await this.ai.mapInBatches(sectionsToGenerate, 3, async s => {
      const content = await this.ai.generateReportSection(
        s.title, s.number, protocolSections, enrichedSynopsis, scope, aiProjectData, roles, []
      );
      generatedContents.set(s.id, requireGeneratedText(content, s.title));
    });

    const generatedSectionPatches = Object.fromEntries(
      sectionDefs.map(s => [s.id, { title: s.title, number: s.number, order: s.number, ...(generatedContents.has(s.id) ? { content: generatedContents.get(s.id), aiDraft: null } : {}) }]),
    );
    const persistedSections = await this.reports.updateSections(
      projectId,
      generatedSectionPatches,
      req.user,
      [{
        type: 'report.ai.generated',
        message: 'Clinical Investigation Report generated by AI',
        stepId: 'report-make',
        entityType: 'report',
        entityId: projectId,
        entityLabel: 'Clinical Investigation Report',
        metadata: {
          model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
          sectionsGenerated: sectionsToGenerate.length,
          targetMarkets,
          deviceName,
          generatedAt: new Date().toISOString(),
        },
      }],
      body.onlyMissing === true,
    );

    return sectionDefs.map((s) => ({
      id: s.id,
      title: s.title,
      number: s.number,
      content: String(persistedSections[s.id]?.content || persistedSections[s.id]?.aiDraft || ''),
    }));
  }

  @Post('/:projectId/generate-report-section')
  @UseGuards(AiThrottlerGuard)
  async generateReportSection(
    @Param('projectId') projectId: string,
    @Body() body: { sectionId: string; sectionTitle: string; sectionNumber: number },
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const { aiProjectData, scope } = buildProjectGenerationContext(project);
    const roles = project.roles || [];
    const protocolSections = project?.data?.protocol?.sections || [];
    const targetMarkets: string[] = aiProjectData.targetMarkets.length > 0 ? aiProjectData.targetMarkets : ['EU'];

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

    this.logger.log(buildGenerationMetadataLog(
      'report-section', projectId, aiProjectData, scope, roles,
    ));
    const content = await this.ai.generateReportSection(
      body.sectionTitle,
      body.sectionNumber,
      protocolSections,
      enrichedSynopsis,
      scope,
      aiProjectData,
      roles,
      [],
    );

    // Sanitized immediately for the same reason as generateReport(): this value is
    // both stored and returned directly in the HTTP response.
    const trimmedContent = requireGeneratedText(content, body.sectionTitle);

    await this.reports.updateSections(
      projectId,
      { [body.sectionId]: { content: trimmedContent, aiDraft: null, title: body.sectionTitle, number: body.sectionNumber, order: body.sectionNumber } },
      req.user,
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
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const { aiProjectData, intendedUse } = buildProjectGenerationContext(project);
    const targetMarkets = aiProjectData.targetMarkets.length > 0 ? aiProjectData.targetMarkets : ['EU'];
    const deviceCategory = aiProjectData.deviceCategory;

    const protocol = project?.data?.protocol || {};
    const reportSections = project?.report?.sections || {};
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
    @Req() req: any,
  ) {
    await this.documentWorkflow.assertDocumentNotSigned(projectId, 'report-pdf');
    const project = await this.projects.get(projectId);
    const protocol = project?.data?.protocol || {};
    const report = project?.report || {};
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
      title: data.title || sectionTitleMap[id] || id,
      content: data.content || '',
    })).filter((s: any) => s.content);

    const result = await this.ai.checkCrossConsistency(protocolSections, reportSections, targetMarkets, deviceCategory);

    // Persist the report analysis so the frontend only has to re-run this (AI,
    // non-deterministic wording) check on an explicit user action, not on every page
    // load — otherwise a "Won't fix" dismissal keyed on the finding's text can lapse
    // as soon as the AI rewords the same finding on the next automatic re-check.
    await this.reports.updateConsistency(projectId, result.issues, req.user);

    return result;
  }

  @Post('/:projectId/validate-statistics')
  async validateStatistics(@Param('projectId') projectId: string) {
    const project = await this.projects.get(projectId);
    const reportSections = project?.report?.sections || {};
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
}
