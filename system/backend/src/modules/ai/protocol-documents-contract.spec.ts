import { AiService } from './ai.service';
import { logGenerateProtocolRequest } from '../../common/analysis-request-logger';

jest.mock('../../common/analysis-request-logger', () => ({ logGenerateProtocolRequest: jest.fn() }));

describe('protocol supporting document AI requests', () => {
  const document = { id: 'file', label: 'Appendix 4 - PMCF Plan', appendixNumber: 4, requirementIds: ['req-1'] };
  const scope = { requirements: [
    { id: 'req-1', title: 'PMCF', description: 'Follow-up', status: 'accepted' },
    { id: 'req-2', title: 'PMS', description: 'Monitoring plan', status: 'pending' },
  ] };
  const acceptedRequirements = [{ id: 'req-1', title: 'PMCF', description: 'Follow-up' }];

  it('sends accepted requirement IDs without attachment metadata in normal and streamed generation', async () => {
    const service = new AiService();
    const post = jest.spyOn(service as any, 'post').mockResolvedValue({});
    await service.generateProtocol({}, [], 'Synopsis', scope);
    expect(post).toHaveBeenCalledWith('/v1/ai/generate-protocol', expect.objectContaining({
      scope: expect.objectContaining({
        requirements: acceptedRequirements,
        findingRequirements: expect.stringContaining('req-1'),
      }),
    }), true);
    expect(post.mock.calls[0][1]).not.toHaveProperty('protocolDocuments');
    expect(logGenerateProtocolRequest).toHaveBeenCalledWith({
      endpoint: '/v1/ai/generate-protocol', request: post.mock.calls[0][1],
    });
    const fetch = jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response(JSON.stringify({
      type: 'result', data: { protocolId: 'CIP', sections: [{ id: '1', title: 'Design', content: 'Content', status: 'draft' }] },
    }) + '\n'));
    await service.generateProtocol({}, [], 'Synopsis', scope, () => {});
    const body = JSON.parse((fetch.mock.calls[0][1] as any).body);
    expect(logGenerateProtocolRequest).toHaveBeenLastCalledWith({
      endpoint: '/v1/ai/generate-protocol/stream', request: body,
    });
    expect(body).not.toHaveProperty('protocolDocuments');
    expect(body.scope.requirements).toEqual(acceptedRequirements);
    expect(body.scope.findingRequirements).toContain('req-1');
    expect(body.scope.findingRequirements).not.toContain('req-2');
  });

  it('sends extracted evidence with linked requirements on section analysis', async () => {
    const service = new AiService();
    const post = jest.spyOn(service as any, 'post').mockResolvedValue({});
    const evidence = { ...document, extractedText: 'PMCF follow-up schedule', extractionError: null };
    await service.analyzeSection('Design', 'CIP', [], '', '', [], null, [], '[]', '', [evidence]);
    expect(post).toHaveBeenCalledWith('/v1/ai/analyze-section', expect.objectContaining({ protocolDocuments: [evidence] }), true);
  });

  it.each([{}, { status: 'satisfied' }, { status: 'unknown', reason: 'Example' }])('rejects an invalid comparison response %p', async response => {
    const service = new AiService();
    jest.spyOn(service as any, 'post').mockResolvedValue(response);
    await expect(service.checkFindingDocument({ issue: {}, requirement: {}, section: {}, document }))
      .rejects.toThrow('invalid supporting document check');
  });
});
