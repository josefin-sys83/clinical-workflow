import { reconcileSectionIssues, sectionAnalysisHistory } from './protocol-analysis-history';

const original = { id: 'saved', requirementId: 'req', severity: 'blocker', description: 'Missing schedule',
  status: 'open', textQuote: 'Follow-up planned', raisedBy: 'AI Regulatory Review', raisedDate: '2026-10-01' };
const link = { attachmentId: 'document', label: 'Appendix 4 - Plan', status: 'failed', reason: 'Unavailable' };
const assessment = (outcome = 'not_fixed', overrides = {}) => ({ issue_id: 'saved', outcome,
  reason: 'Evidence reviewed', textQuote: null, ...overrides });

describe('section analysis reconciliation', () => {
  it.each(['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required'])(
    'sends previous unanswered findings of type %s', severity => {
      expect(sectionAnalysisHistory({ issues: [{ ...original, severity }] }, [
        { id: 'req', title: 'ISO 14155', status: 'accepted' },
      ]).previousDecisions).toEqual([expect.objectContaining({
        issue_id: 'saved', requirement: 'ISO 14155', severity, decision: 'UNANSWERED', textQuote: original.textQuote,
      })]);
    });

  it('sends human reasons and linked metadata separately, including unreadable/failed documents', () => {
    const section = { issues: [{ ...original, id: 'dismissed', status: 'resolved', wontFixReason: 'Accepted rationale' },
      { ...original, documentLink: link }] };
    const history = sectionAnalysisHistory(section, [{ id: 'req', title: 'ISO 14155', status: 'accepted' }]);
    expect(history.previousDecisions).toEqual([expect.objectContaining({ issue_id: 'dismissed', decision: 'WONT_FIX', reason: 'Accepted rationale' })]);
    expect(history.linkedIssues).toEqual([{
      issue_id: 'saved', requirement: 'ISO 14155', issue: original.description,
      supportingDocuments: [link.label],
    }]);
  });

  it('includes persisted review risk acceptances as human decisions', () => {
    const history = sectionAnalysisHistory({ issues: [original], riskAcceptances: [
      { description: original.description, reason: 'Reviewer decision' },
    ] }, []);
    expect(history.previousDecisions[0]).toMatchObject({ decision: 'WONT_FIX', reason: 'Reviewer decision' });
  });

  it('deletes only explicitly fixed findings and captures their resolution for auditing', () => {
    const result = reconcileSectionIssues({ issues: [original, { ...original, id: 'other', description: 'Another concern' }] }, {
      issues: [], previousIssueAssessments: [assessment('fixed')],
    });
    expect(result.issues.map(issue => issue.id)).toEqual(['other']);
    expect(result.resolvedIssues).toEqual([{ ...original, resolutionReason: 'Evidence reviewed' }]);
  });

  it.each(['not_fixed', 'not_evaluated'])('keeps %s findings and their quotes', outcome => {
    expect(reconcileSectionIssues({ issues: [original] }, { issues: [], previousIssueAssessments: [assessment(outcome)] }).issues).toEqual([original]);
  });

  it('does not infer fixes from an empty or legacy response', () => {
    expect(reconcileSectionIssues({ issues: [original] }, { issues: [] }).issues).toEqual([original]);
  });

  it('rejects a contradictory fixed assessment instead of deleting an unresolved finding', () => {
    expect(() => reconcileSectionIssues({ issues: [original] }, { issues: [{ ...original, id: 'i-1' }],
      previousIssueAssessments: [assessment('fixed')] })).toThrow('also raised the same finding');
  });

  it('matches reworded concerns while retaining their identity and origin', () => {
    const candidate = { ...original, description: 'Follow-up visits remain undefined', textQuote: 'New current quote', raisedDate: '2026-10-06' };
    const result = reconcileSectionIssues({ issues: [original] }, { issues: [candidate],
      previousIssueAssessments: [assessment('not_fixed', { textQuote: candidate.textQuote })] });
    expect(result.issues).toEqual([{ ...candidate, id: 'saved', raisedDate: original.raisedDate }]);
  });

  it('updates only the quote when an unresolved assessment has no full returned finding', () => {
    const result = reconcileSectionIssues({ issues: [original] }, {
      issues: [], previousIssueAssessments: [assessment('not_fixed', { textQuote: 'Current passage' })],
    });
    expect(result.issues).toEqual([{ ...original, textQuote: 'Current passage' }]);
    expect(result.resolvedIssues).toEqual([]);
  });

  it('keeps the assessment quote ahead of the full update quote', () => {
    const update = { ...original, description: 'Updated concern', textQuote: 'Update passage' };
    const result = reconcileSectionIssues({ issues: [original] }, {
      issues: [update], previousIssueAssessments: [assessment('not_fixed', { textQuote: 'Assessment passage' })],
    });
    expect(result.issues).toEqual([{ ...update, textQuote: 'Assessment passage' }]);
  });

  it.each([
    { description: 'Description edited during analysis' },
    { requirementId: 'different-requirement' },
  ])('preserves a finding changed during analysis instead of applying a stale fix: %p', changes => {
    const current = { ...original, ...changes };
    const result = reconcileSectionIssues({ issues: [current] }, {
      issues: [], previousIssueAssessments: [assessment('fixed')],
    }, [original]);
    expect(result.issues).toEqual([current]);
    expect(result.resolvedIssues).toEqual([]);
  });

  it('does not add a reworded AI update as a new finding after a concurrent human dismissal', () => {
    const current = { ...original, status: 'resolved', wontFixReason: 'Outside scope' };
    const update = { ...original, description: 'Reworded concern', textQuote: 'Updated passage' };
    const result = reconcileSectionIssues({ issues: [current] }, {
      issues: [update], previousIssueAssessments: [assessment()],
    }, [original]);
    expect(result.issues).toEqual([current]);
    expect(result.resolvedIssues).toEqual([]);
  });

  it.each(['checking', 'satisfied', 'warning', 'blocker', 'failed'])(
    'preserves links with verification status %s and suppresses every new issue for their requirement', status => {
      const linked = { ...original, documentLink: { ...link, status } };
      const result = reconcileSectionIssues({ issues: [linked] }, { issues: [
        { ...original, id: 'i-1', description: 'Different concern under linked requirement' },
        { ...original, id: 'i-2', requirementId: 'other', description: 'Unrelated concern' },
      ], previousIssueAssessments: [assessment('fixed')] });
      expect(result.issues[0]).toEqual(linked);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[1]).toMatchObject({ requirementId: 'other', description: 'Unrelated concern' });
    });

  it('preserves WONT_FIX decisions even if the AI proposes resolution or repeats the concern', () => {
    const dismissed = { ...original, status: 'resolved', wontFixReason: 'Human rationale' };
    expect(reconcileSectionIssues({ issues: [dismissed] }, { issues: [{ ...original, id: 'i-1' }],
      previousIssueAssessments: [assessment('fixed')] }).issues).toEqual([dismissed]);
  });

  it('keeps decisions made during the AI call and resumes analysis eligibility after unlink', () => {
    const linked = { ...original, documentLink: link };
    expect(reconcileSectionIssues({ issues: [linked] }, { issues: [], previousIssueAssessments: [assessment('fixed')] }, [original]).issues).toEqual([linked]);
    expect(reconcileSectionIssues({ issues: [original] }, { issues: [], previousIssueAssessments: [] }, [linked]).issues).toEqual([original]);
    expect(reconcileSectionIssues({ issues: [original] }, { issues: [], previousIssueAssessments: [assessment('fixed')] }, [original]).issues).toEqual([]);
  });

  it('keeps other unanswered findings under an excluded requirement', () => {
    const linked = { ...original, id: 'linked', documentLink: link };
    expect(reconcileSectionIssues({ issues: [linked, original] }, { issues: [],
      previousIssueAssessments: [assessment('fixed')] }).issues).toEqual([linked, original]);
  });

  it('does not attach a recycled provider ID to an unrelated saved finding', () => {
    const old = { ...original, id: 'i-1' };
    const result = reconcileSectionIssues({ issues: [old] }, { issues: [{ ...original, id: 'i-1', description: 'New distinct concern' }] });
    expect(result.issues).toHaveLength(2);
    expect(result.issues[1].id).not.toBe('i-1');
  });

  it('assigns distinct permanent IDs to new findings without IDs and skips duplicates', () => {
    const { id, ...fields } = original;
    const first = { ...fields, description: 'New schedule concern' };
    const second = { ...fields, description: 'New monitoring concern' };
    const result = reconcileSectionIssues({ issues: [original] }, { issues: [first, first, second] });
    expect(result.issues).toHaveLength(3);
    expect(result.issues[0]).toEqual(original);
    expect(result.issues[1]).toMatchObject(first);
    expect(result.issues[2]).toMatchObject(second);
    expect(result.issues[1].id).toMatch(/^finding-[0-9a-f-]{36}$/);
    expect(result.issues[2].id).toMatch(/^finding-[0-9a-f-]{36}$/);
    expect(result.issues[1].id).not.toBe(result.issues[2].id);
  });

  it('ignores response-generated IDs for new findings regardless of attribution', () => {
    const result = reconcileSectionIssues({ issues: [] }, { issues: [{
      ...original, id: 'response-local-id', raisedBy: 'Regulatory Review',
    }] });
    expect(result.issues[0].id).toMatch(/^finding-[0-9a-f-]{36}$/);
    expect(result.issues[0].id).not.toBe('response-local-id');
  });

  it.each([
    [assessment('fixed', { issue_id: 'unknown' })],
    [assessment(), assessment()],
  ])('rejects invalid assessment references or matches', (...assessments) => {
    expect(() => reconcileSectionIssues({ issues: [original] }, { issues: [], previousIssueAssessments: assessments }))
      .toThrow('invalid');
  });

  it.each(['fixed', 'not_evaluated'])('rejects an updated finding alongside a %s assessment', outcome => {
    expect(() => reconcileSectionIssues({ issues: [original] }, { issues: [original],
      previousIssueAssessments: [assessment(outcome)] })).toThrow('invalid match');
  });

  it('rejects an update that changes the saved requirement', () => {
    expect(() => reconcileSectionIssues({ issues: [original] }, {
      issues: [{ ...original, requirementId: 'other' }], previousIssueAssessments: [assessment()],
    })).toThrow('invalid match');
  });

  it('rejects duplicate updated entries for one saved issue ID', () => {
    expect(() => reconcileSectionIssues({ issues: [original] }, {
      issues: [original, { ...original, description: 'Reworded concern' }], previousIssueAssessments: [assessment()],
    })).toThrow('invalid match');
  });
});
