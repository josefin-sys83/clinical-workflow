import { ReportsController } from './reports.controller';
import { AiService } from '../ai/ai.service';

describe('report generation', () => {
  let controller: ReportsController;
  let projects: any;
  let reports: any;
  let ai: any;
  beforeEach(() => {
    projects = {
      get: jest.fn().mockResolvedValue({
        name: 'Study', targetMarkets: ['EU'], roles: [], data: {},
        report: { sections: { 'section-1': { content: '<p>Saved text</p>' } } },
      }),
    };
    reports = {
      updateSections: jest.fn(async (_id, patches) => ({
        ...patches, 'section-1': { content: '<p>Saved text</p>' },
      })),
    };
    ai = {
      generateReportSection: jest.fn(async (title) => `<p>${title} generated</p>`),
      mapInBatches: AiService.prototype.mapInBatches,
    };
    controller = new ReportsController(projects, reports, ai, {
      assertDocumentNotSigned: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('fills every missing EU section and preserves saved text', async () => {
    const result = await controller.generateReport('project', { onlyMissing: true }, { user: {} });
    expect(result).toHaveLength(11);
    expect(ai.generateReportSection).toHaveBeenCalledTimes(10);
    expect(result.every(s => s.content.trim())).toBe(true);
    expect(result[0].content).toBe('<p>Saved text</p>');
    expect(reports.updateSections.mock.calls[0][4]).toBe(true);
  });

  it.each(['', '   ', '<p><br></p>', '<script>bad()</script>', '<p>&nbsp;</p>'])(
    'rejects empty generated text %p without persisting a blank report', async content => {
      ai.generateReportSection.mockResolvedValue(content);
      await expect(controller.generateReport('project', { onlyMissing: true }, { user: {} }))
        .rejects.toThrow('AI returned no text');
      expect(reports.updateSections).not.toHaveBeenCalled();
    },
  );

  it('rejects an empty single-section result', async () => {
    ai.generateReportSection.mockResolvedValue('');
    await expect(controller.generateReportSection('project', { sectionId: 'section-2', sectionTitle: 'Introduction', sectionNumber: 2 }, { user: {} }))
      .rejects.toThrow('AI returned no text');
    expect(reports.updateSections).not.toHaveBeenCalled();
  });

});
