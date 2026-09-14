import { ProjectsController } from './projects.controller';
import { AiService, PROTOCOL_SECTION_TITLES } from '../ai/ai.service';

describe('document generation', () => {
  let controller: ProjectsController;
  let projects: any;
  let ai: any;
  beforeEach(() => {
    projects = {
      get: jest.fn().mockResolvedValue({
        name: 'Study', targetMarkets: ['EU'], roles: [], data: {},
        report: { sections: { 'section-1': { content: '<p>Saved text</p>' } } },
      }),
      updateReportSections: jest.fn(async (_id, patches) => ({
        ...patches, 'section-1': { content: '<p>Saved text</p>' },
      })),
      update: jest.fn(),
    };
    ai = {
      generateReportSection: jest.fn(async (title) => `<p>${title} generated</p>`),
      mapInBatches: AiService.prototype.mapInBatches,
      generateProtocol: jest.fn(), generateRequiredElements: jest.fn(),
    };
    controller = new ProjectsController(projects, {} as any, ai, {} as any, {} as any,
      { start: jest.fn(), clear: jest.fn() } as any);
    jest.spyOn(controller as any, 'assertDocumentNotSigned').mockResolvedValue(undefined);
    jest.spyOn(controller as any, 'assertProtocolPrerequisites').mockResolvedValue(undefined);
  });

  it('fills every missing EU section and preserves saved text', async () => {
    const result = await controller.generateReport('project', { onlyMissing: true }, { user: {} });
    expect(result).toHaveLength(11);
    expect(ai.generateReportSection).toHaveBeenCalledTimes(10);
    expect(result.every(s => s.content.trim())).toBe(true);
    expect(result[0].content).toBe('<p>Saved text</p>');
    expect(projects.updateReportSections.mock.calls[0][4]).toBe(true);
  });

  it.each(['', '   ', '<p><br></p>', '<script>bad()</script>', '<p>&nbsp;</p>'])(
    'rejects empty generated text %p without persisting a blank report', async content => {
      ai.generateReportSection.mockResolvedValue(content);
      await expect(controller.generateReport('project', { onlyMissing: true }, { user: {} }))
        .rejects.toThrow('AI returned no text');
      expect(projects.updateReportSections).not.toHaveBeenCalled();
    },
  );

  it('rejects an empty single-section result', async () => {
    ai.generateReportSection.mockResolvedValue('');
    await expect(controller.generateReportSection('project', { sectionId: 'section-2', sectionTitle: 'Introduction', sectionNumber: 2 }, { user: {} }))
      .rejects.toThrow('AI returned no text');
    expect(projects.updateReportSections).not.toHaveBeenCalled();
  });

  it('rejects a protocol with a blank section after sanitization', async () => {
    ai.generateProtocol.mockResolvedValue({ sections: PROTOCOL_SECTION_TITLES.map((title, i) => ({
      title, content: i === 0 ? '<p><br></p>' : '<p>Generated content</p>',
    })) });
    await expect(controller.generateProtocol('project', { user: {} })).rejects.toThrow('AI returned no text');
    expect(projects.update).not.toHaveBeenCalled();
  });
});
