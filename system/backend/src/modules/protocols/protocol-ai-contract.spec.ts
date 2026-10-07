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
    expect(args).toHaveLength(13);
    expect(args[10]).toBe('project');
    expect(args[5]).toEqual([{ id: 'element', name: 'Schedule', reference: 'Define visits.' }]);
    expect(args[6]).toEqual({ number: 1, title: 'Visits', reason: 'Clarification', description: 'Visit windows' });
    expect(args[7]).toEqual([{ title: 'Safety', content: 'Other section' }]);
    expect(args[8]).toEqual(requirements.slice(0, 2).map(r => ({ name: r.title, description: r.description })));
    expect(args[9]).toEqual(['Follow-up', 'Safety'].map(requirement => ({
      name: document.label, content: document.extractedText, requirement,
    })));
    expect(logAnalyzeSectionRequest).toHaveBeenCalledWith(expect.objectContaining({ request: {
      projectId: 'project',
      sectionTitle: args[0], sectionContent: args[1], targetMarkets: args[2], deviceCategory: args[3], intendedUse: args[4],
      requiredElements: args[5], amendmentContext: args[6], crossSectionContext: args[7],
      acceptedRequirements: args[8], protocolAttachments: args[9],
      previousDecisions: [], linkedIssues: [],
    } }));
  });

  it.each([
    ['Follow-up', 'req-1'], ['Safety', 'req-2'], ['Define follow-up visits.', null],
    ['Unknown requirement', null], ['Pending', null], ['follow-up', null], [null, null],
  ])('maps the explicit requirement name %p to an internal requirement link %p', async (requirement, requirementId) => {
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', requirement, source: null }], requiredElements: [], satisfiedRequirements: [] });
    const result = await analyze(controller);
    expect(result.issues[0].requirementId).toBe(requirementId);
    expect(protocols.finishSectionAnalysis).toHaveBeenCalledWith('project', '1', 'request', result, null, undefined, []);
  });

  it('uses saved history, sends links even without readable evidence, and suppresses new issues for their entire requirement', async () => {
    const saved = { ...section, title: 'Saved title', issues: [
      { id: 'linked', requirementId: 'req-1', severity: 'blocker', description: 'Missing plan',
        documentLink: { attachmentId: 'unreadable', label: 'Appendix 5 - Plan', status: 'failed' } },
      { id: 'dismissed', requirementId: 'req-2', severity: 'warning', description: 'Human decision', status: 'resolved', wontFixReason: 'Outside scope' },
      ...['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required'].map(severity => ({
        id: severity, severity, requirementId: 'req-2', description: `Previous ${severity}`, status: 'open', textQuote: 'Current section',
      })),
    ] };
    protocols.beginSectionAnalysis.mockResolvedValue({ section: saved, requestId: 'request' });
    protocols.finishSectionAnalysis.mockResolvedValue(saved);
    attachments.supportingDocuments.mockResolvedValue([{ ...document, extractedText: '', extractionError: 'Unreadable' }]);
    ai.analyzeSection.mockResolvedValue({ issues: [
      { id: 'i-1', requirement: 'Follow-up', description: 'A different concern about the linked requirement' },
      { id: 'i-2', requirement: 'Safety', description: 'Unrelated concern' },
    ], requiredElements: [], satisfiedRequirements: [] });
    const result = await analyze(controller);
    const args = ai.analyzeSection.mock.calls[0];
    expect(args[0]).toBe('Saved title');
    expect(args[9]).toEqual([]);
    expect(args[11]).toHaveLength(6);
    expect(args[11][0]).toMatchObject({ issue_id: 'dismissed', decision: 'WONT_FIX', reason: 'Outside scope' });
    expect(args[11].slice(1).map(decision => decision.decision)).toEqual(Array(5).fill('UNANSWERED'));
    expect(args[12]).toEqual([{
      issue_id: 'linked', requirement: 'Follow-up', issue: 'Missing plan',
      supportingDocuments: ['Appendix 5 - Plan'],
    }]);
    expect(logAnalyzeSectionRequest).toHaveBeenLastCalledWith(expect.objectContaining({
      request: expect.objectContaining({ projectId: 'project', previousDecisions: args[11], linkedIssues: args[12] }),
    }));
    expect(protocols.finishSectionAnalysis.mock.calls[0][3].issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'i-2', requirementId: 'req-2' }),
    ]));
    expect(protocols.finishSectionAnalysis.mock.calls[0][3].issues.some(issue => issue.requirementId === 'req-1')).toBe(false);
    expect(protocols.finishSectionAnalysis.mock.calls[0][6]).toEqual(saved.issues);
    expect(result.issues).toEqual(saved.issues);
  });

  it('keeps ambiguous requirement names unlinked', async () => {
    project.data.scope.requirements = [...requirements, { ...requirements[0], id: 'duplicate' }];
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', requirement: 'Follow-up', source: null }] });
    expect((await analyze(controller)).issues[0].requirementId).toBeNull();
  });

  it('uses the requirement name when source refers to another accepted requirement', async () => {
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', requirement: 'Follow-up', source: 'Safety' }] });
    const result = await analyze(controller);
    expect(result.issues[0]).toMatchObject({ requirementId: 'req-1', source: 'Safety' });
  });

  it('does not infer a requirement from source when requirement is null', async () => {
    ai.analyzeSection.mockResolvedValue({ issues: [{ id: 'finding', requirement: null, source: 'Follow-up' }] });
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
