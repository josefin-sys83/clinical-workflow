import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { getPool } from '../../db/pg';
import { ProtocolsService } from './protocols.service';
import { ProtocolAttachmentsService } from './protocol-attachments.service';
import { ProtocolFindingDocumentsService } from './protocol-finding-documents.service';
import { assertNoProtocolBlockers } from './protocol-finding-state';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));
const connectionString = process.env.PROTOCOL_DOCUMENTS_TEST_DATABASE_URL;
const databaseTests = connectionString ? describe : describe.skip;
const migrations = resolve(__dirname, '../../../db/migrations');
const migration = (name: string) => readFileSync(resolve(migrations, name), 'utf8');

databaseTests('supporting documents in PostgreSQL', () => {
  const schema = `protocol_documents_${randomUUID().replace(/-/g, '')}`;
  const projectId = randomUUID();
  const actor = { userId: randomUUID(), name: 'Reviewer' };
  const attachmentId = randomUUID();
  let admin: Pool;
  let pool: Pool;
  let protocols: ProtocolsService;
  let attachments: ProtocolAttachmentsService;
  let documents: ProtocolFindingDocumentsService;
  let audit: any;
  let verifier: jest.SpyInstance;

  beforeAll(async () => {
    admin = new Pool({ connectionString });
    await admin.query(`create schema ${schema}`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema},public` });
    (getPool as jest.Mock).mockReturnValue(pool);
    await pool.query(`
      create table users(id uuid primary key,name text,email text);
      create table projects(id uuid primary key,data jsonb,updated_at timestamptz default now());
      create table project_members(project_id uuid,user_id uuid,role_title text);
      create table workflow_step_state(project_id uuid,step_id text,state text);
      create table document_artifact(project_id uuid,doc_type text);
      create table report(id uuid primary key,project_id uuid);
      create table report_section(id uuid primary key,report_id uuid);
      create table report_section_issue(id uuid primary key,section_id uuid);
      create table standards(id integer generated always as identity primary key,code text,title text);
      create table standard_rules(standard_id integer,always_applies boolean);
      create table project_standards(project_id uuid,standard_id integer not null,created_at timestamptz default now(),primary key(project_id,standard_id));
    `);
    // Use the real existing protocol definitions and the protocol decision migration.
    const tables = migration('023_normalize_protocol.sql').match(/create table if not exists [\s\S]*?\n\);/g)!;
    for (const table of tables) await pool.query(table);
    await pool.query(migration('022_protocol_attachments.sql').match(/create table if not exists protocol_attachment \([\s\S]*?\n\);/)![0]
      .replace(/project_id/g, 'protocol_id').replace('references projects(id)', 'references protocol(id)')
      .replace('uploaded_by_user_id text', 'uploaded_by_user_id uuid references users(id)'));
    for (const name of ['029_section_analysis_state.sql', '030_protocol_ai_issue_metadata.sql', '031_protocol_issue_severity_constraint.sql', '032_finding_requirement_id.sql', '033_protocol_supporting_documents.sql', '034_protocol_section_revision.sql', '036_protocol_risk_acceptance.sql', '037_protocol_wont_fix_reason.sql', '038_protocol_satisfied_requirements.sql']) {
      await pool.query(migration(name));
    }
    await pool.query('insert into users(id,name) values($1,$2)', [actor.userId, actor.name]);
    await pool.query('insert into projects(id,data) values($1,$2)', [projectId, { scope: { requirements: [{ id: 'req-1', title: 'PMCF Plan', status: 'accepted' }] } }]);
    await pool.query('insert into project_members values($1,$2,$3)', [projectId, actor.userId, 'Protocol Lead']);
    const protocol = await pool.query('insert into protocol(project_id) values($1) returning id', [projectId]);
    const section = await pool.query("insert into protocol_section(protocol_id,section_key,position,title,content) values($1,'1',1,'Follow-up','<p>CIP</p>') returning id", [protocol.rows[0].id]);
    await pool.query("insert into protocol_section_issue(section_id,issue_key,severity,description,requirement_id) values($1,'i-1','blocker','Missing PMCF Plan','req-1')", [section.rows[0].id]);
    await pool.query(`insert into protocol_attachment(id,protocol_id,appendix_number,filename,mime_type,bytes,uploaded_by_name,uploaded_at)
      values($1,$2,4,'PMCF Plan v2.1.txt','text/plain',$3,'Reviewer',now())`, [attachmentId, protocol.rows[0].id, Buffer.from('PMCF follow-up schedule and monitoring')]);
    await pool.query(migration('039_project_requirements.sql'));
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    protocols = new ProtocolsService(audit);
    attachments = new ProtocolAttachmentsService(audit);
    documents = new ProtocolFindingDocumentsService(protocols, attachments, {
      checkFindingDocument: jest.fn().mockResolvedValue({ status: 'satisfied', reason: 'The plan contains follow-up evidence' }),
    } as any, audit);
    verifier = jest.spyOn(documents as any, 'verify').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
  });

  it('preserves finding identity and links through edits/reanalysis and retains human decisions', async () => {
    await attachments.updateRequirements(projectId, attachmentId, ['req-1'], actor);
    const linked = await documents.decide(projectId, '1', 'i-1', 'document', actor, attachmentId);
    expect(linked.sections[0].issues[0].documentLink).toMatchObject({ attachmentId, status: 'checking', decidedByUserId: actor.userId });
    const finding = (await pool.query('select * from protocol_section_issue where attachment_id=$1', [attachmentId])).rows[0];
    expect(finding.document_linked_at).toBeInstanceOf(Date);
    await attachments.updateRequirements(projectId, attachmentId, [], actor);
    expect((await attachments.supportingDocuments(projectId))[0].requirementIds).toEqual(['req-1']);
    verifier.mockRestore();
    await (documents as any).verify(projectId, finding.id, finding.verification_request_id, actor);
    expect((await protocols.getByProject(projectId)).sections[0].issues[0].documentLink.status).toBe('satisfied');
    await expect(assertNoProtocolBlockers(pool, projectId)).resolves.toBeUndefined();
    const unlinked = await documents.decide(projectId, '1', 'i-1', 'unlink', actor);
    expect(unlinked.sections[0].issues[0]).toMatchObject({ severity: 'blocker', description: 'Missing PMCF Plan' });
    expect(unlinked.sections[0].issues[0]).not.toHaveProperty('documentLink');
    await expect(assertNoProtocolBlockers(pool, projectId)).rejects.toThrow('Resolve the protocol blockers');
    verifier = jest.spyOn(documents as any, 'verify').mockResolvedValue(undefined);
    await documents.decide(projectId, '1', 'i-1', 'document', actor, attachmentId);
    const pending = (await pool.query('select id,verification_request_id from protocol_section_issue')).rows[0];

    const edited = await protocols.updateSection(projectId, '1', { content: '<p>Edited CIP</p>', reason: 'Clarification' }, actor);
    const analysis = await protocols.beginSectionAnalysis(projectId, '1', edited.content, actor);
    await protocols.finishSectionAnalysis(projectId, '1', analysis.requestId, {
      issues: [{ id: 'i-1', severity: 'blocker', status: 'open', requirementId: 'req-1', description: 'Missing PMCF Plan' }],
    }, null, actor);
    const preserved = (await protocols.getByProject(projectId)).sections[0].issues[0];
    expect(preserved.documentLink).toMatchObject({ attachmentId, status: 'checking' });
    expect((await attachments.supportingDocuments(projectId))[0].requirementIds).toEqual(['req-1']);
    expect((await pool.query('select id from protocol_section_issue')).rows[0].id).toBe(pending.id);
    // A pending assessment still belongs to the same surviving link after editing.
    verifier.mockRestore();
    await (documents as any).verify(projectId, pending.id, pending.verification_request_id, actor);
    expect((await protocols.getByProject(projectId)).sections[0].issues[0].documentLink.status).toBe('satisfied');
    verifier = jest.spyOn(documents as any, 'verify').mockResolvedValue(undefined);
    await documents.decide(projectId, '1', 'i-1', 'document', actor, attachmentId);
    await protocols.updateAtomic(projectId, current => ({ ...current, sections: current.sections.map((section: any) => ({ ...section, content: '<p>Regenerated CIP</p>', issues: [] })) }), actor);
    expect((await protocols.getByProject(projectId)).sections[0].issues).toEqual([]);
    await protocols.updateAtomic(projectId, current => ({ ...current, sections: current.sections.map((section: any) => ({ ...section,
      issues: [{ id: 'i-2', severity: 'blocker', status: 'open', requirementId: 'req-1', description: 'Missing PMCF Plan' }],
    })) }), actor);
    await documents.decide(projectId, '1', 'i-2', 'risk_accepted', actor, undefined, 'Addressed during follow-up');
    expect((await protocols.getByProject(projectId)).sections[0].issues[0].status).toBe('resolved');
    const review = await protocols.beginSectionAnalysis(projectId, '1', '<p>Regenerated CIP</p>', actor);
    await protocols.finishSectionAnalysis(projectId, '1', review.requestId, {
      issues: [{ id: 'i-2', severity: 'blocker', status: 'open', requirementId: 'req-1', description: 'Missing PMCF Plan' }],
    }, null, actor);
    expect((await protocols.getByProject(projectId)).sections[0].issues[0]).toMatchObject({
      status: 'resolved', wontFixReason: 'Addressed during follow-up',
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'protocol.finding.document.unlinked', actor }), expect.anything());
  });

  it('preserves unanswered findings on failure and deletes explicit fixes with an audit snapshot', async () => {
    const previous = { id: 'unanswered', severity: 'warning', status: 'open', requirementId: 'req-1',
      description: 'Visit schedule is missing', textQuote: 'Regenerated CIP', raisedBy: 'AI Regulatory Review', raisedDate: '2026-10-01' };
    await protocols.updateAtomic(projectId, current => ({ ...current, sections: current.sections.map((section: any) => ({
      ...section, issues: [...section.issues, previous],
    })) }), actor);
    const row = (await pool.query("select id from protocol_section_issue where issue_key='unanswered'")).rows[0];
    const failed = await protocols.beginSectionAnalysis(projectId, '1', '<p>Regenerated CIP</p>', actor);
    await protocols.finishSectionAnalysis(projectId, '1', failed.requestId, null, 'Provider unavailable', actor);
    expect((await protocols.getByProject(projectId)).sections[0].issues).toContainEqual(expect.objectContaining(previous));
    expect((await pool.query("select id from protocol_section_issue where issue_key='unanswered'")).rows[0].id).toBe(row.id);
    const success = await protocols.beginSectionAnalysis(projectId, '1', '<p>Regenerated CIP</p>', actor);
    await protocols.finishSectionAnalysis(projectId, '1', success.requestId, {
      issues: [], previousIssueAssessments: [{ issue_id: 'unanswered', outcome: 'fixed',
        reason: 'Current evidence includes the schedule', textQuote: null }],
    }, null, actor, success.section.issues);
    expect((await pool.query("select id from protocol_section_issue where issue_key='unanswered'")).rows).toEqual([]);
    expect((await protocols.getByProject(projectId)).sections[0].issues[0]).toMatchObject({ status: 'resolved', wontFixReason: 'Addressed during follow-up' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      type: 'protocol.section.analyzed', actor, metadata: expect.objectContaining({
        resolvedIssues: [expect.objectContaining({ ...previous, resolutionReason: 'Current evidence includes the schedule' })],
      }),
    }), expect.anything());
  });

  it('persists satisfied evidence across reloads and focused edits, replaces it on success, and retains it on failure', async () => {
    const coverage = [
      { name: 'PMCF Plan', status: 'satisfied', source: 'attachment', sourceName: 'Appendix 4 - PMCF Plan v2.1.txt',
        evidence: 'The plan describes follow-up procedures.' },
      { name: 'Follow-up schedule', status: 'satisfied', source: 'section', sourceName: null,
        evidence: 'Visits occur at 30 days and 3 months.' },
    ];
    const content = (await protocols.getByProject(projectId)).sections[0].content;
    const first = await protocols.beginSectionAnalysis(projectId, '1', content, actor);
    expect(first.section.satisfiedRequirements).toEqual([]);
    await protocols.finishSectionAnalysis(projectId, '1', first.requestId, {
      issues: [], requiredElements: [], satisfiedRequirements: coverage,
    }, null, actor, first.section.issues);
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual(coverage);
    expect((await pool.query('select satisfied_requirements from protocol_section')).rows[0].satisfied_requirements).toEqual(coverage);

    const edited = await protocols.updateSection(projectId, '1', {
      content: `${content}<p>Updated follow-up details.</p>`, reason: 'Clarification',
    }, actor);
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual(coverage);
    // Older/focused payloads may omit coverage; they must not erase it.
    await protocols.updateAtomic(projectId, current => ({ ...current,
      sections: current.sections.map(({ satisfiedRequirements, ...section }: any) => section),
    }), actor);
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual(coverage);

    const failed = await protocols.beginSectionAnalysis(projectId, '1', edited.content, actor);
    await protocols.finishSectionAnalysis(projectId, '1', failed.requestId, null, 'Provider unavailable', actor);
    expect((await protocols.getByProject(projectId)).sections[0]).toMatchObject({
      analysisStatus: 'failed', satisfiedRequirements: coverage,
    });

    const next = await protocols.beginSectionAnalysis(projectId, '1', edited.content, actor);
    await protocols.finishSectionAnalysis(projectId, '1', next.requestId, {
      issues: [], satisfiedRequirements: [coverage[1]],
    }, null, actor, next.section.issues);
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual([coverage[1]]);

    const stale = await protocols.beginSectionAnalysis(projectId, '1', edited.content, actor);
    const latest = await protocols.beginSectionAnalysis(projectId, '1', edited.content, actor);
    await expect(protocols.finishSectionAnalysis(projectId, '1', stale.requestId, {
      issues: [], satisfiedRequirements: coverage,
    }, null, actor)).rejects.toThrow('changed during analysis');
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual([coverage[1]]);
    await protocols.finishSectionAnalysis(projectId, '1', latest.requestId, {
      issues: [], satisfiedRequirements: [],
    }, null, actor, latest.section.issues);
    expect((await protocols.getByProject(projectId)).sections[0].satisfiedRequirements).toEqual([]);
    expect((await pool.query('select satisfied_requirements from protocol_section')).rows[0].satisfied_requirements).toEqual([]);
  });

  it('enforces the attachment foreign key and rejects requirement/link changes during signature', async () => {
    const section = (await pool.query('select id from protocol_section')).rows[0];
    await expect(pool.query(`update protocol_section_issue set attachment_id=$2 where section_id=$1`, [section.id, randomUUID()])).rejects.toMatchObject({ code: '23503' });
    await pool.query("insert into workflow_step_state values($1,'protocol-pdf','in_review')", [projectId]);
    await expect(attachments.updateRequirements(projectId, attachmentId, ['req-1'], actor)).rejects.toThrow('locked');
    const issue = (await protocols.getByProject(projectId)).sections[0].issues[0];
    await expect(documents.decide(projectId, '1', issue.id, 'document', actor, attachmentId)).rejects.toThrow('locked');
  });
});
