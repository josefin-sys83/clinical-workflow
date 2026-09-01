import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { getPool } from "../../db/pg";
import { CreateProjectDto } from "./dto";
import { AdminService } from "../admin/admin.service";
import { sanitizeIncomingProjectData } from "../../common/sanitize-section-html";
import { AuditService } from "../audit/audit.service";
import type { AuditActor, RecordAuditEvent } from "../audit/audit.service";
import { ProtocolsService } from "./protocols.service";

export type ProjectAuditEvent = Omit<RecordAuditEvent, "projectId" | "actor">;

export type RiskClass = "I" | "IIa" | "IIb" | "III";

export type Project = {
  id: string;
  project_number: string;
  name: string;
  description?: string | null;
  risk: RiskClass | null;
  deviceCategory: string | null;
  status: "active" | "completed";
  data?: any;
  targetMarkets: string[];
  roles: Array<{
    title: string;
    assignedTo: Array<{ name: string; email: string }>;
  }>;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly protocols: ProtocolsService,
  ) {}

  // Resolves the authenticated user's real name/email from the DB, so callers
  // that need a trustworthy identity (e.g. electronic signatures) never have
  // to fall back to client-supplied name/email fields.
  async getUserIdentity(
    userId: string,
  ): Promise<{ id: string; name: string; email: string } | null> {
    const { rows } = await getPool().query<{
      id: string;
      name: string;
      email: string;
    }>(`select id, name, email from users where id = $1`, [userId]);
    return rows[0] ?? null;
  }

  // List views only ever render summary fields (ProjectCard reads id/name/description/status,
  // plus the two projectData submission-target dates for its Timeline toggle) — never the full
  // report/synopsis content that lives in `data`. Pulling the whole jsonb blob per
  // row here made the dashboard load scale with total document content instead of project count
  // (11.3MB for 100 realistic projects). Project detail's get() still selects the full `data`.
  private static readonly LIST_SUMMARY_DATA_SQL = `
    jsonb_build_object(
      'projectData', jsonb_build_object(
        'ethicsSubmissionTarget', data#>>'{projectData,ethicsSubmissionTarget}',
        'regulatorySubmissionTarget', data#>>'{projectData,regulatorySubmissionTarget}'
      )
    ) as data`;

  async list(companyId?: string, isSuperadmin?: boolean): Promise<Project[]> {
    if (isSuperadmin) {
      const { rows } = await getPool().query(
        `select id, name, description, status, ${ProjectsService.LIST_SUMMARY_DATA_SQL},
                created_at as "createdAt", updated_at as "updatedAt"
         from projects order by created_at desc`,
      );
      return rows;
    }
    const { rows } = await getPool().query(
      `select id, name, description, status, ${ProjectsService.LIST_SUMMARY_DATA_SQL},
              created_at as "createdAt", updated_at as "updatedAt"
       from projects where company_id=$1 order by created_at desc`,
      [companyId ?? null],
    );
    return rows;
  }

  async listCompleted(
    companyId?: string,
    isSuperadmin?: boolean,
  ): Promise<Project[]> {
    if (isSuperadmin) {
      const { rows } = await getPool().query(
        `select id, name, description, status, ${ProjectsService.LIST_SUMMARY_DATA_SQL},
                created_at as "createdAt", updated_at as "updatedAt"
         from projects where status='completed' order by created_at desc`,
      );
      return rows;
    }
    const { rows } = await getPool().query(
      `select id, name, description, status, ${ProjectsService.LIST_SUMMARY_DATA_SQL},
              created_at as "createdAt", updated_at as "updatedAt"
       from projects where status='completed' and company_id=$1 order by created_at desc`,
      [companyId ?? null],
    );
    return rows;
  }

  async get(id: string): Promise<Project> {
    const { rows } = await getPool().query(
      `select id, name, description, project_number, risk,
              device_category as "deviceCategory", status, data,
              created_at as "createdAt", updated_at as "updatedAt"
       from projects where id=$1`,
      [id],
    );
    const p = rows[0];
    if (!p) throw new NotFoundException("Project not found");

    const { rows: marketRows } = await getPool().query<{ code: string }>(
      `select m.code
       from project_markets pm
       join markets m on m.id = pm.market_id
       where pm.project_id = $1
       order by m.code`,
      [id],
    );

    const { rows: memberRows } = await getPool().query<{
      role_title: string;
      name: string;
      email: string;
    }>(
      `select pm.role_title, u.name, u.email
       from project_members pm
       join users u on u.id = pm.user_id
       where pm.project_id = $1
       order by pm.role_title, u.name, u.email`,
      [id],
    );

    const rolesByTitle = new Map<
      string,
      Array<{ name: string; email: string }>
    >();
    for (const member of memberRows) {
      const assignedTo = rolesByTitle.get(member.role_title) ?? [];
      assignedTo.push({ name: member.name, email: member.email });
      rolesByTitle.set(member.role_title, assignedTo);
    }

    const protocol = await this.protocols.getByProject(id);
    const protocolSignatures = await this.protocols.getSignaturesByProject(id);
    const projectData = p.data && typeof p.data === "object" ? p.data : {};
    const reportSignatures = Array.isArray(projectData.signatures)
      ? projectData.signatures.filter((signature: any) => String(signature?.role || "").startsWith("report-"))
      : [];
    const responseData = {
      ...projectData,
      signatures: [...reportSignatures, ...protocolSignatures],
    };

    return {
      ...p,
      // Compatibility response only. Protocol rows are authoritative; this does not
      // put the protocol back into projects.data in PostgreSQL.
      data: protocol ? { ...responseData, protocol } : responseData,
      targetMarkets: marketRows.map((row) => row.code),
      roles: [...rolesByTitle.entries()].map(([title, assignedTo]) => ({
        title,
        assignedTo,
      })),
    };
  }

  async listProtocolAttachmentsForAnalysis(projectId: string): Promise<Array<{
    appendixNumber: number;
    filename: string;
    description: string | null;
  }>> {
    const { rows } = await getPool().query(
      `select appendix_number, filename, description
       from protocol_attachment pa
       join protocol pr on pr.id = pa.protocol_id
       where pr.project_id = $1
       order by appendix_number asc`,
      [projectId],
    );
    return rows.map((row) => ({
      appendixNumber: Number(row.appendix_number),
      filename: String(row.filename),
      description: row.description ?? null,
    }));
  }

  private async generateProjectNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();

    // Advisory lock for the specific year.
    // Blocks all other concurrent requests for the same year until this transaction commits.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `project-number-${year}`,
    ]);

    const { rows } = await client.query(
      `SELECT COALESCE(
       MAX((substring(project_number from '^\\d{4}-(\\d+)$'))::int),
       0
     ) AS max_seq
     FROM projects
     WHERE project_number LIKE $1`,
      [`${year}-%`],
    );

    const next = Number(rows[0].max_seq) + 1;
    return `${year}-${String(next).padStart(3, "0")}`;
  }

  private async replaceProjectMarkets(
    client: PoolClient,
    projectId: string,
    requestedCodes: string[],
  ): Promise<string[]> {
    const marketCodes = [...new Set(requestedCodes)];
    const { rows: marketRows } = await client.query<{
      id: number;
      code: string;
    }>(`SELECT id, code FROM markets WHERE code = ANY($1::text[])`, [
      marketCodes,
    ]);

    if (marketRows.length !== marketCodes.length) {
      const foundCodes = new Set(marketRows.map((row) => row.code));
      const unknownCodes = marketCodes.filter((code) => !foundCodes.has(code));
      throw new BadRequestException(
        `Unknown target market code(s): ${unknownCodes.join(", ")}`,
      );
    }

    await client.query(`DELETE FROM project_markets WHERE project_id = $1`, [
      projectId,
    ]);
    if (marketRows.length > 0) {
      const valuesClause = marketRows
        .map((_, index) => `($1, $${index + 2})`)
        .join(",");
      await client.query(
        `INSERT INTO project_markets (project_id, market_id)
         VALUES ${valuesClause}`,
        [projectId, ...marketRows.map((row) => row.id)],
      );
    }

    return marketCodes;
  }

  private async replaceProjectStandards(
    client: PoolClient,
    projectId: string,
    marketCodes: string[],
    risk: RiskClass | null,
    deviceCategory: string | null,
  ): Promise<void> {
    const { rows } = await client.query(
      `SELECT s.id
       FROM standard_rules sr
       JOIN standards s ON s.id = sr.standard_id
       WHERE
         sr.always_applies = true
         OR (
           (sr.market_codes IS NULL OR sr.market_codes && $1::text[])
           AND (sr.risk_classes IS NULL OR $2 = ANY(sr.risk_classes))
           AND (sr.device_categories IS NULL OR $3 = ANY(sr.device_categories))
         )
       GROUP BY s.id`,
      [marketCodes, risk, deviceCategory],
    );
    const standardIds = rows.map((standard: any) => standard.id);

    await client.query(`DELETE FROM project_standards WHERE project_id = $1`, [
      projectId,
    ]);
    if (standardIds.length > 0) {
      const valuesClause = standardIds
        .map((_, index) => `($1, $${index + 2})`)
        .join(",");
      await client.query(
        `INSERT INTO project_standards (project_id, standard_id)
         VALUES ${valuesClause}`,
        [projectId, ...standardIds],
      );
    }
  }

  async create(
    dto: CreateProjectDto,
    companyId?: string,
    actor?: AuditActor,
  ): Promise<Project> {
    const now = new Date().toISOString();
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      if (companyId) {
        await this.admin.enforceProjectLimit(companyId, client);
        await this.admin.touchLastActive(companyId, client);
      }

      const projectNumber = await this.generateProjectNumber(client);
      const id = crypto.randomUUID();

      const incomingData = {
        projectData: {
          deviceName: dto.deviceName,
        },
      };

      const data = sanitizeIncomingProjectData(incomingData);

      await client.query(
        `INSERT INTO projects (
         id,
         project_number,
         name,
         description,
         status,
         company_id,
         risk,
         device_category,
         data,
         created_at,
         updated_at
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         'active',
         $5,
         $6,
         $7,
         $8,
         $9,
         $9
       )`,
        [
          id,
          projectNumber,
          dto.name,
          dto.description ?? null,
          companyId ?? null,
          dto.risk ?? null,
          dto.deviceCategory ?? null,
          JSON.stringify(data),
          now,
        ],
      );

      // A project owns one protocol aggregate from creation onward. Sections and
      // amendments are added later, but attachments/artifacts can already use this FK.
      await this.protocols.ensureForProject(id, client);

      await this.replaceProjectStandards(
        client,
        id,
        [], // No markets have been selected during initial creation.
        dto.risk ?? null,
        dto.deviceCategory ?? null,
      );

      await client.query(
        `INSERT INTO workflow_step_state (
         project_id,
         step_id,
         state,
         updated_at
       )
       SELECT
         $1,
         step_id,
         'draft',
         $2
       FROM workflow_steps`,
        [id, now],
      );

      // This insert uses the same transaction client as project creation. A project
      // therefore cannot commit without its creation event, and an audit failure rolls
      // the complete create operation back.
      await this.audit.record({
        companyId: companyId ?? null,
        projectId: id,
        scope: "project",
        stepId: "project-setup",
        type: "project.created",
        message: `Created project ${projectNumber}: ${dto.name}`,
        entityType: "project",
        entityId: id,
        entityLabel: `${projectNumber}: ${dto.name}`,
        actor: actor ?? null,
        metadata: {
          projectNumber,
          projectName: dto.name,
          deviceName: dto.deviceName ?? null,
        },
      }, client);

      await client.query("COMMIT");

      return this.get(id);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  async updateReportSections(
    id: string,
    sectionPatches: Record<string, Record<string, any>>,
    actor?: AuditActor,
    auditEvents: ProjectAuditEvent[] = [],
  ): Promise<Record<string, any>> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ data: any }>(
        'SELECT data FROM projects WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!rows[0]) throw new NotFoundException('Project not found');

      const projectData = rows[0].data || {};
      const report = projectData.report || {};
      const rawSections = report.sections || {};
      const sections: Record<string, any> = Array.isArray(rawSections)
        ? Object.fromEntries(rawSections.filter((section: any) => section?.id).map((section: any) => [section.id, section]))
        : { ...rawSections };
      const sanitizedPatches = sanitizeIncomingProjectData({
        report: { sections: sectionPatches },
      })?.report?.sections || {};

      for (const [sectionId, patch] of Object.entries(sanitizedPatches)) {
        sections[sectionId] = { ...(sections[sectionId] || {}), ...(patch as Record<string, any>) };
      }

      const updatedData = {
        ...projectData,
        report: { ...report, sections },
      };
      await client.query(
        'UPDATE projects SET data = $2, updated_at = $3 WHERE id = $1',
        [id, JSON.stringify(updatedData), new Date().toISOString()],
      );
      await this.recordProjectMutation(
        client,
        id,
        actor,
        auditEvents,
        'Updated report sections',
        Object.keys(sectionPatches),
      );
      await client.query('COMMIT');
      return sections;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async completeSynopsis(
    id: string,
    synopsisPatch: Record<string, any>,
    actor?: AuditActor,
  ): Promise<{ ok: true }> {
    const checklist = synopsisPatch?.readinessChecklist;
    if (!Array.isArray(checklist) || checklist.length === 0) {
      throw new BadRequestException("Synopsis readiness checklist is required");
    }
    const incomplete = checklist.filter((item: any) =>
      item?.status !== "complete" && item?.status !== "not-applicable",
    );
    if (incomplete.length > 0) {
      throw new BadRequestException("All Synopsis readiness items must be resolved before completion");
    }

    const sanitized = sanitizeIncomingProjectData({ synopsis: synopsisPatch })?.synopsis;
    if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
      throw new BadRequestException("Invalid Synopsis data");
    }

    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows: projectRows } = await client.query<{ data: any }>(
        "SELECT data FROM projects WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!projectRows[0]) throw new NotFoundException("Project not found");

      const { rows: workflowRows } = await client.query<{ state: string }>(
        `SELECT state FROM workflow_step_state
         WHERE project_id = $1 AND step_id = 'synopsis'
         FOR UPDATE`,
        [id],
      );
      if (!workflowRows[0]) throw new NotFoundException("Synopsis workflow state not initialized");

      const previousState = workflowRows[0].state;
      const projectData = projectRows[0].data || {};
      const completedSynopsis = {
        ...(projectData.synopsis || {}),
        ...sanitized,
        synopsisStatus: "completed",
      };
      const now = new Date().toISOString();

      await client.query(
        "UPDATE projects SET data = $2, updated_at = $3 WHERE id = $1",
        [id, JSON.stringify({ ...projectData, synopsis: completedSynopsis }), now],
      );
      await client.query(
        `UPDATE workflow_step_state
         SET state = 'approved', updated_at = $2
         WHERE project_id = $1 AND step_id = 'synopsis'`,
        [id, now],
      );
      await this.audit.record({
        projectId: id,
        stepId: "synopsis",
        type: "synopsis.completed",
        message: "Completed Synopsis and unlocked Scope",
        actor: actor ?? { name: "System" },
        entityType: "workflow_step",
        entityId: "synopsis",
        entityLabel: "Synopsis",
        metadata: { previousState, nextState: "approved" },
      }, client);

      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string;
      risk?: RiskClass | null;
      deviceCategory?: string | null;
      targetMarkets?: string[];
      roles?: Array<{
        title: string;
        assignedTo?: Array<{ name?: string; email?: string }>;
      }>;
      data?: any;
    },
    actor?: AuditActor,
    auditEvents?: ProjectAuditEvent[],
  ): Promise<Project> {
    const now = new Date().toISOString();
    const hasProtocolPatch = Boolean(
      patch.data && Object.prototype.hasOwnProperty.call(patch.data, "protocol"),
    );
    if (patch.data && Object.prototype.hasOwnProperty.call(patch.data, "signatures")) {
      throw new BadRequestException("Electronic signatures must use the signing endpoint");
    }
    const incomingProtocol = hasProtocolPatch ? patch.data.protocol : undefined;
    const nonProtocolPatch = patch.data ? { ...patch.data } : undefined;
    if (nonProtocolPatch) delete nonProtocolPatch.protocol;
    const sanitizedData = nonProtocolPatch && Object.keys(nonProtocolPatch).length > 0
      ? sanitizeIncomingProjectData(nonProtocolPatch)
      : undefined;
    const hasRelationalSetupPatch =
      patch.risk !== undefined ||
      patch.deviceCategory !== undefined ||
      patch.targetMarkets !== undefined ||
      patch.roles !== undefined;

    if (!sanitizedData && !hasRelationalSetupPatch && !hasProtocolPatch) {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `UPDATE projects SET
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           updated_at = $4
         WHERE id = $1
         RETURNING id`,
          [id, patch.name ?? null, patch.description ?? null, now],
        );
        if (!result.rows[0]) throw new NotFoundException("Project not found");
        await this.recordProjectMutation(
          client,
          id,
          actor,
          auditEvents,
          "Updated project details",
          Object.keys(patch),
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
      return this.get(id);
    }

    const client = await getPool().connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<{
        data: any;
        risk: RiskClass | null;
        device_category: string | null;
      }>(
        `SELECT data, risk, device_category FROM projects WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!rows[0]) throw new NotFoundException("Project not found");

      const existingData = rows[0].data || {};
      const mergedData: any = { ...existingData };
      // Remove any legacy duplicate left by a partially-applied deployment. The
      // migration performs the same cleanup for all existing projects.
      delete mergedData.protocol;

      if (sanitizedData) {
        for (const key of Object.keys(sanitizedData)) {
          if (
            sanitizedData[key] !== null &&
            typeof sanitizedData[key] === "object" &&
            !Array.isArray(sanitizedData[key]) &&
            existingData[key] !== null &&
            typeof existingData[key] === "object" &&
            !Array.isArray(existingData[key])
          ) {
            mergedData[key] = { ...existingData[key], ...sanitizedData[key] };
          } else {
            mergedData[key] = sanitizedData[key];
          }
        }
      }


      if (hasProtocolPatch) {
        await this.protocols.save(id, incomingProtocol, actor, client);
      }

      const requirementAuditEvents = this.deriveRequirementAuditEvents(
        existingData,
        mergedData,
      );

      const risk = patch.risk !== undefined ? patch.risk : rows[0].risk;
      const deviceCategory =
        patch.deviceCategory !== undefined
          ? patch.deviceCategory
          : rows[0].device_category;

      await client.query(
        `UPDATE projects SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         risk = $4,
         device_category = $5,
         data = $6,
         updated_at = $7
       WHERE id = $1`,
        [
          id,
          patch.name ?? null,
          patch.description ?? null,
          risk,
          deviceCategory,
          JSON.stringify(mergedData),
          now,
        ],
      );

      let marketCodes: string[];
      if (patch.targetMarkets !== undefined) {
        marketCodes = await this.replaceProjectMarkets(
          client,
          id,
          patch.targetMarkets,
        );
      } else {
        const { rows: existingMarkets } = await client.query<{ code: string }>(
          `SELECT m.code
         FROM project_markets pm
         JOIN markets m ON m.id = pm.market_id
         WHERE pm.project_id = $1`,
          [id],
        );
        marketCodes = existingMarkets.map((row) => row.code);
      }

      // Standards are derived from the authoritative relational setup values.
      await this.replaceProjectStandards(
        client,
        id,
        marketCodes,
        risk,
        deviceCategory,
      );

      if (patch.roles !== undefined) {
        await this.syncProjectMembers(id, patch.roles, client);
      }

      await this.recordProjectMutation(
        client,
        id,
        actor,
        [...(auditEvents ?? []), ...requirementAuditEvents],
        "Updated project data",
        Object.keys(patch),
      );

      await client.query("COMMIT");
      return this.get(id);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  private deriveRequirementAuditEvents(beforeData: any, afterData: any): ProjectAuditEvent[] {
    const before = Array.isArray(beforeData?.scope?.requirements)
      ? beforeData.scope.requirements
      : [];
    const after = Array.isArray(afterData?.scope?.requirements)
      ? afterData.scope.requirements
      : [];
    const beforeById = new Map<string, any>(
      before.map((requirement: any) => [String(requirement.id), requirement]),
    );
    const afterById = new Map<string, any>(
      after.map((requirement: any) => [String(requirement.id), requirement]),
    );
    const events: ProjectAuditEvent[] = [];

    for (const requirement of before) {
      const requirementId = String(requirement.id);
      if (afterById.has(requirementId)) continue;
      if (requirement.source === "mandatory") {
        throw new BadRequestException(
          `Mandatory requirement cannot be removed: ${requirement.title ?? requirementId}`,
        );
      }
      events.push({
        stepId: "scope",
        type: "scope.requirement.removed",
        message: `Removed requirement: ${requirement.title ?? requirementId}`,
        entityType: "requirement",
        entityId: requirementId,
        entityLabel: requirement.title ?? requirementId,
        metadata: {
          requirementId,
          requirementTitle: requirement.title ?? null,
          requirementSource: requirement.source ?? null,
          previousStatus: requirement.status ?? null,
        },
      });
    }

    for (const requirement of after) {
      const requirementId = String(requirement.id);
      const previous = beforeById.get(requirementId);
      if (!previous) {
        events.push({
          stepId: "scope",
          type: requirement.source === "user-defined"
            ? "scope.requirement.custom_added"
            : "scope.requirement.added",
          message: `Added requirement: ${requirement.title ?? requirementId}`,
          entityType: "requirement",
          entityId: requirementId,
          entityLabel: requirement.title ?? requirementId,
          metadata: {
            requirementId,
            requirementTitle: requirement.title ?? null,
            requirementSource: requirement.source ?? null,
            status: requirement.status ?? null,
          },
        });
        continue;
      }

      if (previous.status !== requirement.status) {
        const statusLabel = requirement.status === "not-applicable"
          ? "marked not applicable"
          : requirement.status === "accepted"
            ? "accepted"
            : `changed to ${requirement.status}`;
        events.push({
          stepId: "scope",
          type: `scope.requirement.${String(requirement.status).replace(/-/g, "_")}`,
          message: `Requirement ${statusLabel}: ${requirement.title ?? requirementId}`,
          entityType: "requirement",
          entityId: requirementId,
          entityLabel: requirement.title ?? requirementId,
          metadata: {
            requirementId,
            requirementTitle: requirement.title ?? null,
            beforeStatus: previous.status ?? null,
            afterStatus: requirement.status ?? null,
            justification: requirement.justification ?? null,
          },
        });
      }
    }

    return events;
  }

  private async recordProjectMutation(
    client: PoolClient,
    projectId: string,
    actor: AuditActor | undefined,
    auditEvents: ProjectAuditEvent[] | undefined,
    defaultMessage: string,
    changedFields: string[],
  ): Promise<void> {
    const events = auditEvents?.length
      ? auditEvents
      : [{
          type: "project.updated",
          message: defaultMessage,
          entityType: "project",
          entityId: projectId,
          metadata: { changedFields },
        }];

    for (const event of events) {
      await this.audit.record({
        ...event,
        projectId,
        actor: actor ?? { name: "System" },
      }, client);
    }
  }

  async recordProjectEvent(
    projectId: string,
    event: ProjectAuditEvent,
    actor?: AuditActor,
  ): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await this.audit.record({
        ...event,
        projectId,
        actor: actor ?? { name: "System" },
      }, client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async forceProtocolDraft(
    projectId: string,
    sectionTitles: readonly string[],
    actor: AuditActor,
  ): Promise<any> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `select id from projects where id = $1 for update`,
        [projectId],
      );
      if (!rows[0]) throw new NotFoundException("Project not found");

      const existing = await this.protocols.getByProject(projectId, client);
      if (existing?.sections?.length) {
        await client.query("ROLLBACK");
        return {
          ...existing,
          bypassed: false,
          message: "Protocol sections already exist",
        };
      }

      const now = new Date().toISOString();
      const draft = {
        ...(existing || {}),
        protocolId: existing?.protocolId || `CIP-DEV-${new Date().getFullYear()}-${projectId.slice(0, 8).toUpperCase()}`,
        version: existing?.version || "1.0",
        status: "draft",
        amendments: existing?.amendments || [],
        sections: sectionTitles.map((title, index) => ({
          id: String(index + 1),
          number: String(index + 1),
          title,
          content: "Development draft — replace this placeholder with protocol content.",
          status: "draft",
          approvalStatus: "draft",
          locked: false,
          aiGenerated: false,
          issues: [],
          requiredElements: [],
          comments: [],
          createdAt: now,
          updatedAt: now,
        })),
      };

      await this.protocols.save(projectId, draft, actor, client);
      const created = await this.protocols.getByProject(projectId, client);
      await this.audit.record({
        projectId,
        stepId: "protocol-make",
        type: "workflow.bypass",
        message: "Created editable protocol draft sections without AI using the admin bypass",
        actor,
        entityType: "protocol",
        entityId: projectId,
        entityLabel: "Protocol development draft",
        metadata: {
          bypassedAi: true,
          sectionCount: sectionTitles.length,
          workflowStateChanged: false,
        },
      }, client);
      await client.query("COMMIT");

      return {
        ...created,
        bypassed: true,
        message: "Protocol development draft created without AI",
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  async getRequirements(
    risk: string,
    deviceCategory: string,
    marketCodes: string[],
  ): Promise<any> {
    // Get frameworks from markets table
    const marketsResult = await getPool().query(
      `SELECT code, framework FROM markets WHERE code = ANY($1::text[])`,
      [marketCodes],
    );
    const frameworks = marketsResult.rows.map((r) => r.framework);

    // Get standards based on standard_rules
    const rulesResult = await getPool().query(
      `SELECT s.id, s.code, s.title
   FROM standard_rules sr
   JOIN standards s ON s.id = sr.standard_id
   WHERE
     sr.always_applies = true
     OR (
       (sr.market_codes IS NULL OR sr.market_codes && $1::text[])
       AND
       (sr.risk_classes IS NULL OR $2 = ANY(sr.risk_classes))
       AND
       (sr.device_categories IS NULL OR $3 = ANY(sr.device_categories))
     )
   GROUP BY s.id, s.code, s.title
   ORDER BY s.code`,
      [marketCodes, risk, deviceCategory],
    );
    const standards = rulesResult.rows;

    return { frameworks, standards };
  }

  async getProjectStandards(projectId: string): Promise<
    Array<{
      id: number;
      code: string;
      title: string;
    }>
  > {
    const { rows } = await getPool().query(
      `SELECT s.id, s.code, s.title
       FROM project_standards ps
       JOIN standards s ON s.id = ps.standard_id
       WHERE ps.project_id = $1
       ORDER BY s.code`,
      [projectId],
    );

    return rows;
  }

  async getMarkets(): Promise<any> {
    const { rows } = await getPool().query(
      `SELECT code, name, framework FROM markets ORDER BY name`,
    );
    return rows;
  }
  // Keeps project_members (the real, queryable source of "who holds what role on this
  // project" — see settings.service.ts getCompanyData()) in sync with the top-level
  // relational role-assignment patch. A person only becomes a project_members row once
  // their email resolves to a real user in the project's own company — the Project Setup
  // UI's PersonAutocomplete only lets you pick real users, but this is the actual
  // enforcement point, since the JSON blob itself can still hold arbitrary free text.
  // Reconciles the full set every call (insert missing, delete stale) since the caller
  // always submits the complete current roles array, not a diff.
  private async syncProjectMembers(
    projectId: string,
    roles: Array<{ title: string; assignedTo?: Array<{ email?: string }> }>,
    client: PoolClient,
  ): Promise<void> {
    const db = client;
    const { rows: projectRows } = await db.query(
      `select company_id from projects where id = $1`,
      [projectId],
    );
    const companyId = projectRows[0]?.company_id;
    if (!companyId) return;

    const emails = new Set<string>();
    for (const role of roles) {
      for (const person of role.assignedTo ?? []) {
        const email = person?.email?.trim().toLowerCase();
        if (email) emails.add(email);
      }
    }

    const userIdByEmail = new Map<string, string>();
    if (emails.size) {
      const { rows } = await db.query(
        `select id, email from users where company_id = $1 and lower(email) = any($2::text[])`,
        [companyId, [...emails]],
      );
      for (const r of rows as Array<{ id: string; email: string }>) {
        userIdByEmail.set(r.email.toLowerCase(), r.id);
      }
    }

    const desired = new Map<string, { userId: string; roleTitle: string }>();
    for (const role of roles) {
      for (const person of role.assignedTo ?? []) {
        const email = person?.email?.trim().toLowerCase();
        const userId = email ? userIdByEmail.get(email) : undefined;
        if (!userId) continue;
        desired.set(`${userId}:${role.title}`, {
          userId,
          roleTitle: role.title,
        });
      }
    }

    const { rows: existingRows } = await db.query(
      `select user_id, role_title from project_members where project_id = $1`,
      [projectId],
    );
    const existingMembers = existingRows as Array<{
      user_id: string;
      role_title: string;
    }>;

    const toInsert = [...desired.values()].filter(
      (d) =>
        !existingMembers.some(
          (r) => r.user_id === d.userId && r.role_title === d.roleTitle,
        ),
    );
    const toDelete = existingMembers.filter(
      (r) => !desired.has(`${r.user_id}:${r.role_title}`),
    );

    if (toInsert.length) {
      const params: any[] = [];
      const placeholders = toInsert.map((d) => {
        params.push(projectId, d.userId, d.roleTitle);
        return `($${params.length - 2}, $${params.length - 1}, $${params.length})`;
      });
      await db.query(
        `insert into project_members (project_id, user_id, role_title) values ${placeholders.join(", ")}
         on conflict (project_id, user_id, role_title) do nothing`,
        params,
      );
    }

    for (const row of toDelete) {
      await db.query(
        `delete from project_members where project_id = $1 and user_id = $2 and role_title = $3`,
        [projectId, row.user_id, row.role_title],
      );
    }
  }

  // Read-modify-write helpers like createAmendment() must mutate the current protocol
  // while the owning project is locked. The protocol is relational now; this method
  // preserves the existing callback API while storing the result in normalized tables.
  async updateProtocolAtomic(
    id: string,
    mutate: (protocol: any, data: any) => any,
    actor?: AuditActor,
    auditEvent?: ProjectAuditEvent | (() => ProjectAuditEvent),
  ): Promise<Project> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `select data from projects where id=$1 for update`,
        [id],
      );
      if (!rows[0]) {
        throw new NotFoundException("Project not found");
      }
      const existingData = rows[0].data || {};
      const protocol = await this.protocols.getByProject(id, client) || {};
      const newProtocol = mutate(protocol, existingData);
      await this.protocols.save(id, newProtocol, actor, client);
      await client.query(
        `update projects set data=data-'protocol', updated_at=$2 where id=$1`,
        [id, now],
      );
      const resolvedAuditEvent = typeof auditEvent === "function" ? auditEvent() : auditEvent;
      await this.audit.record({
        projectId: id,
        type: "protocol.updated",
        message: "Updated protocol data",
        entityType: "protocol",
        entityId: id,
        entityLabel: "Protocol",
        metadata: {},
        ...resolvedAuditEvent,
        actor: actor ?? { name: "System" },
      }, client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    return this.get(id);
  }

  async updateProtocolSection(
    projectId: string,
    sectionId: string,
    values: {
      content: string;
      previousContent?: string;
      reason?: string;
      approvalStatus?: string;
      approvedBy?: string;
      approvedAt?: string;
    },
    actor?: AuditActor,
  ): Promise<{ ok: true; updatedAt: string }> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const project = await client.query(
        `select id from projects where id = $1 for update`,
        [projectId],
      );
      if (!project.rows[0]) throw new NotFoundException("Project not found");

      const result = await this.protocols.updateSectionContent(
        projectId,
        sectionId,
        values,
        actor,
        client,
      );
      await client.query(
        `update projects set updated_at = $2, data = data - 'protocol' where id = $1`,
        [projectId, result.updatedAt],
      );

      const previousContent = values.previousContent || "";
      const hasTable = (text: string) => /^\|.+\|/m.test(text);
      const hasImage = (text: string) => /!\[.*?\]\(.*?\)/.test(text);
      const structuralNotes: string[] = [];
      if (!hasTable(previousContent) && hasTable(result.content)) structuralNotes.push("Table added");
      if (hasTable(previousContent) && !hasTable(result.content)) structuralNotes.push("Table removed");
      if (!hasImage(previousContent) && hasImage(result.content)) structuralNotes.push("Image added");
      if (hasImage(previousContent) && !hasImage(result.content)) structuralNotes.push("Image removed");
      const suffix = structuralNotes.length ? ` (${structuralNotes.join(", ")})` : "";

      await this.audit.record({
        projectId,
        stepId: "protocol-make",
        type: "section.content.updated",
        message: `Section "${result.title}" content updated${suffix}`,
        entityType: "protocol_section",
        entityId: sectionId,
        entityLabel: result.title,
        actor: actor ?? { name: "System" },
        metadata: {
          sectionId,
          sectionTitle: result.title,
          updatedAt: result.updatedAt,
          editedBy: actor?.name ?? "Unknown user",
          reason: values.reason || "",
          previousContent,
          newContent: result.content,
        },
      }, client);

      await client.query("COMMIT");
      return { ok: true, updatedAt: result.updatedAt };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Protocol signatures are immutable relational rows. Report signatures remain in
  // projects.data until the report domain is normalized, while this compatibility
  // method returns the combined array expected by the current frontend.
  async updateSignaturesAtomic(
    id: string,
    mutate: (signatures: any[], data: any) => any[],
    actor?: AuditActor,
    auditEvent?: ProjectAuditEvent,
  ): Promise<{ signatures: any[] }> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `select data from projects where id=$1 for update`,
        [id],
      );
      if (!rows[0]) {
        throw new NotFoundException("Project not found");
      }
      const existingData = rows[0].data || {};
      const reportSignatures: any[] = Array.isArray(existingData.signatures)
        ? existingData.signatures.filter((signature: any) => String(signature?.role || "").startsWith("report-"))
        : [];
      const protocolSignatures = await this.protocols.getSignaturesByProject(id, client);
      const existingSignatures = [...reportSignatures, ...protocolSignatures];
      const newSignatures = mutate(existingSignatures, existingData);
      const nextReportSignatures = newSignatures.filter(
        (signature: any) => String(signature?.role || "").startsWith("report-"),
      );
      const nextProtocolSignatures = newSignatures.filter(
        (signature: any) => !String(signature?.role || "").startsWith("report-"),
      );
      await this.protocols.appendSignatures(id, nextProtocolSignatures, actor, client);
      const mergedData = { ...existingData, signatures: nextReportSignatures };
      delete mergedData.protocol;
      await client.query(
        `update projects set data=$2, updated_at=$3 where id=$1`,
        [id, JSON.stringify(mergedData), now],
      );
      await this.audit.record({
        projectId: id,
        type: "project.signatures.updated",
        message: "Updated electronic signatures",
        entityType: "signature",
        entityId: id,
        entityLabel: "Electronic signatures",
        ...auditEvent,
        actor: actor ?? { name: "System" },
        metadata: {
          signatureCount: newSignatures.length,
          ...(auditEvent?.metadata ?? {}),
        },
      }, client);
      await client.query("COMMIT");
      return { signatures: newSignatures };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Was previously a plain get() + raw UPDATE with no locking or transaction — the same
  // unlocked read-modify-write shape that F8 fixed for signatures, just on data.synopsisFile
  // instead of data.signatures. A concurrent write to any other part of `data` (e.g. a
  // PATCH saving unrelated section content) landing between this method's read and its
  // write would have its change silently discarded once this method's write lands. Now
  // uses the same `for update`-locked read-modify-write as updateProtocolAtomic()/
  // updateSignaturesAtomic() above.
  async saveSynopsisFile(
    projectId: string,
    fileName: string,
    bytes: Buffer,
    mimeType: string,
    actor?: AuditActor,
  ): Promise<void> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `select data from projects where id=$1 for update`,
        [projectId],
      );
      if (!rows[0]) {
        await client.query("ROLLBACK");
        throw new NotFoundException("Project not found");
      }
      const existingData = rows[0].data || {};
      const mergedData = {
        ...existingData,
        synopsisFile: {
          fileName,
          mimeType,
          bytes: bytes.toString("base64"),
          uploadedAt: now,
        },
      };
      await client.query(
        `update projects set data=$2, updated_at=$3 where id=$1`,
        [projectId, JSON.stringify(mergedData), now],
      );
      await this.audit.record({
        projectId,
        stepId: "synopsis",
        type: "synopsis.file.uploaded",
        message: `Uploaded synopsis document ${fileName}`,
        entityType: "synopsis",
        entityId: projectId,
        entityLabel: fileName,
        actor: actor ?? { name: "System" },
        metadata: { fileName, mimeType, fileSize: bytes.length },
      }, client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getSynopsisFile(
    projectId: string,
  ): Promise<{ fileName: string; mimeType: string; bytes: Buffer }> {
    const project = await this.get(projectId);
    const file = project.data?.synopsisFile;
    if (!file) throw new NotFoundException("No synopsis file found");
    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes: Buffer.from(file.bytes, "base64"),
    };
  }
}
