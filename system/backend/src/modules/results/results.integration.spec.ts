import 'reflect-metadata';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';
import request from 'supertest';
import { getPool } from '../../db/pg';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

// Use an explicitly selected disposable database migrated through 027.
// Every fixture and operation is rolled back. Never default to DATABASE_URL.
const describeDatabase = process.env.RESULTS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
describeDatabase('results HTTP API and PostgreSQL constraints', () => {
  let pool: Pool;
  let client: PoolClient;
  let app: INestApplication;
  let audit: AuditService;
  let projectId: string;
  let reportId: string;
  let sectionId: string;
  let sourceId: string;
  let userId: string;
  let companyId: string;
  let roles: string[];
  const path = () => `/api/projects/${projectId}/results`;
  const input = () => ({
    type: 'table',
    title: 'Study population',
    content: { headers: ['N'], rows: [[42]] },
    sourceFilename: 'analysis.xlsx',
    sourceLocation: 'Sheet 2, rows 4-9',
    reportSectionId: sectionId,
    sourceDocumentId: sourceId,
    originalReference: 'Table 14.2.1',
    titleOrigin: 'ai',
  });
  const http = () => request(app.getHttpServer());
  const create = async (extra = {}) =>
    (
      await http()
        .post(path())
        .set('Authorization', 'Bearer test')
        .send({ ...input(), ...extra })
        .expect(201)
    ).body;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.RESULTS_TEST_DATABASE_URL,
    });
    client = await pool.connect();
    const db = {
      query(sql: string, values?: any[]) {
        if (sql === 'BEGIN') return client.query('SAVEPOINT results_service');
        if (sql === 'COMMIT')
          return client.query('RELEASE SAVEPOINT results_service');
        if (sql === 'ROLLBACK')
          return client.query('ROLLBACK TO SAVEPOINT results_service');
        return client.query(sql, values);
      },
      release() {},
    };
    (getPool as jest.Mock).mockReturnValue({ ...db, connect: async () => db });
    const module = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [ResultsService, AuditService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer test')
            throw new UnauthorizedException();
          req.user = { userId, companyId, name: 'Stale token name', roles };
          return true;
        },
      })
      .compile();
    audit = module.get(AuditService);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    projectId = randomUUID();
    companyId = randomUUID();
    userId = randomUUID();
    roles = ['admin'];
    await client.query('insert into companies(id,name) values($1,$2)', [
      companyId,
      'Results test company',
    ]);
    await client.query(
      `insert into users(id,company_id,name,email,password_hash) values($1,$2,$3,$4,'unused')`,
      [userId, companyId, 'Real database user', `${userId}@test.invalid`],
    );
    await client.query(
      `insert into projects(id,name,company_id,project_number,created_at,updated_at)
      values($1,'Results test',$2,$3,now(),now())`,
      [projectId, companyId, projectId],
    );
    reportId = (
      await client.query(
        'insert into report(project_id) values($1) returning id',
        [projectId],
      )
    ).rows[0].id;
    sectionId = (
      await client.query(
        `insert into report_section(report_id,section_key,position,title)
      values($1,'section-7',7,'Results') returning id`,
        [reportId],
      )
    ).rows[0].id;
    sourceId = (
      await client.query(
        `insert into supporting_document(project_id,type,filename,mime_type,bytes,uploaded_by_name)
      values($1,'tfl','analysis.xlsx','application/octet-stream',$2,'Uploader') returning id`,
        [projectId, Buffer.from('fixture')],
      )
    ).rows[0].id;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await client.query('ROLLBACK');
  });
  afterAll(async () => {
    await app?.close();
    client?.release();
    await pool?.end();
  });

  it.each(['table', 'figure', 'listing'])(
    'creates and lists a versioned %s draft',
    async (type) => {
      const result = await create({ type });
      expect(result).toMatchObject({
        type,
        version: 1,
        status: 'draft',
        placement: 'unplaced',
        reportNumber: 1,
      });
      const listed = (
        await http().get(path()).set('Authorization', 'Bearer test').expect(200)
      ).body;
      expect(listed).toHaveLength(1);
      expect(listed[0]).toEqual(result);
    },
  );

  it('works before report authoring and creates empty section destinations on first result', async () => {
    await client.query('delete from report where id=$1', [reportId]);
    const empty = (
      await http()
        .get(`${path()}/workspace`)
        .set('Authorization', 'Bearer test')
        .expect(200)
    ).body;
    expect(empty).toMatchObject({ results: [], sections: [], locked: false });
    const result = await create({ reportSectionId: null });
    const workspace = (
      await http()
        .get(`${path()}/workspace`)
        .set('Authorization', 'Bearer test')
        .expect(200)
    ).body;
    expect(workspace.results).toHaveLength(1);
    expect(workspace.sections.length).toBeGreaterThan(0);
    const section = workspace.sections.find(
      (item: any) => item.title === 'Safety Analysis',
    );
    expect(section).toBeDefined();
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, reportSectionId: section.id })
      .expect(200);
    expect(
      (
        await client.query(
          'select content,status from report_section where id=$1',
          [section.id],
        )
      ).rows[0],
    ).toEqual({ content: null, status: 'draft' });
  });

  it('stores SAP/TFL separately, downloads exact bytes, and audits upload/removal', async () => {
    const uploaded = (
      await http()
        .post(`${path()}/supporting-documents`)
        .set('Authorization', 'Bearer test')
        .field('type', 'tfl')
        .field('description', 'Reference only')
        .attach('file', Buffer.from('not result data'), {
          filename: 'spec.txt',
          contentType: 'text/plain',
        })
        .expect(201)
    ).body;
    const workspace = (
      await http()
        .get(`${path()}/workspace`)
        .set('Authorization', 'Bearer test')
        .expect(200)
    ).body;
    expect(workspace.results).toEqual([]);
    expect(
      workspace.supportingDocuments.find((doc: any) => doc.id === uploaded.id),
    ).toMatchObject({
      type: 'tfl',
      filename: 'spec.txt',
      uploaderName: 'Real database user',
    });
    const download = await http()
      .get(`${path()}/supporting-documents/${uploaded.id}`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(download.body.toString()).toBe('not result data');
    expect(download.headers['content-disposition']).toContain('attachment');
    await http()
      .delete(`${path()}/supporting-documents/${uploaded.id}`)
      .set('Authorization', 'Bearer test')
      .expect(204);
    const events = (
      await client.query(
        'select type from audit_event where entity_id=$1 order by created_at,id',
        [uploaded.id],
      )
    ).rows;
    expect(events.map((row) => row.type).sort()).toEqual([
      'supporting-document.added',
      'supporting-document.deleted',
    ]);
  });

  it('rejects cross-project downloads, referenced document deletion, and unauthorized uploads', async () => {
    await create();
    await http()
      .delete(`${path()}/supporting-documents/${sourceId}`)
      .set('Authorization', 'Bearer test')
      .expect(409);
    await http()
      .get(`${path()}/supporting-documents/${randomUUID()}`)
      .set('Authorization', 'Bearer test')
      .expect(404);
    const otherProject = randomUUID();
    await client.query(
      `insert into projects(id,name,company_id,project_number,created_at,updated_at)
       values($1,'Other project',$2,$3,now(),now())`,
      [otherProject, companyId, otherProject],
    );
    await http()
      .get(
        `/api/projects/${otherProject}/results/supporting-documents/${sourceId}`,
      )
      .set('Authorization', 'Bearer test')
      .expect(404);
    roles = ['reviewer'];
    await http()
      .post(`${path()}/supporting-documents`)
      .set('Authorization', 'Bearer test')
      .field('type', 'sap')
      .attach('file', Buffer.from('reference'), {
        filename: 'sap.txt',
        contentType: 'text/plain',
      })
      .expect(403);
    roles = ['admin'];
    await client.query(
      "insert into workflow_step_state(project_id,step_id,state,updated_at) values($1,'report-pdf','signed',now())",
      [projectId],
    );
    await http()
      .post(`${path()}/supporting-documents`)
      .set('Authorization', 'Bearer test')
      .field('type', 'sap')
      .attach('file', Buffer.from('reference'), {
        filename: 'sap.txt',
        contentType: 'text/plain',
      })
      .expect(403);
    expect(
      (
        await http()
          .get(`${path()}/workspace`)
          .set('Authorization', 'Bearer test')
          .expect(200)
      ).body.locked,
    ).toBe(true);
    await http()
      .delete(`${path()}/supporting-documents/${sourceId}`)
      .set('Authorization', 'Bearer test')
      .expect(403);
  });

  it('previews result uploads without saving them, and validates pasted tables', async () => {
    const preview = (
      await http()
        .post(`${path()}/preview`)
        .set('Authorization', 'Bearer test')
        .attach('file', Buffer.from('Group,N\nTreatment,42'), {
          filename: 'results.csv',
          contentType: 'text/csv',
        })
        .expect(201)
    ).body;
    expect(preview.drafts[0]).toMatchObject({
      sourceFilename: 'results.csv',
      type: 'table',
      content: { headers: ['Group', 'N'], rows: [['Treatment', '42']] },
    });
    expect(
      (await http().get(path()).set('Authorization', 'Bearer test').expect(200))
        .body,
    ).toEqual([]);
    expect(
      (
        await http()
          .post(`${path()}/parse-table`)
          .set('Authorization', 'Bearer test')
          .send({ text: 'Group\tN\nTreatment\t42' })
          .expect(201)
      ).body,
    ).toEqual({
      headers: preview.drafts[0].content.headers,
      rows: preview.drafts[0].content.rows,
    });
    const saved = await create(preview.drafts[0]);
    expect(saved.content.provenance).toEqual(
      preview.drafts[0].content.provenance,
    );
    expect(saved.sourceLocation).toBe('rows 1–2, columns 1–2');
    await http()
      .post(`${path()}/parse-table`)
      .set('Authorization', 'Bearer test')
      .send({ text: 'Group,N\nTreatment' })
      .expect(400);
    await http()
      .post(`${path()}/preview`)
      .set('Authorization', 'Bearer test')
      .attach('file', Buffer.from('invalid'), {
        filename: 'results.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);
  });

  it('rolls back supporting document upload if audit fails', async () => {
    jest
      .spyOn(audit, 'record')
      .mockRejectedValueOnce(new Error('Audit unavailable'));
    await expect(
      app.get(ResultsService).uploadSupportingDocument(
        projectId,
        { type: 'sap' },
        {
          originalname: 'sap.txt',
          mimetype: 'text/plain',
          buffer: Buffer.from('reference'),
        },
        { userId },
      ),
    ).rejects.toThrow('Audit unavailable');
    expect(
      (
        await client.query(
          'select count(*)::int as n from supporting_document where project_id=$1',
          [projectId],
        )
      ).rows[0].n,
    ).toBe(1);
  });

  it('updates the single shared result in both report views and resets edited provenance', async () => {
    const result = await create();
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'accept', placement: 'both', expectedVersion: 1 })
      .expect(200);
    const edited = (
      await http()
        .patch(`${path()}/${result.id}`)
        .set('Authorization', 'Bearer test')
        .send({
          expectedVersion: 2,
          title: 'Updated population',
          content: { rows: [[43]] },
        })
        .expect(200)
    ).body;
    expect(edited).toMatchObject({
      id: result.id,
      version: 3,
      titleOrigin: 'human',
    });
    for (const view of ['main', 'appendix']) {
      const listed = (
        await http()
          .get(`${path()}?view=${view}`)
          .set('Authorization', 'Bearer test')
          .expect(200)
      ).body;
      expect(listed).toEqual([edited]);
    }
    expect(
      (await client.query('select count(*)::int as n from result_object'))
        .rows[0].n,
    ).toBe(1);
  });

  it('records every decision with the real actor and retains a rejected result', async () => {
    const result = await create();
    for (const [index, decision] of [
      'accept',
      'appendix',
      'reject',
    ].entries()) {
      await http()
        .post(`${path()}/${result.id}/decisions`)
        .set('Authorization', 'Bearer test')
        .send({
          decision,
          reason: 'Review evidence',
          expectedVersion: index + 1,
          userId: randomUUID(),
        })
        .expect(200);
    }
    const listed = (
      await http()
        .get(`${path()}?status=rejected`)
        .set('Authorization', 'Bearer test')
        .expect(200)
    ).body;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: result.id,
      version: 4,
      status: 'rejected',
      placement: 'unplaced',
      lastDecision: { decision: 'reject', userId, reason: 'Review evidence' },
    });
    const events = (
      await client.query(
        "select * from audit_event where project_id=$1 and type='result.decision' order by created_at",
        [projectId],
      )
    ).rows;
    expect(events).toHaveLength(3);
    for (const event of events)
      expect(event).toMatchObject({
        actor_user_id: userId,
        actor_name: 'Real database user',
        entity_type: 'result',
      });
    expect(events.map((e) => e.metadata.decision)).toEqual([
      'accept',
      'appendix',
      'reject',
    ]);
    expect(
      (
        await http()
          .get(`${path()}?view=appendix`)
          .set('Authorization', 'Bearer test')
          .expect(200)
      ).body,
    ).toEqual([]);
    await http()
      .delete(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .expect(409);
  });

  it('rolls back the decision if its audit write fails', async () => {
    const result = await create();
    jest
      .spyOn(audit, 'record')
      .mockRejectedValueOnce(new Error('Audit unavailable'));
    await expect(
      app
        .get(ResultsService)
        .decide(
          projectId,
          result.id,
          { decision: 'reject', expectedVersion: 1 },
          { userId },
        ),
    ).rejects.toThrow('Audit unavailable');
    expect(
      (
        await client.query(
          'select status,version from result_object where id=$1',
          [result.id],
        )
      ).rows[0],
    ).toEqual({ status: 'draft', version: 1 });
  });

  it('rejects stale edits and decisions without changing the row or recording a decision', async () => {
    const result = await create();
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ title: 'Changed', expectedVersion: 1 })
      .expect(200);
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ title: 'Stale', expectedVersion: 1 })
      .expect(409);
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'reject', expectedVersion: 1 })
      .expect(409);
    expect(
      (
        await client.query(
          "select count(*)::int as n from audit_event where type='result.decision'",
        )
      ).rows[0].n,
    ).toBe(0);
  });

  it('deletes only the requested result and never reuses a report number', async () => {
    const first = await create();
    await http()
      .delete(`${path()}/${first.id}`)
      .set('Authorization', 'Bearer test')
      .expect(204);
    const next = await create();
    expect(next.reportNumber).toBe(2);
    expect((await create({ type: 'figure' })).reportNumber).toBe(1);
    await http()
      .delete(`${path()}/${first.id}`)
      .set('Authorization', 'Bearer test')
      .expect(404);
    expect(
      (await client.query('select count(*)::int as n from supporting_document'))
        .rows[0].n,
    ).toBe(1);
  });

  it('cascades project deletion through results, source documents and counters, preserving audit history', async () => {
    const result = await create();
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'reject', expectedVersion: 1 })
      .expect(200);
    await client.query('delete from projects where id=$1', [projectId]);
    for (const table of [
      'result_object',
      'supporting_document',
      'result_object_sequence',
    ])
      expect(
        (await client.query(`select count(*)::int as n from ${table}`)).rows[0]
          .n,
      ).toBe(0);
    expect(
      (
        await client.query(
          "select count(*)::int as n from audit_event where project_id=$1 and type='result.decision'",
          [projectId],
        )
      ).rows[0].n,
    ).toBe(1);
  });

  it('enforces tenant and result ownership for reads, edits, deletion and decisions', async () => {
    const result = await create();
    const otherProject = randomUUID();
    await client.query(
      `insert into projects(id,name,company_id,project_number,created_at,updated_at) values($1,'Other',$2,$3,now(),now())`,
      [otherProject, companyId, otherProject],
    );
    const otherPath = `/api/projects/${otherProject}/results/${result.id}`;
    await http()
      .patch(otherPath)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, title: 'Wrong project' })
      .expect(404);
    await http()
      .delete(otherPath)
      .set('Authorization', 'Bearer test')
      .expect(404);
    await http()
      .post(`${otherPath}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, decision: 'reject' })
      .expect(404);
    companyId = randomUUID();
    await http().get(path()).set('Authorization', 'Bearer test').expect(404);
    await http()
      .post(path())
      .set('Authorization', 'Bearer test')
      .send(input())
      .expect(404);
    await http().get(path()).expect(401);
    await http()
      .get('/api/projects/not-a-uuid/results')
      .set('Authorization', 'Bearer test')
      .expect(404);
  });

  it('rejects source documents and report sections belonging to another project in the API and database', async () => {
    const otherProject = randomUUID();
    await client.query(
      `insert into projects(id,name,company_id,project_number,created_at,updated_at) values($1,'Other',$2,$3,now(),now())`,
      [otherProject, companyId, otherProject],
    );
    const otherReport = (
      await client.query(
        'insert into report(project_id) values($1) returning id',
        [otherProject],
      )
    ).rows[0].id;
    const otherSection = (
      await client.query(
        `insert into report_section(report_id,section_key,position,title) values($1,'s',1,'Other') returning id`,
        [otherReport],
      )
    ).rows[0].id;
    const otherSource = (
      await client.query(
        `insert into supporting_document(project_id,type,filename,mime_type,bytes,uploaded_by_name)
      values($1,'sap','sap.pdf','application/pdf',$2,'Uploader') returning id`,
        [otherProject, Buffer.from('fixture')],
      )
    ).rows[0].id;
    for (const extra of [
      { reportSectionId: otherSection },
      { sourceDocumentId: otherSource },
    ])
      await http()
        .post(path())
        .set('Authorization', 'Bearer test')
        .send({ ...input(), ...extra })
        .expect(400);
    const result = await create();
    await http()
      .patch(`${path()}/${result.id}/section`)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, reportSectionId: otherSection })
      .expect(400);
    for (const [column, value] of [
      ['report_section_id', otherSection],
      ['source_document_id', otherSource],
    ]) {
      await client.query('SAVEPOINT constraint_check');
      await expect(
        client.query(`update result_object set ${column}=$1 where id=$2`, [
          value,
          result.id,
        ]),
      ).rejects.toMatchObject({ code: '23503' });
      await client.query('ROLLBACK TO SAVEPOINT constraint_check');
    }
  });

  it('validates input and prevents status changes through PATCH', async () => {
    for (const extra of [
      { title: '  ' },
      { type: 'invalid' },
      { content: null },
      { sourceFilename: null },
      { placement: null },
      { titleOrigin: 'robot' },
      { content: { 'bad\0key': 'value' } },
    ])
      await http()
        .post(path())
        .set('Authorization', 'Bearer test')
        .send({ ...input(), ...extra })
        .expect(400);
    const result = await create();
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ title: null, expectedVersion: 1 })
      .expect(400);
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'accepted', expectedVersion: 1 })
      .expect(400);
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'reject', placement: 'both', expectedVersion: 1 })
      .expect(400);
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'invalid', expectedVersion: 1 })
      .expect(400);
  });

  it('allows review before section placement', async () => {
    const result = await create({ reportSectionId: null });
    const reviewed = (
      await http()
        .post(`${path()}/${result.id}/decisions`)
        .set('Authorization', 'Bearer test')
        .send({ decision: 'accept', expectedVersion: 1 })
        .expect(200)
    ).body;
    expect(reviewed).toMatchObject({
      status: 'accepted',
      placement: 'unplaced',
    });
    expect(
      (
        await http()
          .get(`${path()}?view=main`)
          .set('Authorization', 'Bearer test')
          .expect(200)
      ).body,
    ).toEqual([]);
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({
        expectedVersion: 2,
        reportSectionId: sectionId,
        placement: 'both',
      })
      .expect(200);
    expect(
      (
        await http()
          .get(`${path()}?view=main`)
          .set('Authorization', 'Bearer test')
          .expect(200)
      ).body,
    ).toHaveLength(1);
  });

  it('lets reviewers correct only the section and keeps the description and its origin', async () => {
    const result = await create({
      reportSectionId: null,
      description: 'Observed values only',
      descriptionOrigin: 'ai',
    });
    roles = ['reviewer'];
    const changed = (
      await http()
        .patch(`${path()}/${result.id}/section`)
        .set('Authorization', 'Bearer test')
        .send({ expectedVersion: 1, reportSectionId: sectionId })
        .expect(200)
    ).body;
    expect(changed).toMatchObject({
      version: 2,
      reportSectionId: sectionId,
      sectionOrigin: 'human',
      description: 'Observed values only',
      descriptionOrigin: 'ai',
    });
    const accepted = (
      await http()
        .post(`${path()}/${result.id}/decisions`)
        .set('Authorization', 'Bearer test')
        .send({ expectedVersion: 2, decision: 'accept' })
        .expect(200)
    ).body;
    expect(accepted).toMatchObject({
      reportSectionId: sectionId,
      placement: 'main',
      description: 'Observed values only',
    });
    // The global whitelist strips unrelated fields before the endpoint pipe.
    const unchanged = (
      await http()
        .patch(`${path()}/${result.id}/section`)
        .set('Authorization', 'Bearer test')
        .send({
          expectedVersion: 3,
          reportSectionId: sectionId,
          description: 'Changed evidence',
        })
        .expect(200)
    ).body;
    expect(unchanged).toMatchObject({
      version: 3,
      description: 'Observed values only',
      descriptionOrigin: 'ai',
    });
    const unplaced = (
      await http()
        .patch(`${path()}/${result.id}/section`)
        .set('Authorization', 'Bearer test')
        .send({ expectedVersion: 3, reportSectionId: null })
        .expect(200)
    ).body;
    expect(unplaced).toMatchObject({
      status: 'accepted',
      placement: 'unplaced',
      reportSectionId: null,
      version: 4,
    });
    const events = await client.query(
      "select metadata,actor_user_id from audit_event where project_id=$1 and type='result.section-updated' order by created_at",
      [projectId],
    );
    expect(events.rows).toHaveLength(2);
    expect(events.rows[0].actor_user_id).toBe(userId);
    expect(events.rows[0].metadata).toMatchObject({
      previousSectionId: null,
      reportSectionId: sectionId,
    });
  });

  it('rejects stale, missing and nonexistent section assignments, and rolls back on audit failure', async () => {
    const result = await create({ reportSectionId: null });
    const requestSection = (body: any) =>
      http()
        .patch(`${path()}/${result.id}/section`)
        .set('Authorization', 'Bearer test')
        .send(body);
    await requestSection({
      expectedVersion: 2,
      reportSectionId: sectionId,
    }).expect(409);
    await requestSection({ expectedVersion: 1 }).expect(400);
    await requestSection({
      expectedVersion: 1,
      reportSectionId: randomUUID(),
    }).expect(400);
    jest
      .spyOn(audit, 'record')
      .mockRejectedValueOnce(new Error('Audit unavailable'));
    const service = app.get(ResultsService);
    await expect(
      service.assignSection(
        projectId,
        result.id,
        { expectedVersion: 1, reportSectionId: sectionId },
        { userId },
      ),
    ).rejects.toThrow('Audit unavailable');
    const stored = (
      await client.query(
        'select report_section_id,version from result_object where id=$1',
        [result.id],
      )
    ).rows[0];
    expect(stored).toEqual({ report_section_id: null, version: 1 });
  });

  it('previews and persists a figure image without generating a description', async () => {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=',
      'base64',
    );
    const preview = (
      await http()
        .post(`${path()}/preview`)
        .set('Authorization', 'Bearer test')
        .attach('file', bytes, {
          filename: 'figure.png',
          contentType: 'image/png',
        })
        .expect(201)
    ).body;
    expect(preview.drafts[0]).toMatchObject({
      type: 'figure',
      sourceFilename: 'figure.png',
    });
    const saved = await create(preview.drafts[0]);
    expect(saved.content.image.dataUrl).toBe(
      `data:image/png;base64,${bytes.toString('base64')}`,
    );
    expect(saved.description).toBe('');
    await http()
      .patch(`${path()}/${saved.id}`)
      .set('Authorization', 'Bearer test')
      .send({
        expectedVersion: 1,
        content: { image: { dataUrl: 'https://example.test/figure.png' } },
      })
      .expect(400);
  });

  it('protects signed reports from every result mutation', async () => {
    const result = await create();
    await client.query(
      "insert into workflow_step_state(project_id,step_id,state,updated_at) values($1,'report-pdf','signed',now())",
      [projectId],
    );
    await http()
      .post(path())
      .set('Authorization', 'Bearer test')
      .send(input())
      .expect(403);
    await http()
      .patch(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, title: 'Edit' })
      .expect(403);
    await http()
      .patch(`${path()}/${result.id}/section`)
      .set('Authorization', 'Bearer test')
      .send({ expectedVersion: 1, reportSectionId: null })
      .expect(403);
    await http()
      .delete(`${path()}/${result.id}`)
      .set('Authorization', 'Bearer test')
      .expect(403);
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'reject', expectedVersion: 1 })
      .expect(403);
  });

  it('allows authors to edit and reviewers/approvers to decide, with admins allowed both', async () => {
    roles = ['author'];
    const result = await create();
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'accept', expectedVersion: 1 })
      .expect(403);
    for (const role of ['reviewer', 'approver']) {
      roles = [role];
      await http()
        .post(path())
        .set('Authorization', 'Bearer test')
        .send(input())
        .expect(403);
      await http()
        .patch(`${path()}/${result.id}`)
        .set('Authorization', 'Bearer test')
        .send({ title: 'Edit', expectedVersion: 1 })
        .expect(403);
      await http()
        .delete(`${path()}/${result.id}`)
        .set('Authorization', 'Bearer test')
        .expect(403);
      await http().get(path()).set('Authorization', 'Bearer test').expect(200);
    }
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'accept', expectedVersion: 1 })
      .expect(200);
    roles = ['reviewer'];
    await http()
      .post(`${path()}/${result.id}/decisions`)
      .set('Authorization', 'Bearer test')
      .send({ decision: 'reject', expectedVersion: 2 })
      .expect(200);
  });
});
