import { ProtocolsService } from './protocols.service';
import { ProtocolsController } from './protocols.controller';
import { PROTOCOL_SECTION_TITLES } from '../ai/ai.service';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';

describe('protocol generation', () => {
  const actor = { userId: 'writer', name: 'Writer' };
  let controller: ProtocolsController;
  let protocols: any;
  let ai: any;
  let projects: any;
  let stored: any;

  beforeEach(() => {
    projects = {
      get: jest.fn().mockResolvedValue({ name: 'Study', risk: 'IIa', deviceCategory: 'active', targetMarkets: ['EU'], roles: [], data: {} }),
    };
    stored = {};
    protocols = {
      updateAtomic: jest.fn(async (_id, mutate) => { stored = mutate(stored); return stored; }),
      beginSectionAnalysis: ProtocolsService.prototype.beginSectionAnalysis,
      finishSectionAnalysis: ProtocolsService.prototype.finishSectionAnalysis,
    };
    ai = {
      generateProtocol: jest.fn().mockResolvedValue({
        sections: PROTOCOL_SECTION_TITLES.map((title, i) => ({ id: String(i + 1), title, content: '<p>Generated content</p>' })),
      }),
      generateRequiredElements: jest.fn().mockResolvedValue([]),
    };
    controller = new ProtocolsController(projects as any, protocols, ai, {} as any,
      { start: jest.fn(), clear: jest.fn() } as any,
      { assertDocumentNotSigned: jest.fn(), assertProtocolEditable: jest.fn(), assertProtocolPrerequisites: jest.fn() } as any,
      { supportingDocuments: jest.fn().mockResolvedValue([]) } as any);
  });

  it('rejects a protocol with a blank section after sanitization', async () => {
    ai.generateProtocol.mockResolvedValue({ sections: PROTOCOL_SECTION_TITLES.map((title, i) => ({
      title, content: i === 0 ? '<p><br></p>' : '<p>Generated content</p>',
    })) });
    await expect(controller.generateProtocol('project', { user: actor })).rejects.toThrow('AI returned no text');
    expect(protocols.updateAtomic).not.toHaveBeenCalled();
  });

  it('persists the generated protocol and its audit event through the protocol service', async () => {
    const result = await controller.generateProtocol('project', { user: actor });
    expect(result.sections).toHaveLength(PROTOCOL_SECTION_TITLES.length);
    expect(result.sections.every((s: any) => s.content && Array.isArray(s.requiredElements))).toBe(true);
    expect(protocols.updateAtomic).toHaveBeenCalledWith('project', expect.any(Function), actor,
      expect.objectContaining({ type: 'protocol.generated', metadata: expect.objectContaining({ sections: 9 }) }));
    const metadata = protocols.updateAtomic.mock.calls[0][3].metadata;
    expect(metadata.sectionIds).toEqual(result.sections.map((s: any) => s.id));
    expect(metadata.generationInputs).toContainEqual({ label: 'Project', value: 'Study' });
    expect(metadata.generationInputs).toContainEqual({ label: 'Target markets', value: 'EU' });
  });

  it('uses the intended use saved in scope', async () => {
    projects.get.mockResolvedValue({
      name: 'Study', risk: 'IIa', deviceCategory: 'active', targetMarkets: ['EU'], roles: [],
      requirements: [],
      data: {
        projectData: { sponsor: 'Sponsor', deviceName: 'Device' },
        scope: { intendedUse: 'diagnostic' },
      },
    });

    await controller.generateProtocol('project', { user: actor });

    expect(ai.generateProtocol).toHaveBeenCalledWith(
      expect.objectContaining({ sponsor: 'Sponsor', deviceName: 'Device' }),
      [], expect.any(String),
      { intendedUse: 'diagnostic', requirements: [], deviceCategory: 'active', targetMarkets: ['EU'] },
      expect.any(Function),
      'project',
    );
    expect(ai.generateRequiredElements).toHaveBeenCalledWith(
      expect.any(String), ['EU'], 'active', 'diagnostic', 'project',
    );
  });

  it('logs the metadata sent to the protocol AI request', async () => {
    projects.get.mockResolvedValue({
      name: 'Study', risk: 'IIa', deviceCategory: 'active', targetMarkets: ['EU'],
      roles: [{ title: 'Project Manager', assignedTo: [{ name: 'Manager' }] }],
      data: {
        projectData: { sponsor: 'Sponsor', deviceName: 'Device' },
        scope: { intendedUse: 'other-custom', customIntendedUse: 'Updated use' },
      },
    });
    const log = jest.spyOn((controller as any).logger, 'log').mockImplementation(() => undefined);

    await controller.generateProtocol('project', { user: actor });

    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ai.generation_metadata',
      generationPath: 'protocol',
      projectId: 'project',
      projectData: expect.objectContaining({ sponsor: 'Sponsor', deviceName: 'Device' }),
      scope: { intendedUse: 'Updated use', customIntendedUse: 'Updated use' },
      effectiveIntendedUse: 'Updated use',
      projectManager: 'Manager',
    }));
  });

  it('reloads canonical project metadata for every regeneration request', async () => {
    protocols.updateAtomic.mockImplementation(async (_id: string, mutate: any) => mutate({}));
    projects.get
      .mockResolvedValueOnce({
        name: 'Study', deviceCategory: 'active', targetMarkets: ['EU'], roles: [],
        data: { projectData: { sponsor: 'Old sponsor', deviceName: 'Old device' }, scope: { intendedUse: 'monitoring' } },
      })
      .mockResolvedValueOnce({
        name: 'Study', deviceCategory: 'active', targetMarkets: ['EU'], roles: [],
        data: { projectData: { sponsor: 'New sponsor', deviceName: 'New device' }, scope: { intendedUse: 'diagnostic' } },
      });

    await controller.generateProtocol('project', { user: actor });
    await controller.generateProtocol('project', { user: actor });

    expect(projects.get).toHaveBeenCalledTimes(2);
    expect(ai.generateProtocol.mock.calls[1][0]).toEqual(expect.objectContaining({
      sponsor: 'New sponsor', deviceName: 'New device',
    }));
    expect(ai.generateProtocol.mock.calls[1][3]).toEqual(expect.objectContaining({
      intendedUse: 'diagnostic',
    }));
  });

  it.each([
    { sections: [{ id: '1', approvalStatus: 'approved' }] },
    { sections: [{ id: '1', locked: true }] },
    { sections: [], amendments: [{ id: 'amendment-1' }] },
  ])('rejects regeneration of reviewed or amended protocols before AI calls', async existing => {
    projects.get.mockResolvedValue({ data: { protocol: existing } });
    await expect(controller.generateProtocol('project', { user: actor })).rejects.toThrow('unapproved draft');
    expect(ai.generateProtocol).not.toHaveBeenCalled();
    expect(protocols.updateAtomic).not.toHaveBeenCalled();
  });

  it('preserves draft comments, replies and document identity during regeneration', async () => {
    const original = {
      protocolId: 'CIP-original', status: 'draft', amendments: [],
      sections: [{ id: '1', content: '<p>Old text</p>', approvalStatus: 'draft',
        comments: [{ id: 'comment', content: 'Review note', replies: [{ id: 'reply', content: 'Response' }] }] }],
    };
    projects.get.mockResolvedValue({ targetMarkets: ['EU'], data: { protocol: original } });
    protocols.updateAtomic.mockImplementation(async (_id: string, mutate: any) => mutate(original));
    const result = await controller.generateProtocol('project', { user: actor });
    expect(result.protocolId).toBe('CIP-original');
    expect(result.sections[0].comments).toEqual(original.sections[0].comments);
    expect(result.sections[0].content).toBe('<p>Generated content</p>');
  });

  it('rejects replacement when the stored protocol changes while AI is running', async () => {
    const original = { sections: [{ id: '1', content: 'Original draft' }] };
    projects.get.mockResolvedValue({ data: { protocol: original } });
    protocols.updateAtomic.mockImplementation(async (_id: string, mutate: any) =>
      mutate({ sections: [{ id: '1', content: 'Concurrent edit' }] }));
    await expect(controller.generateProtocol('project', { user: actor }))
      .rejects.toThrow('changed during generation');
  });

  it('rejects an approval added while generation was running', async () => {
    const original = { sections: [{ id: '1', content: 'Original draft' }] };
    projects.get.mockResolvedValue({ data: { protocol: original } });
    protocols.updateAtomic.mockImplementation(async (_id: string, mutate: any) =>
      mutate({ sections: [{ ...original.sections[0], approvalStatus: 'approved' }] }));
    await expect(controller.generateProtocol('project', { user: actor }))
      .rejects.toThrow('unapproved draft');
  });

  it('rejects old analysis after section content was replaced', async () => {
    const original = { id: '1', title: 'Overview', content: 'Old text' };
    projects.get.mockResolvedValue({ data: { protocol: { sections: [original] } } });
    stored = { sections: [original] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockImplementation(async () => {
      stored = { sections: [{ ...original, content: 'Regenerated text', analysisRequestId: null }] };
      return { issues: [{ description: 'Old finding' }] };
    });
    await expect(controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: 'Old text',
    }, { user: actor })).rejects.toThrow('changed during analysis');
  });

  it.each([
    '<p>First<br>Second</p>',
    '<p style="font-weight: bold;">Edited text</p>',
  ])('analyzes the saved HTML when the editor sends an equivalent representation: %s', async editorHtml => {
    const savedHtml = sanitizeSectionHtml(editorHtml);
    expect(savedHtml).not.toBe(editorHtml);
    const original = { id: '1', title: 'Overview', content: savedHtml, requiredElements: [] };
    projects.get.mockResolvedValue({ data: { protocol: { sections: [original] } } });
    const analyze = jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({ issues: [] });
    stored = { sections: [original] };

    await expect(controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: editorHtml,
    }, { user: actor })).resolves.toMatchObject({ issues: [] });

    expect(analyze.mock.calls[0][2]).toBe(savedHtml);
  });

  it('rejects genuinely outdated text before spending an AI request', async () => {
    projects.get.mockResolvedValue({ data: { protocol: { sections: [
      { id: '1', title: 'Overview', content: '<p>New saved text</p>' },
    ] } } });
    const analyze = jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({ issues: [] });

    await expect(controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Old text</p>',
    }, { user: actor })).rejects.toThrow('Reload');
    expect(analyze).not.toHaveBeenCalled();
    expect(stored).toEqual({});
  });

  it('persists only the analyzed section while retaining concurrent changes elsewhere', async () => {
    const original = { id: '1', title: 'Overview', content: 'Current text', comments: [{ id: 'note' }] };
    const other = { id: '2', content: 'Another user edited this section' };
    projects.get.mockResolvedValue({ data: { protocol: { sections: [original] } } });
    jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({ issues: [], requiredElements: [] });
    stored = { sections: [original, other], amendments: [] };
    await controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: 'Current text',
    }, { user: actor });
    expect(stored.sections[1]).toEqual(other);
    expect(stored.sections[0].comments).toEqual(original.comments);
    expect(stored.sections[0].issues).toEqual([]);
  });

  it('keeps old findings during review and removes only explicitly fixed findings', async () => {
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [{ id: 'old', textQuote: 'Text' }], analysisStatus: 'succeeded' }] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockImplementation(async () => {
      expect(stored.sections[0]).toMatchObject({ analysisStatus: 'running', issues: [{ id: 'old' }] });
      return { issues: [], previousIssueAssessments: [{ issue_id: 'old', outcome: 'fixed', reason: 'Current text addresses the concern', textQuote: null }] };
    });
    await controller.analyzeSection('project', { sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Text</p>' }, { user: actor });
    expect(stored.sections[0]).toMatchObject({ analysisStatus: 'succeeded', issues: [], analysisError: null });
  });

  it('preserves existing findings when a review fails', async () => {
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [{ id: 'old' }] }] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockRejectedValue(new Error('Provider timed out'));
    await expect(controller.analyzeSection('project', { sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Text</p>' }, { user: actor })).rejects.toThrow('Provider timed out');
    expect(stored.sections[0]).toMatchObject({ analysisStatus: 'failed', analysisError: 'Provider timed out', issues: [{ id: 'old' }] });
  });

  it('saves positive coverage from the section and attachment and returns it to the browser', async () => {
    const coverage = [
      { name: 'Follow-up schedule', status: 'satisfied', source: 'section', sourceName: null,
        evidence: 'Visits occur at 30 days and 3 months.' },
      { name: 'PMCF Plan', status: 'satisfied', source: 'attachment', sourceName: 'Appendix 4 - PMCF Plan.docx',
        evidence: 'The plan includes follow-up procedures.' },
    ];
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [] }] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({
      issues: [], requiredElements: [], satisfiedRequirements: coverage,
    });
    const result = await controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Text</p>',
    }, { user: actor });
    expect(stored.sections[0].satisfiedRequirements).toEqual(coverage);
    expect(result.satisfiedRequirements).toEqual(coverage);
  });

  it('clears previous positive coverage when reanalysis returns an empty list', async () => {
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [],
      satisfiedRequirements: [{ name: 'Old coverage' }] }] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({
      issues: [], requiredElements: [], satisfiedRequirements: [],
    });
    const result = await controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Text</p>',
    }, { user: actor });
    expect(stored.sections[0].satisfiedRequirements).toEqual([]);
    expect(result.satisfiedRequirements).toEqual([]);
  });

  it('keeps the last successful positive coverage when reanalysis fails', async () => {
    const coverage = [{ name: 'PMCF Plan', status: 'satisfied', source: 'attachment',
      sourceName: 'Appendix 4', evidence: 'The plan includes the schedule.' }];
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [],
      satisfiedRequirements: coverage }] };
    jest.spyOn(controller as any, 'runSectionAnalysis').mockRejectedValue(new Error('Provider timed out'));
    await expect(controller.analyzeSection('project', {
      sectionId: '1', sectionTitle: 'Overview', sectionContent: '<p>Text</p>',
    }, { user: actor })).rejects.toThrow('Provider timed out');
    expect(stored.sections[0]).toMatchObject({ analysisStatus: 'failed', satisfiedRequirements: coverage });
  });

  it('uses the same saved review lifecycle for bulk section analysis', async () => {
    stored = { sections: [{ id: '1', title: 'Overview', content: '<p>Text</p>', issues: [{ id: 'old' }] }] };
    projects.get.mockImplementation(async () => ({ data: { protocol: stored } }));
    ai.mapInBatches = async (items: any[], _size: number, fn: any) => Promise.all(items.map(fn));
    jest.spyOn(controller as any, 'runSectionAnalysis').mockResolvedValue({ issues: [] });
    await controller.analyzeSections('project', {}, { user: actor });
    expect(stored.sections[0]).toMatchObject({ analysisStatus: 'succeeded', issues: [{ id: 'old' }] });
  });

});
