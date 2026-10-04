import { assertNoProtocolBlockers } from './protocol-finding-state';

const finding = { severity: 'blocker', status: 'open' };
const queryFor = (issue: any) => jest.fn(async (sql: string) => ({ rows:
  sql.startsWith('select ps.id') ? [{ id: 'section', ai_generated: true, analysis_status: 'succeeded' }] : [issue] }));

describe('protocol completion with document links on current findings', () => {
  it.each(['satisfied', 'checking', 'failed', 'warning'])('allows completion for a linked %s result', async verification_status => {
    await expect(assertNoProtocolBlockers({ query: queryFor({ ...finding, attachment_id: 'file', verification_status }) } as any, 'project'))
      .resolves.toBeUndefined();
  });

  it.each([false, true])('refuses an unresolved blocker (document linked: %p)', async linked => {
    await expect(assertNoProtocolBlockers({ query: queryFor({ ...finding, attachment_id: linked ? 'file' : null, verification_status: 'blocker' }) } as any, 'project'))
      .rejects.toThrow('Resolve the protocol blockers');
  });

  it('does not let stale verification metadata suppress a finding whose attachment was removed', async () => {
    await expect(assertNoProtocolBlockers({ query: queryFor({ ...finding, attachment_id: null, verification_status: 'satisfied' }) } as any, 'project'))
      .rejects.toThrow('Resolve the protocol blockers');
  });

  it('requires successful section analysis while findings are replaced', async () => {
    const query = jest.fn(async () => ({ rows: [{ ai_generated: true, analysis_status: 'running' }] }));
    await expect(assertNoProtocolBlockers({ query } as any, 'project')).rejects.toThrow('Complete protocol section analysis');
  });
});
