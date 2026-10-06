import { getPool } from '../../db/pg';
import { ProtocolFindingDocumentsService } from './protocol-finding-documents.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

describe('protocol finding document decisions', () => {
  const requirement = { id: 'req-1', title: 'PMCF', description: 'Follow-up plan', status: 'accepted' };
  const issue = { id: 'issue', requirementId: 'req-1', description: 'Missing plan', severity: 'blocker', status: 'open' };
  const document = { id: 'file', label: 'Appendix 4 - PMCF Plan', appendixNumber: 4, extractedText: 'Follow-up evidence' };
  const actor = { userId: 'reviewer', name: 'Reviewer' };
  let service: ProtocolFindingDocumentsService;
  let query: jest.Mock;
  let audit: any;
  let ai: any;
  let attachments: any;
  let verify: jest.SpyInstance;
  let existing: any;
  let locked: boolean;

  beforeEach(() => {
    existing = null; locked = false;
    query = jest.fn(async (sql: string, args: any[] = []) => {
      if (sql.startsWith('select data from projects')) return { rows: [{ data: { scope: { requirements: [requirement] } } }] };
      if (sql.includes('select 1 from workflow_step_state')) return { rows: locked ? [{ locked: true }] : [] };
      if (sql.startsWith('select i.id')) return { rows: [{ id: 'finding-row' }] };
      if (sql.startsWith('select pa.id')) return { rows: args[1] === 'file' ? [{ id: 'file', filename: 'PMCF Plan', appendix_number: 4 }] : [] };
      if (sql.startsWith('select d.*')) return { rows: existing ? [existing] : [] };
      if (sql.startsWith('update protocol_section_issue set verification_status=$4')) return { rows: existing?.verification_request_id === args[1] ? [{ id: 'decision' }] : [] };
      return { rows: [] };
    });
    const client = { query, release: jest.fn() };
    (getPool as jest.Mock).mockReturnValue({ query, connect: async () => client });
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    ai = { checkFindingDocument: jest.fn().mockResolvedValue({ status: 'satisfied', reason: 'Evidence is sufficient' }) };
    attachments = { supportingDocuments: jest.fn().mockResolvedValue([document]) };
    const protocols: any = { getByProject: jest.fn().mockResolvedValue({ sections: [{ id: '1', issues: [issue] }] }) };
    service = new ProtocolFindingDocumentsService(protocols, attachments, ai, audit);
    verify = jest.spyOn(service as any, 'verify').mockResolvedValue(undefined);
  });

  it('saves checking immediately, audits the actor/document, and starts verification after commit', async () => {
    await service.decide('project', '1', 'issue', 'document', actor, 'file');
    const insert = query.mock.calls.find(([sql]) => sql.startsWith("update protocol_section_issue set attachment_id=$2"))!;
    expect(insert[0]).toContain("'checking'");
    expect(insert[1][0]).toBe('finding-row');
    expect(insert[1][1]).toBe('file');
    expect(insert[1][3]).toBe('reviewer');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actor, type: 'protocol.finding.document.linked', metadata: expect.objectContaining({ requirementId: 'req-1' }) }), expect.anything());
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(verify).toHaveBeenCalledWith('project', insert[1][0], insert[1][2]);
  });

  it('rejects an attachment outside this project without creating a decision', async () => {
    await expect(service.decide('project', '1', 'issue', 'document', actor, 'foreign')).rejects.toThrow('not found in this project');
    expect(query.mock.calls.some(([sql]) => sql.startsWith("update protocol_section_issue set attachment_id=$2"))).toBe(false);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it.each(['document', 'unlink', 'risk_accepted'] as const)('refuses %s while out for signature or finalized', async action => {
    locked = true;
    await expect(service.decide('project', '1', 'issue', action, actor, 'file', 'Reason')).rejects.toThrow('locked');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each(['satisfied', 'warning', 'blocker', 'failed'])('records verification result %s, preserving the link on AI failure', async status => {
    verify.mockRestore();
    existing = { id: 'decision', attachment_id: 'file', requirement_id: 'req-1', verification_request_id: 'request',
      issue_key: 'issue', severity: 'blocker', description: 'Missing plan', section_key: '1', title: 'Follow-up', content: 'CIP section', data: { scope: { requirements: [requirement] } } };
    if (status === 'failed') ai.checkFindingDocument.mockRejectedValue(new Error('AI endpoint unavailable'));
    else ai.checkFindingDocument.mockResolvedValue({ status, reason: 'Document evidence assessed' });
    await (service as any).verify('project', 'decision', 'request');
    const update = query.mock.calls.find(([sql]) => sql.startsWith('update protocol_section_issue set verification_status=$4'))!;
    expect(update[1].slice(0, 4)).toEqual(['decision', 'request', 'file', status]);
    expect(query.mock.calls.some(([sql]) => sql.startsWith('delete from protocol_section_issue'))).toBe(false);
    expect(ai.checkFindingDocument).toHaveBeenCalledWith(expect.objectContaining({ document, requirement: expect.objectContaining({ id: 'req-1' }), issue: expect.objectContaining({ id: 'issue', requirementId: 'req-1', description: 'Missing plan' }) }), 'project');
  });

  it('ignores a late check when a newer request replaced the link', async () => {
    verify.mockRestore();
    existing = { attachment_id: 'file', requirement_id: 'req-1', verification_request_id: 'new-request',
      issue_key: 'issue', severity: 'blocker', description: 'Missing plan', data: { scope: { requirements: [requirement] } } };
    await (service as any).verify('project', 'decision', 'old-request');
    expect(audit.record).not.toHaveBeenCalled();
    const update = query.mock.calls.find(([sql]) => sql.startsWith('update protocol_section_issue set verification_status=$4'))!;
    expect(update[0]).toContain('verification_request_id=$2');
  });
});
