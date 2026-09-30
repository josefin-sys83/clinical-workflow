import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

const connectionString = process.env.PROTOCOL_SEVERITY_TEST_DATABASE_URL;
const databaseTests = connectionString ? describe : describe.skip;
const migrations = resolve(__dirname, '../../../db/migrations');
const migration = readFileSync(resolve(migrations, '031_protocol_issue_severity_constraint.sql'), 'utf8');
const originalSchema = readFileSync(resolve(migrations, '023_normalize_protocol.sql'), 'utf8');
const issueTable = originalSchema.match(/create table if not exists protocol_section_issue \([\s\S]*?\n\);/)![0]
  .replace('create table if not exists', 'create temporary table');
const sectionId = '00000000-0000-0000-0000-000000000001';

databaseTests('protocol issue severity database constraint', () => {
  let client: Client;

  beforeEach(async () => {
    client = new Client({ connectionString });
    await client.connect();
    // Temporary tables isolate these tests from application data.
    await client.query('create temporary table protocol_section (id uuid primary key)');
    await client.query('insert into protocol_section (id) values ($1)', [sectionId]);
    await client.query(issueTable);
  });

  afterEach(async () => { await client.end(); });

  it('accepts all five exact severities on inserts and updates', async () => {
    await client.query(migration);
    for (const severity of ['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required']) {
      await client.query(
        'insert into protocol_section_issue (section_id, issue_key, severity, description) values ($1, $2, $2, $2)',
        [sectionId, severity],
      );
      const { rows } = await client.query(
        'update protocol_section_issue set severity = $1 where issue_key = $2 returning severity',
        [severity, 'blocker'],
      );
      expect(rows[0].severity).toBe(severity);
    }
  });

  it.each(['info', 'high', '', 'Blocker', ' warning ', 'cross-reference'])(
    'rejects direct SQL inserts and updates with severity %p', async severity => {
      await client.query(migration);
      await expect(client.query(
        'insert into protocol_section_issue (section_id, issue_key, severity, description) values ($1, $2, $3, $2)',
        [sectionId, 'invalid', severity],
      )).rejects.toMatchObject({ code: '23514', constraint: 'protocol_section_issue_severity_check' });
      await client.query(
        "insert into protocol_section_issue (section_id, issue_key, severity, description) values ($1, 'valid', 'warning', 'Finding')",
        [sectionId],
      );
      await expect(client.query('update protocol_section_issue set severity = $1', [severity]))
        .rejects.toMatchObject({ code: '23514', constraint: 'protocol_section_issue_severity_check' });
      expect((await client.query('select severity from protocol_section_issue')).rows).toEqual([{ severity: 'warning' }]);
    },
  );

  it('rejects null and omitted severities', async () => {
    await client.query(migration);
    await expect(client.query(
      'insert into protocol_section_issue (section_id, issue_key, severity, description) values ($1, $2, null, $2)',
      [sectionId, 'null'],
    )).rejects.toMatchObject({ code: '23502', column: 'severity' });
    await expect(client.query(
      'insert into protocol_section_issue (section_id, issue_key, description) values ($1, $2, $2)',
      [sectionId, 'missing'],
    )).rejects.toMatchObject({ code: '23502', column: 'severity' });
  });

  it('fails on existing invalid rows without rewriting them', async () => {
    await client.query(
      "insert into protocol_section_issue (section_id, issue_key, severity, description) values ($1, 'old', 'info', 'Finding')",
      [sectionId],
    );
    await expect(client.query(migration))
      .rejects.toMatchObject({ code: '23514', constraint: 'protocol_section_issue_severity_check' });
    expect((await client.query('select severity from protocol_section_issue')).rows).toEqual([{ severity: 'info' }]);
  });
});
