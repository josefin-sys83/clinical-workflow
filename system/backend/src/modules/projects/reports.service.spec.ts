import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { sanitizeIncomingProjectData } from '../../common/sanitize-section-html';
import { ReportsService } from './reports.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

const actor = { userId: '10000000-0000-4000-8000-000000000001', name: 'Reviewer' };

describe('relational reports', () => {
  let service: ReportsService;
  let query: jest.Mock;
  let release: jest.Mock;
  let audit: { record: jest.Mock };
  let client: any;
  beforeEach(() => {
    query = jest.fn(async (sql: string) => {
      if (sql.startsWith('select id from projects')) return { rows: [{ id: 'project' }] };
      if (sql.startsWith('insert into report(')) return { rows: [{ id: 'report' }] };
      if (sql.startsWith('insert into report_section(')) return { rows: [{ id: 'section' }] };
      return { rows: [] };
    });
    release = jest.fn(); client = { query, release };
    (getPool as jest.Mock).mockReturnValue({ connect: async () => client, query });
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ReportsService(audit as any);
  });

  it('sanitizes a saved suggestion without accepting it as report content', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    await service.updateSections('project', { safety: { aiDraft: '<p>Draft</p><script>bad()</script>' } }, actor);
    const [sql, values] = query.mock.calls.find(([sql]) => sql.startsWith('update report_section set'))!;
    expect(sql).toContain('ai_draft=');
    expect(sql).not.toContain('content=');
    expect(values).toContain('<p>Draft</p>');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actor, projectId: 'project' }), client);
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(release).toHaveBeenCalled();
  });

  it('rolls back a report write if its audit cannot be stored', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    audit.record.mockRejectedValue(new Error('audit unavailable'));
    await expect(service.updateSections('project', { safety: { content: 'Edited' } }, actor)).rejects.toThrow('audit unavailable');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
  });

  it('preserves content saved while bulk AI generation was running', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select content, ai_draft')) return { rows: [{ content: '<p>New author edit</p>' }] };
      if (sql.startsWith('select id from projects') || sql.startsWith('insert into')) return { rows: [{ id: 'row' }] };
      return { rows: [] };
    });
    await service.updateSections('project', { safety: { content: '<p>AI result</p>' } }, actor, [], true);
    expect(query.mock.calls.some(([sql]) => sql.startsWith('update report_section set'))).toBe(false);
  });

  it('checks the report lock inside the write transaction', async () => {
    query.mockImplementation(async (sql: string) => ({ rows: sql.includes('workflow_step_state') || sql.startsWith('select id from projects') ? [{ id: 'locked' }] : [] }));
    await expect(service.updateSections('project', { safety: { content: 'Edited' } }, actor)).rejects.toThrow(ForbiddenException);
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('insert into report_section('), expect.anything());
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects unknown fields rather than dropping them or storing a JSON blob', async () => {
    await expect(service.updateSections('project', { safety: { metadata: { content: 'hidden' } } }, actor)).rejects.toThrow(BadRequestException);
    expect(query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('records consistency decisions using the authenticated actor in the same transaction', async () => {
    await service.dismissConsistency('project', ['finding-a', 'finding-a'], actor);
    const inserts = query.mock.calls.filter(([sql]) => sql.startsWith('insert into report_cross_consistency_dismissal'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1]).toEqual(['report', 'finding-a', actor.userId]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actor, type: 'report.consistency.dismissed' }), client);
  });

  it('does not allow project JSON to bypass report and signature endpoints', () => {
    expect(() => sanitizeIncomingProjectData({ report: { sections: {} } })).toThrow(BadRequestException);
    expect(() => sanitizeIncomingProjectData({ signatures: [] })).toThrow(BadRequestException);
    expect(sanitizeIncomingProjectData({ scope: { title: 'Scope' } })).toEqual({ scope: { title: 'Scope' } });
  });

  it('returns saved evidence and nested comments from relational rows', async () => {
    const rows: Record<string, any[]> = {
      report_section_comment: [
        { id: 'parent', section_id: 'section', comment_key: 'c1', parent_comment_id: null, author_name: 'Writer', content: 'Comment', position: 1 },
        { id: 'reply', section_id: 'section', comment_key: 'c2', parent_comment_id: 'parent', author_name: 'Reviewer', content: 'Reply', position: 1 },
      ],
      report_section_completeness_element: [{ section_id: 'section', element_key: 'e1', title: 'Evidence', requirement_reference: 'Requirement 1', status: 'verified' }],
    };
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select * from report where')) return { rows: [{ id: 'report', version: '2', cross_consistency_checked: true }] };
      if (sql.startsWith('select * from report_section where')) return { rows: [{ id: 'section', section_key: 'safety', position: 1, title: 'Safety', status: 'approved', content: 'Saved', ai_draft: null }] };
      for (const [table, data] of Object.entries(rows)) if (sql.includes(`from ${table} c`)) return { rows: data };
      return { rows: [] };
    });
    const report = await service.getByProject('project');
    expect(report.sections.safety.content).toBe('Saved');
    expect(report.sections.safety.comments[0].replies[0].text).toBe('Reply');
    expect(report.sections.safety.completenessElements[0].isoReference).toBe('Requirement 1');
    expect(report.crossConsistencyChecked).toBe(true);
    expect(query.mock.calls.every(([sql]) => !sql.includes('projects.data'))).toBe(true);
  });

  it('keeps absent content distinct from deliberately cleared content in API JSON', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select * from report where')) return { rows: [{ id: 'report' }] };
      if (sql.startsWith('select * from report_section where')) return { rows: [
        { id: 'missing', section_key: 'section-2', title: 'section-2', position: 3, content: null },
        { id: 'cleared', section_key: 'section-3', title: 'section-3', position: 2, content: '' },
      ] };
      return { rows: [] };
    });
    const report = JSON.parse(JSON.stringify(await service.getByProject('project')));
    expect(report.sections['section-2']).not.toHaveProperty('content');
    expect(report.sections['section-3'].content).toBe('');
    expect(Object.keys(report.sections)).toEqual(['section-2', 'section-3']);
    expect(report.sections['section-2']).toMatchObject({ title: 'Introduction and Background', number: '2', order: 2 });
    expect(report.sections['section-3'].order).toBe(3);
  });

  it('creates section metadata from definitions even if section 3 saves before section 2', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    await service.updateSections('project', { 'section-3': { issues: [] }, 'section-2': { issues: [] } }, actor);
    const inserts = query.mock.calls.filter(([sql]) => sql.startsWith('insert into report_section('));
    expect(inserts[0][1]).toEqual(['report', 'section-3', 'Objectives and Endpoints', 3, '3', actor.userId]);
    expect(inserts[1][1]).toEqual(['report', 'section-2', 'Introduction and Background', 2, '2', actor.userId]);
    const updates = query.mock.calls.filter(([sql]) => sql.startsWith('update report_section set'));
    expect(updates.every(([sql]) => !sql.includes('content='))).toBe(true);
  });

  it('returns null without loading sections when the report does not exist', async () => {
    expect(await service.getByProject('missing')).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('keeps children isolated by section and maps report-wide findings', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select * from report where')) return { rows: [{ id: 'report', version: '1.0' }] };
      if (sql.startsWith('select * from report_section where')) return { rows: [
        { id: 'a', section_key: 'section-1', title: 'Custom summary', position: 2, helper_text: null },
        { id: 'b', section_key: 'custom', title: 'Custom', position: 1, helper_text: '' },
      ] };
      if (sql.includes('from report_section_comment c')) return { rows: [
        { id: 'root', section_id: 'a', comment_key: 'public-root', parent_comment_id: null, position: 2, content: 'Root' },
        { id: 'reply', section_id: 'a', comment_key: 'public-reply', parent_comment_id: 'root', position: 3, content: 'Reply' },
        { id: 'nested', section_id: 'a', comment_key: 'public-nested', parent_comment_id: 'reply', position: 4, content: 'Nested reply' },
        { id: 'other', section_id: 'b', comment_key: 'public-other', parent_comment_id: null, position: 1, content: 'Other section' },
      ] };
      if (sql.includes('from report_section_issue c')) return { rows: [
        { section_id: 'a', issue_key: 'later', position: 2 },
        { section_id: 'a', issue_key: 'first', position: 1, raised_date: new Date('2026-09-12T00:00:00Z') },
      ] };
      if (sql.startsWith('select * from report_cross_consistency_issue')) return { rows: [
        { protocol_section_title: 'Protocol', report_section_title: 'Report', description: 'Mismatch', severity: 'warning' },
      ] };
      if (sql.startsWith('select finding_key')) return { rows: [{ finding_key: 'dismissed' }] };
      return { rows: [] };
    });
    const report = await service.getByProject('project');
    expect(Object.keys(report.sections)).toEqual(['custom', 'section-1']);
    const summary = report.sections['section-1'];
    expect(summary.title).toBe('Custom summary');
    expect(summary).not.toHaveProperty('helperText');
    expect(report.sections.custom.helperText).toBe('');
    expect(summary.comments).toHaveLength(1);
    expect(summary.comments[0].replies[0].replies[0].id).toBe('public-nested');
    expect(report.sections.custom.comments[0].text).toBe('Other section');
    expect(summary.issues.map((issue: any) => issue.id)).toEqual(['first', 'later']);
    expect(summary.issues[0].raisedDate).toBe('2026-09-12');
    expect(report.crossConsistencyIssues).toEqual([{ section1: 'Protocol', section2: 'Report', description: 'Mismatch', severity: 'warning' }]);
    expect(report.wontFixCrossConsistencyIssues).toEqual(['dismissed']);
  });

  it('keeps SQL placeholders aligned and audits the original dismissal decisions', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    await service.updateSections('project', { safety: {
      title: 'Safety', content: '<p>Saved</p><script>bad()</script>', state: 'draft', userEdited: true,
      issues: [{ id: 'issue', severity: 'info', message: 'Legacy description' }],
      wontFixIssues: ['Not applicable', 'Not applicable'],
    } }, actor);
    const [sql, values] = query.mock.calls.find(([sql]) => sql.startsWith('update report_section set'))!;
    expect(sql).toBe('update report_section set updated_at=now(),updated_by_user_id=$2,title=$3,content=$4,status=$5,user_edited=$6 where id=$1');
    expect(values).toEqual(['section', actor.userId, 'Safety', '<p>Saved</p>', 'draft', true]);
    const issueInsert = query.mock.calls.find(([sql]) => sql.startsWith('insert into report_section_issue('))!;
    expect(issueInsert[1]).toEqual(['section', 'issue', 1, 'info', undefined, undefined, 'Legacy description', undefined, undefined, null, 'open', undefined, undefined]);
    expect(query.mock.calls.filter(([sql]) => sql.startsWith('insert into report_section_issue_dismissal'))).toHaveLength(1);
    expect(audit.record.mock.calls[0][0].metadata.dismissedDescriptions).toEqual(['Not applicable', 'Not applicable']);
  });

  it('preserves an unchanged verifier and uses the current user for changed verification', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: {} });
    const oldDate = new Date('2020-01-01T00:00:00Z');
    const originalQuery = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, values: any[]) => {
      if (sql.startsWith('select * from report_section_completeness_element')) return { rows: [
        { element_key: 'same', title: 'Same', requirement_reference: null, status: 'verified', verified_by_user_id: 'old-user', verified_by_name: 'Old reviewer', verified_by_email: 'old@example.com', verified_by_role: 'old-role', verified_at: oldDate },
      ] };
      if (sql.startsWith('select id,name,email from users')) return { rows: [{ id: actor.userId, name: 'Current', email: 'current@example.com' }] };
      return originalQuery(sql, values);
    });
    await service.updateSections('project', { safety: { completenessElements: [
      { id: 'same', title: 'Same', status: 'verified' },
      { id: 'changed', title: 'Changed', status: 'partially-covered' },
      { id: 'unverified', title: 'Unverified', status: 'not-yet-verified' },
    ] } }, { ...actor, role: 'reviewer' });
    const inserts = query.mock.calls.filter(([sql]) => sql.startsWith('insert into report_section_completeness_element'));
    expect(inserts[0][1].slice(6, 11)).toEqual(['old-user', 'Old reviewer', 'old@example.com', 'old-role', oldDate]);
    expect(inserts[1][1].slice(6, 11)).toEqual([actor.userId, 'Current', 'current@example.com', 'reviewer', expect.any(Date)]);
    expect(inserts[2][1].slice(6, 11)).toEqual([undefined, undefined, undefined, 'reviewer', null]);
    expect(query.mock.calls.filter(([sql]) => sql.startsWith('select id,name,email from users'))).toHaveLength(1);
  });

  it('resolves reply keys to database IDs and uses the authenticated author', async () => {
    const comments = [{ id: 'public', text: 'Reply', replies: [] }];
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: { safety: { comments } } });
    const originalQuery = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, values: any[]) => {
      if (sql.startsWith('select id from report_section where')) return { rows: [{ id: 'section' }] };
      if (sql.startsWith('select id,name,email from users')) return { rows: [{ id: actor.userId, name: 'Trusted', email: 'trusted@example.com' }] };
      if (sql.startsWith('select id from report_section_comment')) return { rows: [{ id: 'parent-db-id' }] };
      return originalQuery(sql, values);
    });
    const result = await service.addComment('project', 'safety', { content: '  Reply  ', parentCommentKey: 'parent-public-key' }, { ...actor, roles: ['reviewer'] });
    const insert = query.mock.calls.find(([sql]) => sql.startsWith('insert into report_section_comment'))!;
    expect(insert[1]).toEqual(['section', expect.any(String), actor.userId, 'Trusted', 'trusted@example.com', 'reviewer', 'Reply', 'general', 'parent-db-id']);
    expect(result).toBe(comments);
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });
});
