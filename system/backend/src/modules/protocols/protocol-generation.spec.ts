import { ProtocolsController } from './protocols.controller';
import { PROTOCOL_SECTION_TITLES } from '../ai/ai.service';

describe('protocol generation', () => {
  const actor = { userId: 'writer', name: 'Writer' };
  let controller: ProtocolsController;
  let protocols: any;
  let ai: any;

  beforeEach(() => {
    const projects = {
      get: jest.fn().mockResolvedValue({ name: 'Study', targetMarkets: ['EU'], roles: [], data: {} }),
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
});
