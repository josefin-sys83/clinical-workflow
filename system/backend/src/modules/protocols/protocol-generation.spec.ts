import { ProtocolsController } from './protocols.controller';
import { PROTOCOL_SECTION_TITLES } from '../ai/ai.service';

describe('protocol generation', () => {
  const actor = { userId: 'writer', name: 'Writer' };
  let controller: ProtocolsController;
  let protocols: any;
  let ai: any;
  let projects: any;

  beforeEach(() => {
    projects = {
      get: jest.fn().mockResolvedValue({ name: 'Study', risk: 'IIa', deviceCategory: 'active', targetMarkets: ['EU'], roles: [], data: {} }),
    };
    protocols = { updateAtomic: jest.fn(async (_id, mutate) => mutate({})) };
    ai = {
      generateProtocol: jest.fn().mockResolvedValue({
        sections: PROTOCOL_SECTION_TITLES.map((title, i) => ({ id: String(i + 1), title, content: '<p>Generated content</p>' })),
      }),
      generateRequiredElements: jest.fn().mockResolvedValue([]),
    };
    controller = new ProtocolsController(projects as any, protocols, ai, {} as any,
      { start: jest.fn(), clear: jest.fn() } as any,
      { assertDocumentNotSigned: jest.fn(), assertProtocolPrerequisites: jest.fn() } as any, {} as any);
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
  });

  it('uses the intended use saved in scope', async () => {
    projects.get.mockResolvedValue({
      name: 'Study', risk: 'IIa', deviceCategory: 'active', targetMarkets: ['EU'], roles: [],
      data: {
        projectData: { sponsor: 'Sponsor', deviceName: 'Device' },
        scope: { intendedUse: 'diagnostic', requirements: [] },
      },
    });

    await controller.generateProtocol('project', { user: actor });

    expect(ai.generateProtocol).toHaveBeenCalledWith(
      expect.objectContaining({ sponsor: 'Sponsor', deviceName: 'Device' }),
      [], expect.any(String),
      { intendedUse: 'diagnostic', requirements: [], deviceCategory: 'active', targetMarkets: ['EU'] },
      expect.any(Function),
    );
    expect(ai.generateRequiredElements).toHaveBeenCalledWith(
      expect.any(String), ['EU'], 'active', 'diagnostic',
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
      scope: { intendedUse: 'other-custom', customIntendedUse: 'Updated use' },
      effectiveIntendedUse: 'Updated use',
      projectManager: 'Manager',
    }));
  });

  it('reloads canonical project metadata for every regeneration request', async () => {
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

});
