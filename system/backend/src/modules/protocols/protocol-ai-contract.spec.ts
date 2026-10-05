import { ProtocolsController } from './protocols.controller';
import { logAnalyzeSectionRequest } from '../../common/analysis-request-logger';

jest.mock('../../common/analysis-request-logger', () => ({ logAnalyzeSectionRequest: jest.fn() }));

describe('protocol section analysis API contract', () => {
  const requirements = [
    { id: 'req-1', title: 'Follow-up', description: 'Define follow-up visits.', status: 'accepted' },
    { id: 'req-2', title: 'Safety', description: 'Define safety monitoring.', status: 'accepted' },
    { id: 'req-3', title: 'Pending', description: 'Not accepted', status: 'suggested' },
  ];
  const section = {
    id: '1', title: 'Protocol Overview', content: 'Current section', amended: true, amendmentId: 'amendment',
    requiredElements: [{ id: 'element', name: 'Schedule', reference: 'Define visits.', status: 'missing', evidence: 'Old evidence' }],
  };
  const document = {
    id: 'file', label: 'Appendix 4 - PMCF Plan', filename: 'PMCF.docx', appendixNumber: 4,
    extractedText: 'Visits at 30 days and 3 months.', extractionError: null,
    requirementIds: ['req-1', 'req-2'], requirements: requirements.slice(0, 2),
  };
  let controller: ProtocolsController;
  let ai: any;
  let protocols: any;
  let attachments: any;
  let project: any;

  beforeEach(() => {
    jest.clearAllMocks();
    project = {
      id: 'project', targetMarkets: [], deviceCategory: 'SaMD', data: {
        synopsis: { text: 'Private synopsis' }, scope: { requirements },
        protocol: { sections: [section, { id: '2', title: 'Safety', content: 'Other section', locked: true }],
          amendments: [{ id: 'amendment', number: 1, title: 'Visits', reason: 'Clarification', description: 'Visit windows',
            protocolSnapshot: { '1': 'Entire old protocol' }, affectedProtocolSections: ['1'] }] },
      },
    };
    ai = { analyzeSection: jest.fn().mockResolvedValue({ issues: [], requiredElements: [], satisfiedRequirements: [] }) };
    protocols = { beginSectionAnalysis: jest.fn().mockResolvedValue({ section, requestId: 'request' }), finishSectionAnalysis: jest.fn() };
    attachments = { supportingDocuments: jest.fn().mockResolvedValue([
      document, { ...document, id: 'unlinked', requirements: [], requirementIds: [] },
      { ...document, id: 'unreadable', extractedText: '', extractionError: 'Unreadable PDF' },
    ]) };
    controller = new ProtocolsController({ get: jest.fn(async () => project) } as any,
      protocols, ai, {} as any, {} as any, { assertDocumentNotSigned: jest.fn(), assertProtocolEditable: jest.fn() } as any, attachments);
  });

  const analyze = (controller: ProtocolsController) => controller.analyzeSection('project', {
    sectionId: '1', sectionTitle: section.title, sectionContent: section.content,
  });

  it('sends only contract fields and logs the same request, with one attachment link per requirement', async () => {
    await analyze(controller);
    const args = ai.analyzeSection.mock.calls[0];
    expect(args).toHaveLength(10);
    expect(args[5]).toEqual([{ id: 'element', name: 'Schedule', reference: 'Define visits.' }]);
    expect(args[6]).toEqual({ number: 1, title: 'Visits', reason: 'Clarification', description: 'Visit windows' });
    expect(args[7]).toEqual([{ title: 'Safety', content: 'Other section' }]);
    expect(args[8]).toEqual(requirements.slice(0, 2).map(r => ({ name: r.title, description: r.description })));
    expect(args[9]).toEqual(['Follow-up', 'Safety'].map(requirement => ({
      name: document.label, content: document.extractedText, requirement,
    })));
    expect(logAnalyzeSectionRequest).toHaveBeenCalledWith(expect.objectContaining({ request: {
      sectionTitle: args[0], sectionContent: args[1], targetMarkets: args[2], deviceCategory: args[3], intendedUse: args[4],
      requiredElements: args[5], amendmentContext: args[6], crossSectionContext: args[7],
      acceptedRequirements: args[8], protocolAttachments: args[9],
    } }));
  });

  it.each([
    ['Follow-up', 'req-1'], ['Define follow-up visits.', 'req-1'], ['Unknown source', null], [null, null],
  ])('maps the documented source %p to an internal requirement link %p', async (source, requirementId) => {
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', source }], requiredElements: [], satisfiedRequirements: [] });
    const result = await analyze(controller);
    expect(result.issues[0].requirementId).toBe(requirementId);
    expect(protocols.finishSectionAnalysis).toHaveBeenCalledWith('project', '1', 'request', result, null, undefined);
  });

  it('keeps ambiguous sources unlinked', async () => {
    project.data.scope.requirements = [...requirements, { ...requirements[0], id: 'duplicate' }];
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', source: 'Follow-up' }] });
    expect((await analyze(controller)).issues[0].requirementId).toBeNull();
  });

  it('keeps saved content intact and records a failed analysis when the AI rejects the request', async () => {
    ai.analyzeSection.mockRejectedValue(new Error('Attachment exceeds the 24000 character analysis limit.'));
    await expect(analyze(controller)).rejects.toThrow('24000 character');
    expect(project.data.protocol.sections[0].content).toBe(section.content);
    expect(protocols.finishSectionAnalysis).toHaveBeenCalledWith('project', '1', 'request', null,
      'Attachment exceeds the 24000 character analysis limit.', undefined);
  });
});
