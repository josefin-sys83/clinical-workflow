import { BadGatewayException } from '@nestjs/common';
import { ProtocolsController } from '../protocols/protocols.controller';
import { ReportsController } from '../reports/reports.controller';

jest.mock('../../common/analysis-request-logger', () => ({ logAnalyzeSectionRequest: jest.fn() }));

describe.each(['protocol', 'report'])('%s section finding requirements', kind => {
  const section = { id: '1', title: 'Protocol Overview', content: 'Saved content', requiredElements: [] };
  const actor = { name: 'Reviewer' };
  let ai: any;
  let storage: any;
  let run: () => Promise<any>;
  beforeEach(() => {
    const projects: any = { get: jest.fn().mockResolvedValue({
      id: 'project', targetMarkets: [], data: {
        scope: { requirements: [
          { id: 'req-1', title: 'Safety', description: 'Monitoring', status: 'accepted' },
          { id: 'req-2', title: 'Suggested', status: 'suggested' },
        ] },
        protocol: { sections: [section] },
      },
    }) };
    ai = { analyzeSection: jest.fn(), analyzeReportSection: jest.fn() };
    storage = {
      beginSectionAnalysis: jest.fn().mockResolvedValue(kind === 'protocol' ? { section, requestId: 'request' } : 'request'),
      finishSectionAnalysis: jest.fn(async (_project, _section, _request, result) => result),
      listAttachmentsForAnalysis: jest.fn().mockResolvedValue([]),
    };
    const workflow: any = { assertDocumentNotSigned: jest.fn() };
    const body = { sectionId: section.id, sectionTitle: section.title, sectionContent: section.content };
    if (kind === 'protocol') {
      const controller = new ProtocolsController(projects, storage, ai, {} as any, {} as any, workflow, { supportingDocuments: jest.fn().mockResolvedValue([]) } as any);
      run = () => controller.analyzeSection('project', body, { user: actor });
    } else {
      const controller = new ReportsController(projects, storage, ai, workflow);
      run = () => controller.analyzeReportSection('project', body, { user: actor });
    }
  });

  it('passes accepted requirements to AI and preserves the returned link through persistence', async () => {
    const analyze = kind === 'protocol' ? ai.analyzeSection : ai.analyzeReportSection;
    analyze.mockResolvedValue({ issues: [kind === 'protocol'
      ? { id: 'finding', requirement: 'Safety', source: null }
      : { id: 'finding', requirementId: 'req-1' }] });
    const result = await run();
    if (kind === 'protocol') {
      expect(analyze.mock.calls[0][8]).toEqual([{ name: 'Safety', description: 'Monitoring' }]);
    } else {
      expect(JSON.parse(analyze.mock.calls[0][7])).toEqual([{ id: 'req-1', title: 'Safety', description: 'Monitoring' }]);
    }
    expect(result.issues[0].requirementId).toBe('req-1');
    expect(storage.finishSectionAnalysis).toHaveBeenCalledWith('project', '1', 'request',
      expect.objectContaining({ issues: expect.arrayContaining([expect.objectContaining({ requirementId: 'req-1' })]) }), null, actor);
  });

  it.each(['invented', 'req-2', ...(kind === 'report' ? [undefined] : [])])('marks analysis failed instead of saving an invalid AI link: %p', requirementId => {
    const analyze = kind === 'protocol' ? ai.analyzeSection : ai.analyzeReportSection;
    analyze.mockResolvedValue({ issues: [{ id: 'finding', requirementId }] });
    return expect(run()).rejects.toBeInstanceOf(BadGatewayException).then(() => {
      expect(storage.finishSectionAnalysis).toHaveBeenCalledTimes(1);
      expect(storage.finishSectionAnalysis).toHaveBeenCalledWith('project', '1', 'request', null, expect.any(String), actor);
    });
  });
});
