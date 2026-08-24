import { Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';
import { CreateProjectDto } from './dto';
import { AdminService } from '../admin/admin.service';
import { sanitizeIncomingProjectData } from '../../common/sanitize-section-html';

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'completed';
  data?: any;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly admin: AdminService) { }

  // Resolves the authenticated user's real name/email from the DB, so callers
  // that need a trustworthy identity (e.g. electronic signatures) never have
  // to fall back to client-supplied name/email fields.
  async getUserIdentity(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    const { rows } = await getPool().query<{ id: string; name: string; email: string }>(
      `select id, name, email from users where id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  // List views only ever render summary fields (ProjectCard reads id/name/description/status,
  // plus the two projectData submission-target dates for its Timeline toggle) — never the full
  // protocol/report/synopsis-file content that lives in `data`. Pulling the whole jsonb blob per
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

  async listCompleted(companyId?: string, isSuperadmin?: boolean): Promise<Project[]> {
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
      `select id, name, description, project_number, status, data, created_at as "createdAt", updated_at as "updatedAt"
       from projects where id=$1`,
      [id],
    );
    const p = rows[0];
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }



  private async generateProjectNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();

    // Advisory lock for the specific year.
    // Blocks all other concurrent requests for the same year until this transaction commits.
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      [`project-number-${year}`]
    );

    const { rows } = await client.query(
      `SELECT COALESCE(
       MAX((substring(project_number from '^\\d{4}-(\\d+)$'))::int),
       0
     ) AS max_seq
     FROM projects
     WHERE project_number LIKE $1`,
      [`${year}-%`]
    );

    const next = Number(rows[0].max_seq) + 1;
    return `${year}-${String(next).padStart(3, '0')}`;
  }

  // async create(dto: CreateProjectDto, companyId?: string): Promise<Project> {
  //   const now = new Date().toISOString();
  //   const client = await getPool().connect();
  //   let id = '';
  //   try {
  //     await client.query('BEGIN');

  //     // enforceProjectLimit() takes `for update` on the company row and holds it for
  //     // the rest of this transaction, so a second concurrent create() for the same
  //     // company blocks here until this one commits (or rolls back) — serializing the
  //     // plan-limit check against the insert below instead of both reading the same
  //     // stale project count and both passing.
  //     if (companyId) {
  //       await this.admin.enforceProjectLimit(companyId, client);
  //       await this.admin.touchLastActive(companyId, client);
  //     }

  //     // generateProjectId() reads the current max suffix without its own locking, so
  //     // two concurrent creates (for different companies, hence no shared company lock)
  //     // can still compute the same id. The `projects_pkey` unique constraint is the
  //     // real race guard: on a collision (23505) roll back to the savepoint — which
  //     // undoes only the failed insert, not the company lock/limit check above — and
  //     // retry against the now-updated max.
  //     const maxAttempts = 5;
  //     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  //       await client.query('SAVEPOINT create_project_attempt');
  //       id = await this.generateProjectId(client);
  //       try {
  //         await client.query(
  //           `insert into projects (id, name, description, status, company_id, created_at, updated_at)
  //            values ($1,$2,$3,'active',$4,$5,$5)`,
  //           [id, dto.name, dto.description ?? null, companyId ?? null, now],
  //         );
  //         await client.query('RELEASE SAVEPOINT create_project_attempt');
  //         break;
  //       } catch (err: any) {
  //         await client.query('ROLLBACK TO SAVEPOINT create_project_attempt');
  //         if (err?.code === '23505' && attempt < maxAttempts) continue;
  //         throw err;
  //       }
  //     }

  //     await client.query(
  //       `insert into workflow_step_state (project_id, step_id, state, updated_at)
  //        select $1, step_id, 'draft', $2 from workflow_steps`,
  //       [id, now],
  //     );
  //     await client.query('COMMIT');
  //   } catch (err) {
  //     await client.query('ROLLBACK').catch(() => {});
  //     throw err;
  //   } finally {
  //     client.release();
  //   }
  //   return this.get(id);
  // }

  async create(dto: CreateProjectDto, companyId?: string): Promise<Project> {
    const now = new Date().toISOString();
    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      if (companyId) {
        await this.admin.enforceProjectLimit(companyId, client);
        await this.admin.touchLastActive(companyId, client);
      }

      const projectNumber = await this.generateProjectNumber(client);
      const id = crypto.randomUUID();

      // Default risk to 'I' if not provided
      const risk = dto.risk ?? 'I';

       await client.query(
        `INSERT INTO projects 
       (id, project_number, name, status, company_id, risk, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $6)
       RETURNING id`,
        [id, projectNumber, dto.name, companyId ?? null, risk, now]
      );

      await client.query(
        `INSERT INTO workflow_step_state (project_id, step_id, state, updated_at)
       SELECT $1, step_id, 'draft', $2 FROM workflow_steps`,
        [id, now]
      );

      await client.query('COMMIT');
      return this.get(id);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }
async update(id: string, patch: { name?: string; description?: string; data?: any }): Promise<Project> {
  const now = new Date().toISOString();

  if (patch.data) {
    patch = { ...patch, data: sanitizeIncomingProjectData(patch.data) };
  }

  if (patch.data) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and fetch existing data
      const { rows } = await client.query(
        `SELECT data FROM projects WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        throw new NotFoundException('Project not found');
      }
      const existingData = rows[0].data || {};
      const mergedData: any = { ...existingData };

      // 2. Deep‑merge patch.data into existing data
      for (const key of Object.keys(patch.data)) {
        if (
          patch.data[key] !== null &&
          typeof patch.data[key] === 'object' &&
          !Array.isArray(patch.data[key]) &&
          existingData[key] !== null &&
          typeof existingData[key] === 'object' &&
          !Array.isArray(existingData[key])
        ) {
          mergedData[key] = { ...existingData[key], ...patch.data[key] };
        } else {
          mergedData[key] = patch.data[key];
        }
      }

      // 3. Extract risk from merged projectData (if present)
      let riskValue: string | null = null;
      if (mergedData.projectData?.risk) {
        riskValue = mergedData.projectData.risk;
      }

      // 4. Update the project row
      await client.query(
        `UPDATE projects SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          data = $4,
          risk = COALESCE($5, risk),
          updated_at = $6
        WHERE id = $1`,
        [
          id,
          patch.name ?? null,
          patch.description ?? null,
          JSON.stringify(mergedData),
          riskValue,
          now,
        ]
      );

      // ==========================================================
      // 5. Sync project_markets and project_standards (inside transaction)
      // ==========================================================
      const projectData = mergedData.projectData;
      if (projectData) {
        const { targetMarkets = [], risk, deviceCategory } = projectData;
        const marketCodes: string[] = targetMarkets;

        // --- 5a. Sync project_markets ---
        await client.query(`DELETE FROM project_markets WHERE project_id = $1`, [id]);

        if (marketCodes.length > 0) {
          const marketIds = await client.query(
            `SELECT id FROM markets WHERE code = ANY($1::text[])`,
            [marketCodes]
          );
          if (marketIds.rows.length > 0) {
            const valuesClause = marketIds.rows.map((_, i) => `($1, $${i + 2})`).join(',');
            await client.query(
              `INSERT INTO project_markets (project_id, market_id) VALUES ${valuesClause}`,
              [id, ...marketIds.rows.map((m) => m.id)]
            );
          }
        }

        // --- 5b. Sync project_standards ---
        // Compute standards using the same logic as getRequirements, but with the transaction client
        // (so all queries run inside the same BEGIN/COMMIT).
        const standardsResult = await client.query(
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
          [marketCodes, risk, deviceCategory]
        );
        const standardIds: number[] = standardsResult.rows.map((s: any) => s.id);

        await client.query(`DELETE FROM project_standards WHERE project_id = $1`, [id]);

        if (standardIds.length > 0) {
          const valuesClause = standardIds.map((_, i) => `($1, $${i + 2})`).join(',');
          await client.query(
            `INSERT INTO project_standards (project_id, standard_id) VALUES ${valuesClause}`,
            [id, ...standardIds]
          );
        }
      }

      // 6. Commit everything together
      await client.query('COMMIT');
      return this.get(id);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    // No data patch – just update name/description without transaction
    await getPool().query(
      `UPDATE projects SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        updated_at = $4
      WHERE id = $1`,
      [id, patch.name ?? null, patch.description ?? null, now]
    );
    return this.get(id);
  }
}
  async getRequirements(risk: string, deviceCategory: string, marketCodes: string[]): Promise<any> {
    // Get frameworks from markets table
    const marketsResult = await getPool().query(
      `SELECT code, framework FROM markets WHERE code = ANY($1::text[])`,
      [marketCodes]
    );
    const frameworks = marketsResult.rows.map(r => r.framework);

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
      [marketCodes, risk, deviceCategory]
    );
    const standards = rulesResult.rows;

    return { frameworks, standards };
  }

  /**
   * Returns the standards that have already been calculated for one project.
   *
   * `standards` is the global catalogue. `project_standards` is the authoritative
   * list of standards that are mandatory for this particular project after its
   * risk class, device category and target markets have been evaluated.
   */
  async getProjectStandards(projectId: string): Promise<Array<{
    id: number;
    code: string;
    title: string;
  }>> {
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
  // project" — see settings.service.ts getCompanyData()) in sync with the roles the
  // caller just saved into data.roles. A person only becomes a project_members row once
  // their email resolves to a real user in the project's own company — the Project Setup
  // UI's PersonAutocomplete only lets you pick real users, but this is the actual
  // enforcement point, since the JSON blob itself can still hold arbitrary free text.
  // Reconciles the full set every call (insert missing, delete stale) since the caller
  // always submits the complete current roles array, not a diff.
  async syncProjectMembers(
    projectId: string,
    roles: Array<{ title: string; assignedTo?: Array<{ email?: string }> }>,
  ): Promise<void> {
    const pool = getPool();
    const { rows: projectRows } = await pool.query<{ company_id: string | null }>(
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
      const { rows } = await pool.query<{ id: string; email: string }>(
        `select id, email from users where company_id = $1 and lower(email) = any($2::text[])`,
        [companyId, [...emails]],
      );
      for (const r of rows) userIdByEmail.set(r.email.toLowerCase(), r.id);
    }

    const desired = new Map<string, { userId: string; roleTitle: string }>();
    for (const role of roles) {
      for (const person of role.assignedTo ?? []) {
        const email = person?.email?.trim().toLowerCase();
        const userId = email ? userIdByEmail.get(email) : undefined;
        if (!userId) continue;
        desired.set(`${userId}:${role.title}`, { userId, roleTitle: role.title });
      }
    }

    const { rows: existingRows } = await pool.query<{ user_id: string; role_title: string }>(
      `select user_id, role_title from project_members where project_id = $1`,
      [projectId],
    );

    const toInsert = [...desired.values()].filter(
      (d) => !existingRows.some((r) => r.user_id === d.userId && r.role_title === d.roleTitle),
    );
    const toDelete = existingRows.filter(
      (r) => !desired.has(`${r.user_id}:${r.role_title}`),
    );

    if (toInsert.length) {
      const params: any[] = [];
      const placeholders = toInsert.map((d) => {
        params.push(projectId, d.userId, d.roleTitle);
        return `($${params.length - 2}, $${params.length - 1}, $${params.length})`;
      });
      await pool.query(
        `insert into project_members (project_id, user_id, role_title) values ${placeholders.join(', ')}
         on conflict (project_id, user_id, role_title) do nothing`,
        params,
      );
    }

    for (const row of toDelete) {
      await pool.query(
        `delete from project_members where project_id = $1 and user_id = $2 and role_title = $3`,
        [projectId, row.user_id, row.role_title],
      );
    }
  }

  // Read-modify-write helpers like createAmendment() need to append to a nested array
  // (data.protocol.amendments) based on its *current* contents. Doing that via a plain
  // get() + update() is exactly the unprotected pattern update()'s own FOR UPDATE lock
  // doesn't cover: update() only locks around its own read, not around whatever stale
  // snapshot the caller computed before calling it. This runs `mutate` against the
  // locked, up-to-the-moment `data.protocol`, so concurrent callers are serialized and
  // each one builds its result (e.g. amendments.length + 1) from data that already
  // includes every previously-committed concurrent write.
  async updateProtocolAtomic(id: string, mutate: (protocol: any, data: any) => any): Promise<Project> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `select data from projects where id=$1 for update`,
        [id],
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        throw new NotFoundException('Project not found');
      }
      const existingData = rows[0].data || {};
      const protocol = existingData.protocol || {};
      const newProtocol = mutate(protocol, existingData);
      const mergedData = { ...existingData, protocol: newProtocol };
      await client.query(
        `update projects set data=$2, updated_at=$3 where id=$1`,
        [id, JSON.stringify(mergedData), now],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { });
      throw err;
    } finally {
      client.release();
    }
    return this.get(id);
  }

  // Read-modify-write helper for data.signatures — mirrors updateProtocolAtomic above.
  // createSignature() previously read project.data.signatures via a plain get(), built the
  // new array in memory, then wrote it through update() — whose one-level merge replaces
  // arrays wholesale rather than merging them. Two signature requests landing close
  // together could each compute their "append" against the same stale snapshot, and
  // whichever wrote second would silently discard the first's signature (pentest F8). Doing
  // the read, mutate and write inside one `for update`-locked transaction serializes
  // concurrent signers against each other, the same way updateProtocolAtomic already does
  // for protocol amendments.
  async updateSignaturesAtomic(
    id: string,
    mutate: (signatures: any[], data: any) => any[],
  ): Promise<{ signatures: any[] }> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`select data from projects where id=$1 for update`, [id]);
      if (!rows[0]) {
        await client.query('ROLLBACK');
        throw new NotFoundException('Project not found');
      }
      const existingData = rows[0].data || {};
      const existingSignatures: any[] = Array.isArray(existingData.signatures) ? existingData.signatures : [];
      const newSignatures = mutate(existingSignatures, existingData);
      const mergedData = { ...existingData, signatures: newSignatures };
      await client.query(`update projects set data=$2, updated_at=$3 where id=$1`, [
        id,
        JSON.stringify(mergedData),
        now,
      ]);
      await client.query('COMMIT');
      return { signatures: newSignatures };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { });
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
  async saveSynopsisFile(projectId: string, fileName: string, bytes: Buffer, mimeType: string): Promise<void> {
    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`select data from projects where id=$1 for update`, [projectId]);
      if (!rows[0]) {
        await client.query('ROLLBACK');
        throw new NotFoundException('Project not found');
      }
      const existingData = rows[0].data || {};
      const mergedData = {
        ...existingData,
        synopsisFile: {
          fileName,
          mimeType,
          bytes: bytes.toString('base64'),
          uploadedAt: now,
        },
      };
      await client.query(`update projects set data=$2, updated_at=$3 where id=$1`, [
        projectId,
        JSON.stringify(mergedData),
        now,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  async getSynopsisFile(projectId: string): Promise<{ fileName: string; mimeType: string; bytes: Buffer }> {
    const project = await this.get(projectId);
    const file = project.data?.synopsisFile;
    if (!file) throw new NotFoundException('No synopsis file found');
    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes: Buffer.from(file.bytes, 'base64'),
    };
  }
}