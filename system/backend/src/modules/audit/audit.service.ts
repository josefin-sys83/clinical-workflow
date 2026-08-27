import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';

export type AuditScope = 'system' | 'company' | 'project';

export type AuditActor = {
  userId?: string | null;
  companyId?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  roles?: string[];
  isSuperadmin?: boolean;
};

export type AuditEvent = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  projectId: string | null;
  projectNumber: string | null;
  projectName: string | null;
  scope: AuditScope;
  stepId: string | null;
  type: string;
  message: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  metadata: any;
  createdAt: string;
};

export type RecordAuditEvent = {
  companyId?: string | null;
  projectId?: string | null;
  scope?: AuditScope;
  stepId?: string | null;
  type: string;
  message: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actor?: AuditActor | null;
  metadata?: any;
};

export type AuditListFilters = {
  companyId?: string;
  projectId?: string;
  stepId?: string;
  scope?: AuditScope;
  type?: string;
  entityType?: string;
  search?: string;
  limit?: number;
};

export type AuditEntityTypeFilters = Pick<AuditListFilters, 'companyId' | 'scope'>;

const SELECT_COLUMNS = `
  id,
  company_id as "companyId",
  company_name as "companyName",
  project_id as "projectId",
  project_number as "projectNumber",
  project_name as "projectName",
  scope,
  step_id as "stepId",
  type,
  message,
  entity_type as "entityType",
  entity_id as "entityId",
  entity_label as "entityLabel",
  actor_user_id as "actorUserId",
  actor_name as "actorName",
  actor_email as "actorEmail",
  actor_role as "actorRole",
  metadata,
  created_at as "createdAt"`;

@Injectable()
export class AuditService {
  /** Project-scoped compatibility endpoint used by existing workflow screens. */
  async list(projectId: string, stepId?: string): Promise<AuditEvent[]> {
    return this.queryEvents({ projectId, stepId, limit: 500 });
  }

  /**
   * Tenant-aware global listing. A normal user is always forced to their JWT company;
   * only a superadmin can remove that restriction or select another company.
   */
  async listVisibleTo(
    viewer: { companyId?: string | null; isSuperadmin?: boolean },
    filters: AuditListFilters,
  ): Promise<AuditEvent[]> {
    if (!viewer.isSuperadmin) {
      if (!viewer.companyId) throw new ForbiddenException('No company associated');
      return this.queryEvents({ ...filters, companyId: viewer.companyId });
    }
    return this.queryEvents(filters);
  }

  /**
   * Return every record type available to the viewer for the selected scope.
   * This query deliberately does not accept an entityType filter, otherwise
   * choosing one option would make all of the other dropdown options disappear.
   */
  async listEntityTypesVisibleTo(
    viewer: { companyId?: string | null; isSuperadmin?: boolean },
    filters: AuditEntityTypeFilters,
  ): Promise<string[]> {
    if (!viewer.isSuperadmin) {
      if (!viewer.companyId) throw new ForbiddenException('No company associated');
      return this.queryEntityTypes({ ...filters, companyId: viewer.companyId });
    }
    return this.queryEntityTypes(filters);
  }

  private async queryEntityTypes(filters: AuditEntityTypeFilters): Promise<string[]> {
    const values: unknown[] = [];
    const clauses = ["entity_type is not null", "btrim(entity_type) <> ''"];
    const add = (column: string, value: unknown) => {
      values.push(value);
      clauses.push(`${column} = $${values.length}`);
    };

    if (filters.companyId) add('company_id', filters.companyId);
    if (filters.scope) add('scope', filters.scope);

    const { rows } = await getPool().query<{ entityType: string }>(
      `select distinct entity_type as "entityType"
       from audit_event
       where ${clauses.join(' and ')}
       order by "entityType"`,
      values,
    );

    return rows.map((row) => row.entityType);
  }

  private async queryEvents(filters: AuditListFilters): Promise<AuditEvent[]> {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      clauses.push(`${column} = $${values.length}`);
    };

    if (filters.companyId) add('company_id', filters.companyId);
    if (filters.projectId) add('project_id', filters.projectId);
    if (filters.stepId) add('step_id', filters.stepId);
    if (filters.scope) add('scope', filters.scope);
    if (filters.type) add('type', filters.type);
    if (filters.entityType) add('entity_type', filters.entityType);
    if (filters.search?.trim()) {
      const searchValue = `%${filters.search.trim()}%`;
      const searchColumns = [
        'message', 'actor_name', 'actor_email', 'entity_label',
        'project_name', 'project_number', 'company_name', 'type',
      ];
      const searchClauses = searchColumns.map((column) => {
        values.push(searchValue);
        return `${column} ilike $${values.length}`;
      });
      clauses.push(`(${searchClauses.join(' or ')})`);
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 500);
    values.push(limit);
    const where = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';
    const { rows } = await getPool().query<AuditEvent>(
      `select ${SELECT_COLUMNS}
       from audit_event
       ${where}
       order by created_at desc, id desc
       limit $${values.length}`,
      values,
    );
    return rows;
  }

  /**
   * Insert one immutable audit event using the business operation's transaction.
   * Requiring the PoolClient prevents a state change from committing without its audit
   * evidence (or an audit event from surviving a rolled-back state change).
   */
  async record(args: RecordAuditEvent, client: PoolClient): Promise<AuditEvent> {
    const db = client;
    const id = randomUUID();
    const now = new Date().toISOString();

    let companyId = args.companyId ?? null;
    let companyName: string | null = null;
    let projectNumber: string | null = null;
    let projectName: string | null = null;

    if (args.projectId) {
      const { rows } = await db.query(
        `select p.company_id, p.project_number, p.name as project_name,
                c.name as company_name
         from projects p
         left join companies c on c.id = p.company_id
         where p.id = $1`,
        [args.projectId],
      );
      const project = rows[0];
      if (project) {
        companyId = companyId ?? project.company_id ?? null;
        companyName = project.company_name ?? null;
        projectNumber = project.project_number ?? null;
        projectName = project.project_name ?? null;
      }
    }

    if (companyId && !companyName) {
      const { rows } = await db.query(`select name from companies where id = $1`, [companyId]);
      companyName = rows[0]?.name ?? null;
    }

    const suppliedActorId = args.actor?.userId ?? null;
    let actorName = args.actor?.name ?? null;
    let actorEmail = args.actor?.email ?? null;
    let actorRole = args.actor?.role
      ?? (args.actor?.isSuperadmin ? 'superadmin' : args.actor?.roles?.[0])
      ?? null;

    if (suppliedActorId && suppliedActorId !== 'system') {
      const { rows } = await db.query(
        `select name, email,
                case when is_superadmin then 'superadmin' else system_role end as role
         from users where id::text = $1`,
        [suppliedActorId],
      );
      const user = rows[0];
      if (user) {
        actorName = user.name;
        actorEmail = user.email;
        actorRole = user.role;
      }
    }
    if (suppliedActorId === 'system') actorName = actorName ?? 'System';

    const scope: AuditScope = args.scope
      ?? (args.projectId ? 'project' : companyId ? 'company' : 'system');
    const entityType = args.entityType
      ?? inferEntityType(args.type, Boolean(args.projectId), Boolean(companyId));
    const entityId = args.entityId
      ?? args.projectId
      ?? companyId
      ?? null;
    const entityLabel = args.entityLabel
      ?? projectNumber
      ?? projectName
      ?? companyName
      ?? entityType;

    await db.query(
      `insert into audit_event (
         id, company_id, company_name, project_id, project_number, project_name,
         scope, step_id, type, message, entity_type, entity_id, entity_label,
         actor_user_id, actor_name, actor_email, actor_role, metadata, created_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
       )`,
      [
        id, companyId, companyName, args.projectId ?? null, projectNumber, projectName,
        scope, args.stepId ?? null, args.type, args.message, entityType, entityId,
        entityLabel, suppliedActorId, actorName, actorEmail, actorRole,
        args.metadata ?? {}, now,
      ],
    );

    return {
      id,
      companyId,
      companyName,
      projectId: args.projectId ?? null,
      projectNumber,
      projectName,
      scope,
      stepId: args.stepId ?? null,
      type: args.type,
      message: args.message,
      entityType,
      entityId,
      entityLabel,
      actorUserId: suppliedActorId,
      actorName,
      actorEmail,
      actorRole,
      metadata: args.metadata ?? {},
      createdAt: now,
    };
  }
}

function inferEntityType(type: string, hasProject: boolean, hasCompany: boolean): string {
  const root = type.split('.')[0];
  const aliases: Record<string, string> = {
    auth: 'user',
    password: 'user',
    profile: 'user',
    user: 'user',
    superadmin: 'superadmin',
    company: 'company',
    support: 'support_ticket',
    workflow: 'workflow_step',
    document: 'document',
    addendum: 'addendum',
    amendment: 'amendment',
    protocol: 'protocol',
    report: 'report',
    section: 'protocol_section',
    synopsis: 'synopsis',
    scope: 'scope',
    project: 'project',
  };
  return aliases[root] ?? (hasProject ? 'project' : hasCompany ? 'company' : 'system');
}
