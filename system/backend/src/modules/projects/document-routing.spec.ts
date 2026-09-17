import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProjectsModule } from './projects.module';
import { ProjectsController } from './projects.controller';
import { ProtocolsController } from '../protocols/protocols.controller';
import { ReportsController } from '../reports/reports.controller';
import { ProtocolsService } from '../protocols/protocols.service';
import { ReportsService } from '../reports/reports.service';
import { ProtocolAttachmentsService } from '../protocols/protocol-attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AiThrottlerGuard } from '../../common/ai-throttler.guard';
import { ResultsController } from '../results/results.controller';
import { ResultsService } from '../results/results.service';

function routes(controller: any) {
  return Object.getOwnPropertyNames(controller.prototype).flatMap(name => {
    const handler = controller.prototype[name];
    const method = Reflect.getMetadata(METHOD_METADATA, handler);
    if (method === undefined) return [];
    const path = Reflect.getMetadata(PATH_METADATA, handler).replace(/^\//, '');
    return [{ key: `${RequestMethod[method]} /api/projects/${path}`.replace(/\/$/, ''), handler }];
  });
}

describe('project document routing', () => {
  it.each([
    [ProtocolsController, [
      'PATCH /api/projects/:projectId/protocol/sections/:sectionId',
      'GET /api/projects/:projectId/generate-protocol/progress',
      'POST /api/projects/:projectId/generate-protocol',
      'POST /api/projects/:projectId/analyze-section',
      'POST /api/projects/:projectId/analyze-sections',
      'POST /api/projects/:projectId/amendments',
      'PATCH /api/projects/:projectId/amendments/:amendmentId',
      'GET /api/projects/:projectId/amendments',
      'POST /api/projects/:projectId/check-synopsis-consistency',
      'POST /api/projects/:projectId/workflow/force-protocol-draft',
      'GET /api/projects/:projectId/documents/protocol/attachments',
      'POST /api/projects/:projectId/documents/protocol/attachments',
      'DELETE /api/projects/:projectId/documents/protocol/attachments/:attachmentId',
    ]],
    [ReportsController, [
      'GET /api/projects/:projectId/report-sections',
      'PATCH /api/projects/:projectId/report/sections',
      'GET /api/projects/:projectId/report',
      'PATCH /api/projects/:projectId/report/consistency-dismissals',
      'POST /api/projects/:projectId/report/sections/:sectionKey/comments',
      'POST /api/projects/:projectId/generate-report',
      'POST /api/projects/:projectId/generate-report-section',
      'POST /api/projects/:projectId/analyze-report-section',
      'POST /api/projects/:projectId/check-cross-consistency',
      'POST /api/projects/:projectId/validate-statistics',
    ]],
  ])('retains existing URLs and access guards in %p', (controller, expected) => {
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe('/api/projects');
    expect(routes(controller).map(r => r.key).sort()).toEqual([...expected].sort());
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([JwtAuthGuard, ProjectAccessGuard, RolesGuard]);
  });

  it('registers each route once and preserves generation throttling, upload roles and metadata caching', () => {
    const all = [ProjectsController, ProtocolsController, ReportsController].flatMap(routes);
    expect(all).toHaveLength(42);
    expect(new Set(all.map(r => r.key)).size).toBe(all.length);
    for (const handler of [
      ProtocolsController.prototype.generateProtocol,
      ProtocolsController.prototype.analyzeSection,
      ProtocolsController.prototype.analyzeSections,
      ProtocolsController.prototype.checkSynopsisConsistency,
      ReportsController.prototype.generateReport,
      ReportsController.prototype.generateReportSection,
      ReportsController.prototype.analyzeReportSection,
      ReportsController.prototype.checkCrossConsistency,
    ]) expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(AiThrottlerGuard);
    for (const handler of [ProtocolsController.prototype.listProtocolAttachments,
      ProtocolsController.prototype.uploadProtocolAttachment, ProtocolsController.prototype.removeProtocolAttachment]) {
      expect(Reflect.getMetadata('roles', handler)).toEqual(['admin', 'author', 'reviewer', 'approver']);
    }
    expect(Reflect.getMetadata(HEADERS_METADATA, ReportsController.prototype.getReportSections))
      .toEqual([{ name: 'Cache-Control', value: 'no-store' }]);
  });

  it('resolves the controllers and domain services through the application module wiring', async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]), ProjectsModule],
    }).compile();
    try {
      expect(module.get(ProtocolsController)).toBeInstanceOf(ProtocolsController);
      expect(module.get(ReportsController)).toBeInstanceOf(ReportsController);
      expect(module.get(ResultsController)).toBeInstanceOf(ResultsController);
      expect(module.get(ResultsService)).toBeInstanceOf(ResultsService);
      expect(module.get(ProtocolsService)).toBeInstanceOf(ProtocolsService);
      expect(module.get(ReportsService)).toBeInstanceOf(ReportsService);
      expect(module.get(ProtocolAttachmentsService)).toBeInstanceOf(ProtocolAttachmentsService);
    } finally {
      await module.close();
    }
  });
});
