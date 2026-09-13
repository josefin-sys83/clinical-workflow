import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';
import { AuditService, AuditActor, RecordAuditEvent } from '../audit/audit.service';
import { getReportSectionDefinitions, resolveReportMarkets } from './report-section-definitions';

type Db = Pick<PoolClient, 'query'>;
import {
  buildSections,
  iso,
  SectionChildren,
  SectionDefinition,
  sortSections,
} from './report-response';

const SECTION_COLUMNS: Record<string, string> = {
  title: 'title',
  number: 'section_number',
  order: 'position',
  helperText: 'helper_text',
  content: 'content',
  state: 'status',
  aiDraft: 'ai_draft',
  userEdited: 'user_edited',
};
const own = (v: any, k: string) => Object.prototype.hasOwnProperty.call(v, k);
function list(value: any, label: string): any[] {
  if (!Array.isArray(value)) throw new BadRequestException(`${label} must be an array`);
  return value;
}
function text(value: any, label: string): string {
  if (typeof value !== 'string' || value.includes('\0'))
    throw new BadRequestException(`${label} must be text`);
  return value;
}

@Injectable()
export class ReportsService {
  constructor(private readonly audit: AuditService) {}

  private async sectionDefinitions(projectId: string, db: Db) {
    const { rows } = await db.query(
      `select p.data->'scope' as scope,
      array(select m.code from project_markets pm join markets m on m.id=pm.market_id
        where pm.project_id=p.id order by m.code) as markets from projects p where p.id=$1`,
      [projectId],
    );
    return getReportSectionDefinitions(
      resolveReportMarkets(rows[0]?.markets ?? [], rows[0]?.scope),
    );
  }

  async ensureForProject(
    projectId: string,
    client: PoolClient,
    actor?: AuditActor,
  ): Promise<string> {
    const { rows } = await client.query(
      `insert into report(project_id,created_by_user_id) values($1,$2)
      on conflict(project_id) do update set project_id=excluded.project_id returning id`,
      [projectId, actor?.userId ?? null],
    );
    return rows[0].id;
  }

  async getByProject(projectId: string, db: Db = getPool()): Promise<any> {
    const report = await this.findReport(projectId, db);
    if (!report) return null;

    const sectionRows = await this.loadSectionRows(report.id, db);
    const definitions = await this.sectionDefinitions(projectId, db);
    const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
    sortSections(sectionRows, definitionsById);

    const children = await this.loadSectionChildren(report.id, db);
    const sections = buildSections(sectionRows, definitionsById, children);
    const consistency = await this.loadConsistency(report.id, db);

    return {
      id: report.id,
      projectId,
      version: report.version,
      sections,
      sectionDefs: definitions,
      crossConsistencyChecked: report.cross_consistency_checked,
      ...consistency,
    };
  }

  private async findReport(projectId: string, db: Db) {
    const { rows } = await db.query('select * from report where project_id=$1', [projectId]);
    return rows[0]; // { id: 'report-uuid', version: '1.0', ... } or undefined.
  }

  private async loadSectionRows(reportId: string, db: Db) {
    const { rows } = await db.query(
      'select * from report_section where report_id=$1 order by position, section_key',
      [reportId],
    );
    return rows; // [{ id: 'section-db-uuid', section_key: 'section-1', content: '<p>...</p>', ... }, ...].
  }

  private async loadSectionChildren(reportId: string, db: Db): Promise<SectionChildren> {
    const children: SectionChildren = {
      report_section_comment: [],
      report_section_issue: [],
      report_section_issue_dismissal: [],
      report_section_completeness_element: [],
    };
    const tables = Object.keys(children) as Array<keyof SectionChildren>;
    for (const table of tables) {
      children[table] = (
        await db.query(
          `select c.* from ${table} c join report_section s on s.id=c.section_id where s.report_id=$1`,
          [reportId],
        )
      ).rows;
    }
    return children;
  }

  private async loadConsistency(reportId: string, db: Db) {
    const issues = (
      await db.query(
        'select * from report_cross_consistency_issue where report_id=$1 order by position',
        [reportId],
      )
    ).rows;
    const dismissals = (
      await db.query(
        'select finding_key from report_cross_consistency_dismissal where report_id=$1',
        [reportId],
      )
    ).rows;
    return {
      crossConsistencyIssues: issues.map((issue) => ({
        section1: issue.protocol_section_title,
        section2: issue.report_section_title,
        description: issue.description,
        severity: issue.severity,
      })),
      wontFixCrossConsistencyIssues: dismissals.map((dismissal) => dismissal.finding_key),
    };
  }

  async getSignaturesByProject(projectId: string, db: Db = getPool()): Promise<any[]> {
    const { rows } = await db.query(
      `select s.* from report_signature s join report r on r.id=s.report_id
      where r.project_id=$1 order by s.signed_at, s.id`,
      [projectId],
    );
    return rows.map((s) => ({
      id: s.id,
      projectId,
      role: s.role_key,
      roleTitle: s.role_title,
      signerUserId: s.signed_by_user_id,
      signerName: s.signed_by_name,
      signerEmail: s.signed_by_email,
      signedAt: iso(s.signed_at),
      timezone: s.timezone,
      ipAddress: s.ip_address,
      documentHash: s.document_hash,
    }));
  }

  async appendSignatures(
    projectId: string,
    signatures: any[],
    actor: AuditActor | undefined,
    client: PoolClient,
  ) {
    const reportId = await this.ensureForProject(projectId, client, actor);
    const existing = new Set(
      (await this.getSignaturesByProject(projectId, client)).map((s) => s.id),
    );
    for (const s of signatures) {
      if (existing.has(s.id)) continue;
      if (!actor?.userId || s.signerUserId !== actor.userId)
        throw new ForbiddenException('Signer must be the authenticated user');
      await client.query(
        `insert into report_signature(id,report_id,role_key,role_title,signed_by_user_id,
        signed_by_name,signed_by_email,signed_at,timezone,ip_address,document_hash)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          s.id,
          reportId,
          s.role,
          s.roleTitle ?? null,
          actor.userId,
          s.signerName,
          s.signerEmail,
          s.signedAt,
          s.timezone ?? null,
          s.ipAddress,
          s.documentHash,
        ],
      );
    }
  }

  private async write<T>(
    projectId: string,
    actor: AuditActor,
    action: string,
    fn: (client: PoolClient, reportId: string) => Promise<T>,
  ): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await this.lockEditableProject(projectId, client);
      const reportId = await this.ensureForProject(projectId, client, actor);
      const result = await fn(client, reportId);
      await this.recordReportWrite(projectId, reportId, actor, action, client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  private async lockEditableProject(projectId: string, client: PoolClient) {
    const project = await client.query('select id from projects where id=$1 for update', [
      projectId,
    ]);
    if (!project.rows[0]) throw new NotFoundException('Project not found');
    const locked = await client.query(
      `select 1 from workflow_step_state where project_id=$1
        and step_id='report-pdf' and state in ('signed','final')
        union all select 1 from report_signature s join report r on r.id=s.report_id where r.project_id=$1`,
      [projectId],
    );
    if (locked.rows.length) throw new ForbiddenException('The signed report cannot be edited');
  }

  private async recordReportWrite(
    projectId: string,
    reportId: string,
    actor: AuditActor,
    action: string,
    client: PoolClient,
  ) {
    await client.query('update report set updated_at=now(), updated_by_user_id=$2 where id=$1', [
      reportId,
      actor.userId ?? null,
    ]);
    await client.query('update projects set updated_at=now() where id=$1', [projectId]);
    await this.audit.record(
      {
        projectId,
        stepId: 'report-make',
        type: action,
        message:
          {
            'report.sections.updated': 'Updated report sections',
            'report.consistency.updated': 'Updated report consistency findings',
            'report.consistency.dismissed': 'Updated report consistency decisions',
            'report.comment.added': 'Added a report section comment',
          }[action] ?? action,
        entityType: 'report',
        entityId: reportId,
        actor,
      },
      client,
    );
  }

  async updateSections(
    projectId: string,
    patches: Record<string, any>,
    actor: AuditActor,
    auditEvents: Omit<RecordAuditEvent, 'projectId' | 'actor'>[] = [],
  ): Promise<Record<string, any>> {
    if (!patches || Array.isArray(patches) || typeof patches !== 'object')
      throw new BadRequestException('sections must be an object');
    return this.write(projectId, actor, 'report.sections.updated', async (client, reportId) => {
      const definitions = await this.sectionDefinitions(projectId, client);
      for (const [key, patch] of Object.entries(patches)) {
        this.validateSectionPatch(key, patch);
        const definition = definitions.find((definition) => definition.id === key);
        const sectionId = await this.ensureSection(reportId, key, definition, actor, client);
        await this.updateSectionFields(sectionId, patch, actor, client);
        await this.updateSectionCollections(projectId, sectionId, key, patch, actor, client);
      }
      for (const event of auditEvents)
        await this.audit.record({ ...event, projectId, actor }, client);
      return (await this.getByProject(projectId, client)).sections;
    });
  }

  private validateSectionPatch(key: string, patch: any) {
    if (!key.trim() || !patch || Array.isArray(patch) || typeof patch !== 'object')
      throw new BadRequestException('Invalid section patch');
    const columns = SECTION_COLUMNS;
    const collections = ['issues', 'wontFixIssues', 'completenessElements'];
    for (const field of Object.keys(patch))
      if (!columns[field] && !collections.includes(field))
        throw new BadRequestException(`Unsupported report section field: ${field}`);
    if (
      own(patch, 'state') &&
      !['draft', 'under-review', 'approved', 'locked'].includes(patch.state)
    )
      throw new BadRequestException('Invalid section state');
    if (own(patch, 'order') && (!Number.isInteger(patch.order) || patch.order < 1))
      throw new BadRequestException('Invalid section order');
    if (own(patch, 'userEdited') && typeof patch.userEdited !== 'boolean')
      throw new BadRequestException('userEdited must be boolean');
  }

  private async ensureSection(
    reportId: string,
    key: string,
    definition: SectionDefinition | undefined,
    actor: AuditActor,
    client: PoolClient,
  ): Promise<string> {
    const { rows } = await client.query(
      `insert into report_section(report_id,section_key,title,position,section_number,created_by_user_id)
          values($1,$2,$3,coalesce($4,(select coalesce(max(position),0)+1 from report_section where report_id=$1)),$5,$6)
          on conflict(report_id,section_key) do update set section_key=excluded.section_key returning id`,
      [
        reportId,
        key,
        definition?.title ?? key,
        definition?.number ?? null,
        definition ? String(definition.number) : null,
        actor.userId ?? null,
      ],
    );

    return rows[0].id;
  }

  private async updateSectionFields(
    sectionId: string,
    patch: any,
    actor: AuditActor,
    client: PoolClient,
  ) {
    const values: any[] = [sectionId, actor.userId ?? null];
    const sets = ['updated_at=now()', 'updated_by_user_id=$2'];
    for (const [field, col] of Object.entries(SECTION_COLUMNS))
      if (own(patch, field)) {
        let value = patch[field];
        if (['content', 'title', 'helperText'].includes(field)) value = text(value, field);
        if (field === 'aiDraft' && value !== null) value = text(value, field);
        if (field === 'content' || field === 'aiDraft')
          value = value === null ? null : sanitizeSectionHtml(value);
        values.push(value);
        sets.push(`${col}=$${values.length}`);
      }
    await client.query(`update report_section set ${sets.join(',')} where id=$1`, values);
  }

  private async updateSectionCollections(
    projectId: string,
    sectionId: string,
    key: string,
    patch: any,
    actor: AuditActor,
    client: PoolClient,
  ) {
    if (own(patch, 'issues')) {
      await this.replaceSectionIssues(sectionId, patch.issues, client);
    }
    if (own(patch, 'wontFixIssues')) {
      await this.syncSectionDismissals(
        projectId,
        sectionId,
        key,
        patch.wontFixIssues,
        actor,
        client,
      );
    }
    if (own(patch, 'completenessElements')) {
      await this.replaceCompletenessElements(sectionId, patch.completenessElements, actor, client);
    }
  }

  private async replaceSectionIssues(sectionId: string, issues: any, client: PoolClient) {
    const items = list(issues, 'issues');
    await client.query('delete from report_section_issue where section_id=$1', [sectionId]);
    for (const [index, issue] of items.entries()) {
      if (!issue || !['blocker', 'warning', 'info'].includes(issue.severity))
        throw new BadRequestException('Invalid issue severity');
      await client.query(
        `insert into report_section_issue(section_id,issue_key,position,severity,title,subsection,description,reference,raised_by,raised_date,status,due_date,text_quote)
              values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          sectionId,
          issue.id ?? randomUUID(),
          index + 1,
          issue.severity,
          issue.title,
          issue.subsection,
          text(issue.description ?? issue.message ?? '', 'description'),
          issue.reference,
          issue.raisedBy,
          issue.raisedDate || null,
          issue.status ?? 'open',
          issue.dueDate,
          issue.textQuote,
        ],
      );
    }
  }

  private async syncSectionDismissals(
    projectId: string,
    sectionId: string,
    key: string,
    wontFixIssues: any,
    actor: AuditActor,
    client: PoolClient,
  ) {
    const descriptions = [
      ...new Set(list(wontFixIssues, 'wontFixIssues').map((v) => text(v, 'description'))),
    ];
    await client.query(
      'delete from report_section_issue_dismissal where section_id=$1 and not(description=any($2::text[]))',
      [sectionId, descriptions],
    );
    for (const description of descriptions)
      await client.query(
        `insert into report_section_issue_dismissal(section_id,description,decided_by_user_id,decided_at)
            values($1,$2,$3,now()) on conflict(section_id,description) do nothing`,
        [sectionId, description, actor.userId ?? null],
      );
    await this.audit.record(
      {
        projectId,
        stepId: 'report-make',
        type: 'report.section.findings.decided',
        message: `Updated finding decisions for ${key}`,
        entityType: 'report_section',
        entityId: sectionId,
        actor,
        metadata: { sectionKey: key, dismissedDescriptions: wontFixIssues },
      },
      client,
    );
  }

  private async replaceCompletenessElements(
    sectionId: string,
    completenessElements: any,
    actor: AuditActor,
    client: PoolClient,
  ) {
    const elements = list(completenessElements, 'completenessElements');
    const previous = (
      await client.query('select * from report_section_completeness_element where section_id=$1', [
        sectionId,
      ])
    ).rows;
    await client.query('delete from report_section_completeness_element where section_id=$1', [
      sectionId,
    ]);
    for (const [index, element] of elements.entries()) {
      if (
        !element ||
        !['verified', 'partially-covered', 'not-yet-verified'].includes(element.status)
      )
        throw new BadRequestException('Invalid completeness status');
      const old = previous.find((previousElement) => previousElement.element_key === element.id);
      const unchanged =
        old?.status === element.status &&
        old?.title === element.title &&
        old?.requirement_reference === (element.isoReference ?? null);
      const verified = element.status !== 'not-yet-verified';
      const identity =
        verified && !unchanged && actor.userId
          ? (await client.query('select id,name,email from users where id=$1', [actor.userId]))
              .rows[0]
          : null;
      await client.query(
        `insert into report_section_completeness_element(section_id,element_key,position,title,requirement_reference,status,
              verified_by_user_id,verified_by_name,verified_by_email,verified_by_role,verified_at,ai_suggestion)
              values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          sectionId,
          element.id ?? randomUUID(),
          index + 1,
          text(element.title, 'title'),
          element.isoReference ?? null,
          element.status,
          unchanged ? old.verified_by_user_id : identity?.id,
          unchanged ? old.verified_by_name : identity?.name,
          unchanged ? old.verified_by_email : identity?.email,
          unchanged ? old.verified_by_role : actor.role,
          unchanged ? old.verified_at : identity ? new Date() : null,
          element.aiSuggestion ?? null,
        ],
      );
    }
  }

  async updateConsistency(projectId: string, issues: any[], actor: AuditActor) {
    return this.write(projectId, actor, 'report.consistency.updated', async (client, reportId) => {
      await client.query('delete from report_cross_consistency_issue where report_id=$1', [
        reportId,
      ]);
      for (const [i, v] of list(issues, 'issues').entries()) {
        if (!v || !['blocker', 'warning'].includes(v.severity))
          throw new BadRequestException('Invalid consistency severity');
        await client.query(
          `insert into report_cross_consistency_issue(report_id,position,protocol_section_title,report_section_title,description,severity)
          values($1,$2,$3,$4,$5,$6)`,
          [
            reportId,
            i + 1,
            text(v.section1 ?? '', 'section1'),
            text(v.section2 ?? '', 'section2'),
            text(v.description, 'description'),
            v.severity,
          ],
        );
      }
      await client.query('update report set cross_consistency_checked=true where id=$1', [
        reportId,
      ]);
    });
  }

  async dismissConsistency(projectId: string, keys: string[], actor: AuditActor) {
    return this.write(
      projectId,
      actor,
      'report.consistency.dismissed',
      async (client, reportId) => {
        const ids = [...new Set(list(keys, 'findingKeys').map((v) => text(v, 'findingKey')))];
        await client.query(
          'delete from report_cross_consistency_dismissal where report_id=$1 and not(finding_key=any($2::text[]))',
          [reportId, ids],
        );
        for (const key of ids)
          await client.query(
            `insert into report_cross_consistency_dismissal(report_id,finding_key,decided_by_user_id,decided_at)
        values($1,$2,$3,now()) on conflict(report_id,finding_key) do nothing`,
            [reportId, key, actor.userId ?? null],
          );
        await this.audit.record(
          {
            projectId,
            stepId: 'report-make',
            type: 'report.consistency.findings.decided',
            message: 'Updated cross-consistency finding decisions',
            entityType: 'report',
            entityId: reportId,
            actor,
            metadata: { findingKeys: ids },
          },
          client,
        );
        return { findingKeys: ids };
      },
    );
  }

  async addComment(projectId: string, key: string, body: any, actor: AuditActor) {
    return this.write(projectId, actor, 'report.comment.added', async (client, reportId) => {
      const section = (
        await client.query('select id from report_section where report_id=$1 and section_key=$2', [
          reportId,
          key,
        ])
      ).rows[0];
      if (!section) throw new NotFoundException('Report section not found');
      const content = this.validateComment(body);
      const author = (
        await client.query('select id,name,email from users where id=$1', [actor.userId])
      ).rows[0];
      if (!author) throw new ForbiddenException('Authenticated user not found');
      const parentId = await this.findParentCommentId(section.id, body.parentCommentKey, client);
      await this.insertComment(section.id, body, content, author, parentId, actor, client);
      return (await this.getByProject(projectId, client)).sections[key].comments;
    });
  }

  private validateComment(body: any): string {
    const content = text(body.content, 'content').trim();
    if (!content) throw new BadRequestException('Comment cannot be empty');
    if (!['general', 'issue', 'approval-request'].includes(body.type ?? 'general'))
      throw new BadRequestException('Invalid comment type');

    return content;
  }

  private async findParentCommentId(
    sectionId: string,
    parentCommentKey: any,
    client: PoolClient,
  ): Promise<string | null> {
    let parentId: string | null = null;
    if (parentCommentKey) {
      const parent = (
        await client.query(
          'select id from report_section_comment where section_id=$1 and comment_key=$2',
          [sectionId, text(parentCommentKey, 'parentCommentKey')],
        )
      ).rows[0];
      if (!parent) throw new NotFoundException('Parent comment not found in this section');
      parentId = parent.id;
    }

    return parentId;
  }

  private async insertComment(
    sectionId: string,
    body: any,
    content: string,
    author: any,
    parentId: string | null,
    actor: AuditActor,
    client: PoolClient,
  ) {
    const id = randomUUID();
    await client.query(
      `insert into report_section_comment(section_id,comment_key,position,author_user_id,author_name,author_email,author_role,content,comment_type,created_at,parent_comment_id)
        values($1,$2,(select coalesce(max(position),0)+1 from report_section_comment where section_id=$1),$3,$4,$5,$6,$7,$8,now(),$9)`,
      [
        sectionId,
        id,
        author.id,
        author.name,
        author.email,
        actor.role ?? actor.roles?.[0],
        content,
        body.type ?? 'general',
        parentId,
      ],
    );
  }
}
