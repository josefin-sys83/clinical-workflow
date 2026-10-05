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
    const response = { issues: [], requiredElements: [], satisfiedRequirements: [] };
    const fetch = jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response(JSON.stringify(response)));
    const evidence = { name: document.label, content: 'PMCF follow-up schedule', requirement: 'PMCF' };
    await expect(service.analyzeSection('Design', 'CIP', [], '', '', [], null, [],
      [{ name: 'PMCF', description: 'Follow-up' }], [evidence])).resolves.toEqual(response);
    expect(JSON.parse((fetch.mock.calls[0][1] as any).body)).toEqual({
      sectionTitle: 'Design', sectionContent: 'CIP', targetMarkets: [], deviceCategory: '', intendedUse: '',
      requiredElements: [], amendmentContext: null, crossSectionContext: [],
      acceptedRequirements: [{ name: 'PMCF', description: 'Follow-up' }], protocolAttachments: [evidence],
    });
  });

  const check = {
    issue: { id: 'finding', description: 'Missing plan', severity: 'blocker' },
    requirement: { id: 'req-1', title: 'PMCF' }, section: { content: 'CIP' },
    document: { ...document, extractedText: 'PMCF follow-up schedule', extractionError: null },
  };

  it.each([
    ['resolves', 'satisfied'], ['partially_resolves', 'warning'], ['does_not_resolve', 'blocker'],
  ])('maps attachment outcome %s to the existing status %s', async (outcome, status) => {
    const service = new AiService();
    const fetch = jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response(JSON.stringify({
      outcome, explanation: 'Evidence assessed', sources: [{ document: document.label, evidence: 'Follow-up schedule' }],
    })));
    await expect(service.checkFindingDocument(check)).resolves.toEqual({ status, reason: 'Evidence assessed' });
    expect(fetch.mock.calls[0][0]).toBe('/v1/ai/check-protocol-attachments');
    expect(JSON.parse((fetch.mock.calls[0][1] as any).body)).toEqual({
      issue: 'Missing plan', requirement: 'PMCF',
      attachments: [{ name: document.label, content: 'PMCF follow-up schedule' }],
    });
  });

  it.each([{}, { status: 'satisfied' }, { outcome: 'unknown', explanation: 'Example', sources: [] },
    { outcome: 'resolves', explanation: 'Example', sources: [{ document: 'PMCF' }] },
  ])('rejects an invalid comparison response %p', async response => {
    const service = new AiService();
    jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response(JSON.stringify(response)));
    await expect(service.checkFindingDocument(check)).rejects.toThrow('invalid response for check-protocol-attachments');
  });

  it('propagates the attachment size limit without truncating evidence', async () => {
    const service = new AiService();
    const fetch = jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response(JSON.stringify({
      detail: 'Attachment exceeds the 24000 character analysis limit.',
    }), { status: 413 }));
    const content = 'x'.repeat(24001);
    await expect(service.checkFindingDocument({ ...check, document: { ...check.document, extractedText: content } }))
      .rejects.toMatchObject({ status: 413 });
    expect(JSON.parse((fetch.mock.calls[0][1] as any).body).attachments[0].content).toBe(content);
  });

  it('rejects malformed JSON from protocol analysis', async () => {
    const service = new AiService();
    jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response('invalid JSON'));
    await expect(service.analyzeSection('Design', 'CIP', [], '', '')).rejects.toThrow('malformed JSON');
  });

  it('sends only the documented required-elements context fields', async () => {
    const service = new AiService();
    const fetch = jest.spyOn(service as any, 'fetchAiService').mockResolvedValue(new Response('[]'));
    await service.generateRequiredElements('Design', ['EU'], 'SaMD', 'Monitoring');
    expect(JSON.parse((fetch.mock.calls[0][1] as any).body)).toEqual({
      sectionTitle: 'Design', targetMarkets: ['EU'], deviceCategory: 'SaMD', intendedUse: 'Monitoring',
    });
  });
});
