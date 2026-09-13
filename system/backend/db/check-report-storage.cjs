// Run after npm run build:
// node -r dotenv/config db/check-report-storage.cjs
// Exercises real PostgreSQL in a disposable schema inside a rolled-back transaction.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  const schema = `report_check_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query('BEGIN');
    await client.query(`create schema ${schema}`);
    await client.query(`set local search_path to ${schema},public`);
    for (const table of ['projects', 'users', 'markets', 'project_markets', 'workflow_step_state',
      'report', 'report_section', 'report_section_comment', 'report_section_issue',
      'report_section_issue_dismissal', 'report_section_completeness_element',
      'report_cross_consistency_issue', 'report_cross_consistency_dismissal', 'report_signature']) {
      await client.query(`create table ${schema}.${table} (like public.${table} including all)`);
    }
    const projectId = randomUUID();
    const reportId = randomUUID();
    // Use a valid project row as a shape fixture; no source row is modified.
    await client.query(`insert into projects select * from public.projects limit 1`);
    await client.query('update projects set id=$1,data=$2', [projectId, {
      report: { sections: {
        'section-1': { content: '<p>Saved study text</p>' },
        'section-2': { issues: [] },
        'section-3': { issues: [] },
        'section-4': { content: '' },
      }, uploadedFiles: [{ id: 'file-1' }], dataAssets: [{ id: 'asset-1' }] },
    }]);
    await client.query('insert into report(id,project_id) values($1,$2)', [reportId, projectId]);
    for (const [key, position, content] of [
      ['section-1', 1, '<p>Saved study text</p>'], ['section-3', 2, ''], ['section-2', 3, ''], ['section-4', 4, ''],
    ]) await client.query(`insert into report_section(report_id,section_key,title,position,content,helper_text)
      values($1,$2,$2,$3,$4,'')`, [reportId, key, position, content]);
    await client.query(readFileSync(`${__dirname}/migrations/025_report_storage_compatibility.sql`, 'utf8'));

    // ReportsService's transactions become savepoints inside the outer rollback.
    const db = {
      query(sql, params) {
        if (sql === 'BEGIN') return client.query('SAVEPOINT report_service');
        if (sql === 'COMMIT') return client.query('RELEASE SAVEPOINT report_service');
        if (sql === 'ROLLBACK') return client.query('ROLLBACK TO SAVEPOINT report_service');
        return client.query(sql, params);
      },
      release() {},
    };
    require('../dist/db/pg').getPool = () => ({ ...db, connect: async () => db });
    const { ReportsService } = require('../dist/modules/projects/reports.service');
    const service = new ReportsService({ record: async () => {} });
    let report = await service.getByProject(projectId);
    assert.deepEqual(Object.keys(report.sections), ['section-1', 'section-2', 'section-3', 'section-4']);
    assert.equal(report.sections['section-1'].content, '<p>Saved study text</p>');
    assert.equal(Object.hasOwn(report.sections['section-2'], 'content'), false);
    assert.equal(Object.hasOwn(report.sections['section-3'], 'content'), false);
    assert.equal(report.sections['section-4'].content, '');
    const positions = (await client.query('select section_key,position from report_section order by position')).rows;
    assert.deepEqual(positions.map(s => s.section_key), ['section-1', 'section-2', 'section-3', 'section-4']);

    const actor = { name: 'Storage check' };
    const content = '<h3>Section 2</h3><p>Edited content stays saved.</p>';
    await service.updateSections(projectId, { 'section-2': { content, userEdited: true } }, actor);
    const id = report.sections['section-2'].databaseId;
    for (let reload = 0; reload < 3; reload++) {
      await service.updateSections(projectId, { 'section-2': {
        issues: [{ id: 'i-1', severity: 'warning', description: 'Review evidence' }],
        completenessElements: [{ id: 'e-1', title: 'Endpoint', isoReference: 'Clause 1', status: 'not-yet-verified' }],
      } }, actor);
      report = await service.getByProject(projectId);
      assert.equal(report.sections['section-2'].content, content);
      assert.equal(report.sections['section-2'].databaseId, id);
      assert.equal(report.sections['section-2'].completenessElements[0].isoReference, 'Clause 1');
    }
    await service.updateSections(projectId, { 'section-2': { content: '' } }, actor);
    assert.equal((await service.getByProject(projectId)).sections['section-2'].content, '');
    // New analysis writes arriving out of order get deterministic persisted metadata.
    await service.updateSections(projectId, { 'section-6': { issues: [] } }, actor);
    await service.updateSections(projectId, { 'section-5': { issues: [] } }, actor);
    report = await service.getByProject(projectId);
    assert.equal(report.sections['section-5'].order, 5);
    assert.equal(report.sections['section-6'].order, 6);
    assert.equal(report.sections['section-5'].title, 'Statistical Methods');
    assert.equal(Object.hasOwn(report.sections['section-5'], 'content'), false);
    const data = (await client.query('select data from projects where id=$1', [projectId])).rows[0].data;
    assert.deepEqual(data.uploadedFiles, [{ id: 'file-1' }]);
    assert.deepEqual(data.dataAssets, [{ id: 'asset-1' }]);
    assert.equal(data.report.sections['section-2'].content, undefined);
    console.log('PASS: migration, missing vs empty content, ordering, edit/reload, evidence, row identity, and asset metadata.');
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
