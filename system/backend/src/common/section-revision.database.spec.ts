import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { getPool } from '../db/pg';
import { ProtocolsService } from '../modules/protocols/protocols.service';
import { ReportsService } from '../modules/reports/reports.service';
import { AuditService } from '../modules/audit/audit.service';

jest.mock('../db/pg', () => ({ getPool: jest.fn() }));
const connectionString = process.env.SECTION_REVISION_TEST_DATABASE_URL;
const databaseTests = connectionString ? describe : describe.skip;

databaseTests('section revision concurrency in PostgreSQL', () => {
  const schema = `section_revisions_${randomUUID().replace(/-/g, '')}`;
  let admin: Pool;
  let pool: Pool;
  let protocols: ProtocolsService;
  let reports: ReportsService;
  let projectId: string;
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    admin = new Pool({ connectionString });
    await admin.query(`create schema ${schema}`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema},public` });
    (getPool as jest.Mock).mockReturnValue(pool);
    await pool.query('create table schema_migrations(filename text primary key, applied_at timestamptz default now())');
    const directory = resolve(__dirname, '../../db/migrations');
    for (const filename of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
      await pool.query(readFileSync(resolve(directory, filename), 'utf8'));
    }
    protocols = new ProtocolsService(audit as any);
    reports = new ReportsService(audit as any);
  }, 30000);

  beforeEach(async () => {
    audit.record.mockClear();
    projectId = randomUUID();
    await pool.query(`insert into projects(id,name,project_number,created_at,updated_at,data)
      values($1,'Concurrency test',$2,now(),now(),'{}')`, [projectId, projectId]);
    const protocol = (await pool.query('insert into protocol(project_id) values($1) returning id', [projectId])).rows[0];
    await pool.query(`insert into protocol_section(protocol_id,section_key,title,position,content,analysis_status)
      values($1,'1','Overview',1,'<p>Original</p>','succeeded')`, [protocol.id]);
    const report = (await pool.query('insert into report(project_id) values($1) returning id', [projectId])).rows[0];
    await pool.query(`insert into report_section(report_id,section_key,title,position,content,analysis_status)
      values($1,'section-1','Summary',1,'<p>Original</p>','succeeded')`, [report.id]);
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) { await admin.query(`drop schema ${schema} cascade`); await admin.end(); }
  });

  it.each(['protocol', 'report'])('accepts only one concurrent %s save and returns the winner to the other editor', async kind => {
    const save = (content: string, expectedRevision: number) => kind === 'protocol'
      ? protocols.updateSection(projectId, '1', { content, expectedRevision, reason: 'Edit' }, {})
      : reports.updateSections(projectId, { 'section-1': { content, expectedRevision } }, {});
    const results = await Promise.allSettled([save('<p>Alice</p>', 1), save('<p>Bob</p>', 1)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    const conflict = rejected.reason.getResponse();
    expect(conflict).toMatchObject({ code: 'SECTION_REVISION_CONFLICT', current: { revision: 2 } });
    const current = kind === 'protocol'
      ? (await protocols.getByProject(projectId)).sections[0]
      : (await reports.getByProject(projectId)).sections['section-1'];
    expect(current.content).toBe(conflict.current.content);
    expect(current.revision).toBe(2);
    expect(audit.record).toHaveBeenCalledTimes(1);

    // Resolving against the newer revision succeeds; the old token stays stale.
    await save('<p>Combined text</p>', 2);
    await expect(save('<p>Old retry</p>', 2)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a stale bulk protocol snapshot before it can overwrite content or review records', async () => {
    const original = await protocols.getByProject(projectId);
    await protocols.updateSection(projectId, '1', { content: '<p>New text</p>', expectedRevision: 1 }, {});
    audit.record.mockClear();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('select id from projects where id=$1 for update', [projectId]);
      await expect(protocols.save(projectId, original, {}, client, true)).rejects.toMatchObject({ status: 409 });
      await client.query('ROLLBACK');
    } finally { client.release(); }
    expect((await protocols.getByProject(projectId)).sections[0]).toMatchObject({ content: '<p>New text</p>', revision: 2 });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rolls back every section in a batch when a later section is stale', async () => {
    const reportId = (await pool.query('select id from report where project_id=$1', [projectId])).rows[0].id;
    await pool.query(`insert into report_section(report_id,section_key,title,position,content,revision)
      values($1,'section-2','Background',2,'<p>Newer background</p>',3)`, [reportId]);
    await expect(reports.updateSections(projectId, {
      'section-1': { content: '<p>Would overwrite</p>', expectedRevision: 1 },
      'section-2': { content: '<p>Outdated</p>', expectedRevision: 2 },
    }, {})).rejects.toMatchObject({ status: 409 });
    const saved = (await reports.getByProject(projectId)).sections;
    expect(saved['section-1']).toMatchObject({ content: '<p>Original</p>', revision: 1, analysisStatus: 'succeeded' });
    expect(saved['section-2']).toMatchObject({ content: '<p>Newer background</p>', revision: 3 });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('requires a revision for content writes but allows metadata-only updates', async () => {
    await expect(reports.updateSections(projectId, { 'section-1': { content: 'Missing token' } }, {}))
      .rejects.toMatchObject({ status: 400 });
    await reports.updateSections(projectId, { 'section-1': { userEdited: true } }, {});
    expect((await reports.getByProject(projectId)).sections['section-1'].revision).toBe(1);
  });

  it('detects text changed away and back, even though previousContent matches again', async () => {
    await protocols.updateSection(projectId, '1', { content: '<p>Changed</p>', expectedRevision: 1 }, {});
    await protocols.updateSection(projectId, '1', { content: '<p>Original</p>', expectedRevision: 2 }, {});
    await expect(protocols.updateSection(projectId, '1', {
      content: '<p>Stale editor</p>', previousContent: '<p>Original</p>', expectedRevision: 1,
    }, {})).rejects.toMatchObject({ status: 409 });
  });

  it.each(['protocol', 'report'])('persists %s badge attribution and original inputs using the existing audit records', async kind => {
    const inputs = [{ label: 'Device category', value: 'Original category' }];
    const sectionId = kind === 'protocol' ? '1' : 'section-1';
    const generation = kind === 'protocol' ? 'protocol.generated' : 'report.section.ai.generated';
    const metadata = { sectionIds: [sectionId], sectionId, generationInputs: inputs, generatedAt: '2020-01-01T00:00:00Z' };
    await pool.query(`insert into audit_event(id,project_id,scope,type,message,entity_type,entity_id,metadata,created_at)
      values(gen_random_uuid(),$1,'project',$2,'Generated','section',$3,$4,'2020-01-01')`, [projectId, generation, sectionId, metadata]);
    if (kind === 'protocol') await pool.query('update protocol_section set ai_generated=true where protocol_id=(select id from protocol where project_id=$1)', [projectId]);
    const realAudit = new AuditService();
    const protocolService = new ProtocolsService(realAudit);
    const reportService = new ReportsService(realAudit);
    const read = async () => kind === 'protocol'
      ? (await protocolService.getByProject(projectId)).sections[0]
      : (await reportService.getByProject(projectId)).sections[sectionId];
    const save = async (content: string, expectedRevision: number) => kind === 'protocol'
      ? protocolService.updateSection(projectId, sectionId, { content, expectedRevision }, { name: 'Alice' })
      : (await reportService.updateSections(projectId, { [sectionId]: { content, expectedRevision, userEdited: true } }, { name: 'Alice' }))[sectionId];
    expect((await read()).provenance).toMatchObject({ aiGenerated: true, inputs, editedAt: null });
    const saved = await save('<p>Human edited text</p>', 1);
    expect(saved.provenance).toMatchObject({ aiGenerated: true, inputs, editedBy: 'Alice' });
    expect(saved.provenance.editedAt).toBeTruthy();
    expect((await read()).provenance).toEqual(saved.provenance);
    await expect(save('<p>Outdated save</p>', 1)).rejects.toMatchObject({ status: 409 });
    expect((await read()).provenance).toEqual(saved.provenance);
    if (kind === 'report') {
      await reportService.updateSections(projectId, { [sectionId]: { state: 'approved', content: saved.content, expectedRevision: 2 } }, { name: 'Approver' });
      expect((await read()).provenance).toEqual(saved.provenance);
      const regenerated = await reportService.updateSections(projectId, { [sectionId]: { content: '<p>Regenerated text</p>', expectedRevision: 3 } }, { name: 'Generator' }, [{
        type: 'report.section.ai.generated', message: 'Generated', entityId: sectionId,
        metadata: { sectionId, generationInputs: [{ label: 'Device category', value: 'New category' }], generatedAt: new Date().toISOString() },
      }]);
      expect(regenerated[sectionId].provenance).toMatchObject({ editedBy: null, editedAt: null,
        inputs: [{ label: 'Device category', value: 'New category' }] });
    } else {
      await protocolService.updateAtomic(projectId, current => ({ ...current, sections: current.sections.map((section: any) => ({ ...section, approvalStatus: 'approved' })) }), { name: 'Approver' });
      expect((await read()).provenance).toEqual(saved.provenance);
    }
  });
});
