import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { getPool } from '../../db/pg';
import { ProjectsService } from './projects.service';
import { ProtocolsService } from '../protocols/protocols.service';
import { ReportsService } from '../reports/reports.service';
import { listProjectRequirements, replaceProjectRequirements } from './project-requirements';
import { buildProtocolGenerationContext, selectProjectContext } from './project-generation-context';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));
const connectionString = process.env.PROJECT_REQUIREMENTS_TEST_DATABASE_URL;
const databaseTests = connectionString ? describe : describe.skip;

databaseTests('project requirement migration and transactions', () => {
  const schema = `requirements_${randomUUID().replace(/-/g, '')}`;
  const projectId = randomUUID();
  const otherProject = randomUUID();
  let admin: Pool;
  let pool: Pool;
  let projects: ProjectsService;
  let audit: any;
  let baselineId: string;
  let legacyIssueId: string;

  beforeAll(async () => {
    admin = new Pool({ connectionString });
    await admin.query(`create schema ${schema}`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema},public` });
    (getPool as jest.Mock).mockReturnValue(pool);
    await pool.query('create table schema_migrations(filename text primary key,applied_at timestamptz default now())');
    const directory = resolve(__dirname, '../../../db/migrations');
    for (const name of readdirSync(directory).filter(name => name.endsWith('.sql') && name < '039').sort()) {
      await pool.query(readFileSync(resolve(directory, name), 'utf8'));
    }
    baselineId = 'standard-' + (await pool.query("select id from standards where code='ISO-14971'")).rows[0].id;
    const legacyRequirements = [
      { id: baselineId, title: 'ISO-14971', description: 'Risk management', status: 'not-applicable', justification: 'Old decision', source: 'mandatory' },
      { id: 'custom-1', title: 'PMCF Plan', description: 'Project-specific follow-up', status: 'accepted', source: 'user-defined' },
      { id: 'req-1', title: 'Visit schedule', description: 'Define visits', status: 'suggested', source: 'ai-suggested' },
      { id: 'lib-clinical-2', title: 'Informed Consent Process', description: 'Consent', status: 'not-applicable', justification: 'No direct patient contact', source: 'library' },
    ];
    for (const [index, id] of [projectId, otherProject].entries()) {
      const requirements = index === 0 ? legacyRequirements : [
        { ...legacyRequirements[1], title: 'Other project custom plan' }, legacyRequirements[2],
      ];
      await pool.query(`insert into projects(id,name,project_number,created_at,updated_at,data)
        values($1,$2,$3,now(),now(),$4)`, [id, `Study ${index}`, `2026-${index + 1}`, { scope: { intendedUse: 'monitoring', requirements } }]);
    }
    // Exercise a populated existing junction, including a standard decision in JSON.
    await pool.query('insert into project_standards(project_id,standard_id) values($1,$2)', [projectId, Number(baselineId.replace('standard-', ''))]);
    const protocol = (await pool.query('select id from protocol where project_id=$1', [projectId])).rows[0]
      || (await pool.query('insert into protocol(project_id) values($1) returning id', [projectId])).rows[0];
    const section = (await pool.query("insert into protocol_section(protocol_id,section_key,position,title) values($1,'1',1,'Follow-up') returning id", [protocol.id])).rows[0];
    legacyIssueId = (await pool.query("insert into protocol_section_issue(section_id,issue_key,severity,description,requirement_id) values($1,'finding-1','warning','Missing plan','custom-1') returning id", [section.id])).rows[0].id;
    await pool.query(`insert into protocol_attachment(id,protocol_id,appendix_number,filename,mime_type,bytes,uploaded_by_name,uploaded_at,requirement_ids)
      values($1,$2,1,'Plan.txt','text/plain',$3,'Reviewer',now(),array['custom-1'])`, [randomUUID(), protocol.id, Buffer.from('Plan')]);
    await pool.query(readFileSync(resolve(directory, '039_project_requirements.sql'), 'utf8'));
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    projects = new ProjectsService({} as any, audit, new ProtocolsService(audit), new ReportsService(audit));
  }, 30000);

  afterAll(async () => {
    await pool?.end();
    if (admin) { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
  });

  it('backfills shared/custom definitions, decisions and baseline assignments without JSON copies', async () => {
    const requirements = await listProjectRequirements(projectId);
    expect(requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: baselineId, status: 'accepted', alwaysApplies: true }),
      expect.objectContaining({ id: 'custom-1', title: 'PMCF Plan', status: 'accepted', source: 'user-defined' }),
      expect.objectContaining({ id: 'req-1', status: 'suggested' }),
      expect.objectContaining({ id: 'lib-clinical-2', status: 'not-applicable', justification: 'No direct patient contact' }),
    ]));
    const customRows = (await pool.query('select project_id,title from custom_requirements order by title')).rows;
    expect(customRows).toHaveLength(4);
    expect(new Set(customRows.map(row => row.project_id)).size).toBe(2);
    const suggestions = (await pool.query("select custom_requirement_id from project_standards where id='req-1'")).rows;
    expect(suggestions[0].custom_requirement_id).not.toBe(suggestions[1].custom_requirement_id);
    expect((await pool.query('select data from projects where id=$1', [projectId])).rows[0].data.scope).not.toHaveProperty('requirements');
    expect((await pool.query('select * from protocol_section_issue where id=$1', [legacyIssueId])).rows[0])
      .toMatchObject({ requirement_id: 'custom-1', project_id: projectId });
    expect((await pool.query('select requirement_ids from protocol_attachment')).rows[0].requirement_ids).toEqual(['custom-1']);
  });

  it('returns the same AI context template from relational assignments and rejects retired writes', async () => {
    const project = await projects.get(projectId);
    expect(project.data.scope).not.toHaveProperty('requirements');
    const context = buildProtocolGenerationContext(project);
    expect(context.scope.requirements.every((requirement: any) => requirement.status === 'accepted')).toBe(true);
    expect(context.scope.requirements.some((requirement: any) => requirement.id === 'custom-1')).toBe(true);
    expect(context.scope.requirements.some((requirement: any) => requirement.definitionId)).toBe(false);
    expect(selectProjectContext(project, ['acceptedRequirements']).acceptedRequirements).toEqual(expect.arrayContaining([
      { id: 'custom-1', title: 'PMCF Plan', description: 'Project-specific follow-up' },
    ]));
    await expect(projects.update(projectId, { data: { scope: { requirements: [] } } })).rejects.toThrow('no longer supported');
    await expect(pool.query("update projects set data=jsonb_set(data,'{scope,requirements}','[]') where id=$1", [projectId]))
      .rejects.toMatchObject({ code: '23514' });
  });

  it('saves decisions and new custom definitions atomically with their audit events', async () => {
    const requirements = await listProjectRequirements(projectId);
    const updated = await projects.update(projectId, { requirements: requirements.map(requirement => requirement.id === 'req-1'
      ? { ...requirement, status: 'accepted' as const } : requirement).concat([
      { id: 'custom-new', title: 'Safety plan', description: 'Extra project plan', status: 'accepted', source: 'user-defined', alwaysApplies: false },
    ]) }, { name: 'Author' });
    expect(updated.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'req-1', status: 'accepted' }), expect.objectContaining({ id: 'custom-new', title: 'Safety plan' }),
    ]));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'scope.requirement.accepted', entityId: 'req-1' }), expect.anything());
    const before = await listProjectRequirements(projectId);
    audit.record.mockRejectedValueOnce(new Error('Audit unavailable'));
    await expect(projects.update(projectId, { requirements: before.map(requirement => requirement.id === 'req-1'
      ? { ...requirement, status: 'not-applicable', justification: 'Scope changed' }
      : requirement.id === 'custom-new' ? { ...requirement, description: 'Changed during failed transaction' } : requirement) }))
      .rejects.toThrow('Audit unavailable');
    expect(await listProjectRequirements(projectId)).toEqual(before);
    expect((await pool.query('select data from projects where id=$1', [projectId])).rows[0].data.scope).not.toHaveProperty('requirements');
  });

  it('enforces project ownership, one definition per assignment and unique assignments', async () => {
    const custom = (await pool.query('select id from custom_requirements where project_id=$1', [otherProject])).rows[0];
    await expect(pool.query(`insert into project_standards(project_id,id,custom_requirement_id,status,source)
      values($1,'foreign-custom',$2,'accepted','user-defined')`, [projectId, custom.id])).rejects.toMatchObject({ code: '23503' });
    await expect(pool.query(`insert into project_standards(project_id,id,status,source)
      values($1,'no-definition','accepted','ai-suggested')`, [projectId])).rejects.toMatchObject({ code: '23514' });
    await expect(pool.query('update protocol_section_issue set requirement_id=$2 where id=$1', [legacyIssueId, 'foreign-requirement']))
      .rejects.toMatchObject({ code: '23503' });
    await expect(pool.query("update protocol_attachment set requirement_ids=array['foreign-requirement']"))
      .rejects.toMatchObject({ code: '23503' });
    const definition = (await pool.query("select standard_id from project_standards where project_id=$1 and id=$2", [projectId,baselineId])).rows[0];
    await expect(pool.query(`insert into project_standards(project_id,id,standard_id,status,source)
      values($1,'duplicate',$2,'accepted','mandatory')`, [projectId, definition.standard_id])).rejects.toMatchObject({ code: '23505' });
  });

  it('preserves baseline decisions and refuses removal of linked requirement assignments', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('select id from projects where id=$1 for update', [projectId]);
      const requirements = await listProjectRequirements(projectId, client);
      await replaceProjectRequirements(projectId, requirements.map(requirement => requirement.id === baselineId
        ? { ...requirement, status: 'not-applicable', justification: 'Attempt to exclude baseline' } : requirement), client);
      expect((await listProjectRequirements(projectId, client)).find(requirement => requirement.id === baselineId)?.status).toBe('accepted');
      await client.query('commit');
    } finally { await client.query('rollback'); client.release(); }
    const before = await listProjectRequirements(projectId);
    await expect(projects.update(projectId, { requirements: before.filter(requirement => requirement.id !== 'custom-1') }))
      .rejects.toThrow('Remove the requirement links');
    expect(await listProjectRequirements(projectId)).toEqual(before);
  });

  it('creates projects with real baseline and custom assignments and preserves decisions on setup changes', async () => {
    const project = await projects.create({ name: 'New study', deviceCategory: 'active', risk: 'IIb', targetMarkets: ['EU'],
      requirements: [{ id: 'new-custom', title: 'Local follow-up plan', description: 'Site-specific follow-up',
        status: 'accepted', source: 'user-defined', alwaysApplies: false }] });
    expect(project.data.scope).toBeUndefined();
    expect(project.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: baselineId, alwaysApplies: true, status: 'accepted' }),
      expect.objectContaining({ id: 'new-custom', source: 'user-defined', status: 'accepted' }),
    ]));
    const conditional = project.requirements.find(requirement => requirement.source === 'mandatory' && !requirement.alwaysApplies)!;
    expect(conditional).toBeDefined();
    const accepted = await projects.update(project.id, { requirements: project.requirements.map(requirement => requirement.id === conditional.id
      ? { ...requirement, status: 'accepted' } : requirement) });
    const changedSetup = await projects.update(project.id, { targetMarkets: ['US'], risk: 'I' });
    expect(changedSetup.requirements.find(requirement => requirement.id === conditional.id)?.status).toBe('accepted');
    expect(changedSetup.requirements.find(requirement => requirement.id === 'new-custom'))
      .toEqual(accepted.requirements.find(requirement => requirement.id === 'new-custom'));
    expect(changedSetup.data.scope).toBeUndefined();
    // Reusing the older junction must not obstruct project/document cascades.
    const protocolId = (await pool.query('select id from protocol where project_id=$1', [project.id])).rows[0].id;
    const sectionId = (await pool.query("insert into protocol_section(protocol_id,section_key,position,title) values($1,'1',1,'Follow-up') returning id", [protocolId])).rows[0].id;
    await pool.query("insert into protocol_section_issue(section_id,issue_key,severity,description,requirement_id) values($1,'finding','warning','Missing plan','new-custom')", [sectionId]);
    await pool.query(`insert into protocol_attachment(id,protocol_id,appendix_number,filename,mime_type,bytes,uploaded_by_name,uploaded_at,requirement_ids)
      values($1,$2,1,'Plan.txt','text/plain',$3,'Reviewer',now(),array['new-custom'])`, [randomUUID(), protocolId, Buffer.from('Plan')]);
    await pool.query('delete from projects where id=$1', [project.id]);
    expect((await pool.query('select id from project_standards where project_id=$1', [project.id])).rows).toEqual([]);
    expect((await pool.query('select id from custom_requirements where project_id=$1', [project.id])).rows).toEqual([]);
  });
});
