import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { validateFigureContent } from './figure-image';
import { getPool } from '../../db/pg';
import { AuditActor, AuditService } from '../audit/audit.service';
import {
  CreateResultDto,
  ListResultsDto,
  ResultDecisionDto,
  UpdateResultDto,
  SupportingDocumentDto,
  AssignResultSectionDto,
} from './dto';
import {
  getReportSectionDefinitions,
  resolveReportMarkets,
} from '../reports/report-section-definitions';

const FIELDS: Record<string, string> = {
  title: 'title',
  content: 'content',
  description: 'description',
  sourceFilename: 'source_filename',
  sourceLocation: 'source_location',
  sourceDocumentId: 'source_document_id',
  reportSectionId: 'report_section_id',
  placement: 'placement',
  titleOrigin: 'title_origin',
  sectionOrigin: 'section_origin',
  descriptionOrigin: 'description_origin',
  originalReference: 'original_reference',
};

function response(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    type: row.type,
    ...Object.fromEntries(
      Object.entries(FIELDS).map(([key, column]) => [key, row[column]]),
    ),
    status: row.status,
    reportNumber: row.report_number,
    lastDecision: row.last_decision
      ? {
          decision: row.last_decision,
          reason: row.decision_reason,
          userId: row.decided_by_user_id,
          decidedAt: row.decided_at,
        }
      : null,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class ResultsService {
  constructor(private readonly audit: AuditService) {}

  async workspace(projectId: string) {
    const [results, documents, sections, locked] = await Promise.all([
      this.list(projectId),
      getPool().query(
        `select id,type,filename,mime_type as "mimeType",
        octet_length(bytes)::int as "sizeBytes",description,uploaded_by_name as "uploaderName",
        uploaded_at as "uploadedAt" from supporting_document where project_id=$1 order by uploaded_at,id`,
        [projectId],
      ),
      getPool().query(
        `select s.id,s.title from report_section s join report r on r.id=s.report_id
        where r.project_id=$1 order by s.position,s.id`,
        [projectId],
      ),
      getPool().query(
        `select 1 from workflow_step_state where project_id=$1 and step_id='report-pdf' and state in ('signed','final')
        union all select 1 from report_signature s join report r on r.id=s.report_id where r.project_id=$1`,
        [projectId],
      ),
    ]);
    return {
      results,
      supportingDocuments: documents.rows,
      sections: sections.rows,
      locked: locked.rows.length > 0,
    };
  }

  async uploadSupportingDocument(
    projectId: string,
    body: SupportingDocumentDto,
    file: { originalname: string; mimetype: string; buffer: Buffer },
    actor: AuditActor,
  ) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Choose a non-empty file');
    const filename = file.originalname.split(/[\\/]/).pop()!;
    if (!filename.trim() || filename.length > 1000 || filename.includes('\0'))
      throw new BadRequestException('Invalid filename');
    return this.write(projectId, actor, async (client) => {
      const { rows } = await client.query(
        `insert into supporting_document
        (project_id,type,filename,mime_type,bytes,description,uploaded_by_user_id,uploaded_by_name,uploaded_by_email)
        select $1,$2,$3,$4,$5,$6,id,name,email from users where id=$7 returning id`,
        [
          projectId,
          body.type,
          filename,
          file.mimetype || 'application/octet-stream',
          file.buffer,
          body.description ?? null,
          actor.userId,
        ],
      );
      await this.audit.record(
        {
          projectId,
          stepId: 'study-results',
          type: 'supporting-document.added',
          entityType: 'supporting_document',
          entityId: rows[0].id,
          entityLabel: filename,
          message: `Added ${body.type.toUpperCase()}: ${filename}`,
          actor,
          metadata: { type: body.type, sizeBytes: file.buffer.length },
        },
        client,
      );
      return { id: rows[0].id };
    });
  }

  async downloadSupportingDocument(projectId: string, id: string) {
    const { rows } = await getPool().query(
      'select filename,bytes from supporting_document where id=$1 and project_id=$2',
      [id, projectId],
    );
    if (!rows[0]) throw new NotFoundException('Supporting document not found');
    return rows[0];
  }

  async removeSupportingDocument(
    projectId: string,
    id: string,
    actor: AuditActor,
  ) {
    await this.write(projectId, actor, async (client) => {
      const { rows } = await client.query(
        'select filename from supporting_document where id=$1 and project_id=$2 for update',
        [id, projectId],
      );
      if (!rows[0])
        throw new NotFoundException('Supporting document not found');
      const referenced = await client.query(
        'select 1 from result_object where source_document_id=$1',
        [id],
      );
      if (referenced.rows.length)
        throw new ConflictException(
          'This document is referenced by a result and must be retained',
        );
      await client.query(
        'delete from supporting_document where id=$1 and project_id=$2',
        [id, projectId],
      );
      await this.audit.record(
        {
          projectId,
          stepId: 'study-results',
          type: 'supporting-document.deleted',
          entityType: 'supporting_document',
          entityId: id,
          entityLabel: rows[0].filename,
          message: `Removed supporting document: ${rows[0].filename}`,
          actor,
        },
        client,
      );
    });
  }

  // Empty sections provide stable relational destinations before report authoring.
  // Existing authored sections are never overwritten.
  private async ensureSections(
    client: PoolClient,
    projectId: string,
    reportId: string,
  ) {
    const { rows } = await client.query(
      `select p.data->'scope' as scope,
      array(select m.code from project_markets pm join markets m on m.id=pm.market_id
        where pm.project_id=p.id order by m.code) as markets from projects p where p.id=$1`,
      [projectId],
    );
    const definitions = getReportSectionDefinitions(
      resolveReportMarkets(rows[0]?.markets ?? [], rows[0]?.scope),
    );
    for (const section of definitions) {
      await client.query(
        `insert into report_section(report_id,section_key,section_number,position,title)
        values($1,$2,$3,$4,$5) on conflict(report_id,section_key) do nothing`,
        [
          reportId,
          section.id,
          String(section.number),
          section.number,
          section.title,
        ],
      );
    }
  }

  async list(projectId: string, filters: ListResultsDto = {}) {
    const values: unknown[] = [projectId];
    const clauses = ['project_id=$1'];
    for (const field of ['type', 'status'] as const) {
      if (filters[field]) {
        values.push(filters[field]);
        clauses.push(`${field}=$${values.length}`);
      }
    }
    if (filters.view) {
      values.push(filters.view);
      clauses.push(`(placement=$${values.length} or placement='both')`);
      clauses.push("status in ('accepted','in-appendix')");
    }
    const { rows } = await getPool().query(
      `select * from result_object where ${clauses.join(' and ')} order by type, report_number, id`,
      values,
    );
    return rows.map(response);
  }

  async create(projectId: string, body: CreateResultDto, actor: AuditActor) {
    return this.write(projectId, actor, async (client) => {
      const { rows: reports } = await client.query(
        `insert into report(project_id,created_by_user_id) values($1,$2)
         on conflict(project_id) do update set project_id=excluded.project_id returning id`,
        [projectId, actor.userId],
      );
      const reportId = reports[0].id;
      await this.ensureSections(client, projectId, reportId);
      const data = this.fields(body);
      const state = {
        status: 'draft',
        placement: 'unplaced',
        report_section_id: null,
        ...data,
      };
      await this.validateReferences(client, projectId, reportId, state);
      this.validatePlacement(state);
      const { rows: numbers } = await client.query(
        `insert into result_object_sequence(report_id,type,next_number) values($1,$2,2)
         on conflict(report_id,type) do update set next_number=result_object_sequence.next_number+1
         returning next_number-1 as assigned_number`,
        [reportId, body.type],
      );
      const columns = [
        'project_id',
        'report_id',
        'type',
        'report_number',
        'created_by_user_id',
        'updated_by_user_id',
        ...Object.keys(data),
      ];
      const values = [
        projectId,
        reportId,
        body.type,
        numbers[0].assigned_number,
        actor.userId,
        actor.userId,
        ...Object.values(data),
      ];
      const { rows } = await client.query(
        `insert into result_object(${columns.join(',')}) values(${values.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
        values,
      );
      await this.record(client, projectId, actor, 'created', rows[0], {
        version: 1,
      });
      return response(rows[0]);
    });
  }

  async update(
    projectId: string,
    id: string,
    body: UpdateResultDto,
    actor: AuditActor,
  ) {
    return this.write(projectId, actor, async (client) => {
      const previous = await this.find(client, projectId, id);
      this.checkVersion(previous, body.expectedVersion);
      const data = this.fields(body);
      if (!Object.keys(data).length)
        throw new BadRequestException('Provide at least one field to update');
      // Human edits reset provenance unless the caller explicitly marks AI output.
      for (const [field, origin] of [
        ['title', 'title_origin'],
        ['description', 'description_origin'],
        ['report_section_id', 'section_origin'],
      ]) {
        if (field in data && !(origin in data)) data[origin] = 'human';
      }
      const state = { ...previous, ...data };
      await this.validateReferences(
        client,
        projectId,
        previous.report_id,
        state,
      );
      this.validatePlacement(state);
      const values: unknown[] = [id, projectId, actor.userId];
      const sets = [
        'version=version+1',
        'updated_at=now()',
        'updated_by_user_id=$3',
      ];
      for (const [column, value] of Object.entries(data)) {
        values.push(value);
        sets.push(`${column}=$${values.length}`);
      }
      const { rows } = await client.query(
        `update result_object set ${sets.join(',')} where id=$1 and project_id=$2 returning *`,
        values,
      );
      await this.record(client, projectId, actor, 'updated', rows[0], {
        previousVersion: previous.version,
        version: rows[0].version,
        changedFields: Object.keys(FIELDS).filter((key) => FIELDS[key] in data),
      });
      return response(rows[0]);
    });
  }

  async assignSection(
    projectId: string,
    id: string,
    body: AssignResultSectionDto,
    actor: AuditActor,
  ) {
    return this.write(projectId, actor, async (client) => {
      const previous = await this.find(client, projectId, id);
      this.checkVersion(previous, body.expectedVersion);
      const sectionId = body.reportSectionId;
      await this.validateReferences(client, projectId, previous.report_id, {
        report_section_id: sectionId,
      });
      if (sectionId === previous.report_section_id) return response(previous);
      const placement =
        previous.status === 'accepted'
          ? sectionId
            ? previous.placement === 'both'
              ? 'both'
              : 'main'
            : 'unplaced'
          : previous.placement;
      this.validatePlacement({
        ...previous,
        report_section_id: sectionId,
        placement,
      });
      const { rows } = await client.query(
        `update result_object set report_section_id=$3,section_origin='human',placement=$4,
         version=version+1,updated_at=now(),updated_by_user_id=$5
         where id=$1 and project_id=$2 returning *`,
        [id, projectId, sectionId, placement, actor.userId],
      );
      await this.record(client, projectId, actor, 'section-updated', rows[0], {
        previousSectionId: previous.report_section_id,
        reportSectionId: sectionId,
        previousPlacement: previous.placement,
        placement,
        previousVersion: previous.version,
        version: rows[0].version,
      });
      return response(rows[0]);
    });
  }

  async decide(
    projectId: string,
    id: string,
    body: ResultDecisionDto,
    actor: AuditActor,
  ) {
    return this.write(projectId, actor, async (client) => {
      const previous = await this.find(client, projectId, id);
      this.checkVersion(previous, body.expectedVersion);
      if (body.decision !== 'accept' && body.placement !== undefined)
        throw new BadRequestException(
          'Placement can only be specified with an accept decision',
        );
      const status = {
        accept: 'accepted',
        appendix: 'in-appendix',
        reject: 'rejected',
      }[body.decision];
      const placement =
        body.decision === 'accept'
          ? (body.placement ??
            (previous.report_section_id ? 'main' : 'unplaced'))
          : body.decision === 'appendix'
            ? 'appendix'
            : 'unplaced';
      this.validatePlacement({ ...previous, status, placement });
      const { rows } = await client.query(
        `update result_object set status=$3,placement=$4,last_decision=$5,decision_reason=$6,
         decided_by_user_id=$7,decided_at=now(),version=version+1,updated_at=now(),updated_by_user_id=$7
         where id=$1 and project_id=$2 returning *`,
        [
          id,
          projectId,
          status,
          placement,
          body.decision,
          body.reason ?? null,
          actor.userId,
        ],
      );
      await this.record(client, projectId, actor, 'decision', rows[0], {
        decision: body.decision,
        reason: body.reason ?? null,
        previousStatus: previous.status,
        status,
        previousPlacement: previous.placement,
        placement,
        previousVersion: previous.version,
        version: rows[0].version,
      });
      return response(rows[0]);
    });
  }

  async remove(
    projectId: string,
    id: string,
    actor: AuditActor,
  ): Promise<void> {
    await this.write(projectId, actor, async (client) => {
      const row = await this.find(client, projectId, id);
      if (row.status === 'rejected')
        throw new ConflictException(
          'Rejected results are retained with their decision history',
        );
      await client.query(
        'delete from result_object where id=$1 and project_id=$2',
        [id, projectId],
      );
      await this.record(client, projectId, actor, 'deleted', row, {
        version: row.version,
        status: row.status,
        reportNumber: row.report_number,
      });
    });
  }

  private fields(body: Partial<CreateResultDto>) {
    const data: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(FIELDS)) {
      const value = (body as any)[key];
      if (value !== undefined) data[column] = value;
    }
    // JSON keys can contain null bytes too; the shared DTO validator checks values.
    if (body.content) {
      this.validateJsonKeys(body.content);
      validateFigureContent(body.content);
    }
    return data;
  }

  private validateJsonKeys(value: unknown): void {
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key.includes('\0'))
          throw new BadRequestException(
            'Content keys must not contain null bytes',
          );
        this.validateJsonKeys(child);
      }
    }
  }

  private checkVersion(row: any, expected: number) {
    if (row.version !== expected)
      throw new ConflictException(
        'This result has changed. Reload it before saving.',
      );
  }

  private validatePlacement(row: any) {
    if (['main', 'both'].includes(row.placement) && !row.report_section_id)
      throw new BadRequestException(
        'Choose a report section for main-body placement',
      );
    if (
      (row.status === 'accepted' &&
        !['unplaced', 'main', 'both'].includes(row.placement)) ||
      (row.status === 'in-appendix' && row.placement !== 'appendix') ||
      (row.status === 'rejected' && row.placement !== 'unplaced')
    )
      throw new BadRequestException(
        'Use a decision to change the result status before changing its placement',
      );
  }

  private async validateReferences(
    client: PoolClient,
    projectId: string,
    reportId: string,
    data: any,
  ) {
    if (data.report_section_id) {
      const { rows } = await client.query(
        'select id from report_section where id=$1 and report_id=$2',
        [data.report_section_id, reportId],
      );
      if (!rows[0])
        throw new BadRequestException(
          'Report section does not belong to this project',
        );
    }
    if (data.source_document_id) {
      const { rows } = await client.query(
        'select id from supporting_document where id=$1 and project_id=$2',
        [data.source_document_id, projectId],
      );
      if (!rows[0])
        throw new BadRequestException(
          'Source document does not belong to this project',
        );
    }
  }

  private async find(client: PoolClient, projectId: string, id: string) {
    const { rows } = await client.query(
      'select * from result_object where id=$1 and project_id=$2 for update',
      [id, projectId],
    );
    if (!rows[0]) throw new NotFoundException('Result not found');
    return rows[0];
  }

  private async record(
    client: PoolClient,
    projectId: string,
    actor: AuditActor,
    action: string,
    row: any,
    metadata: any,
  ) {
    await this.audit.record(
      {
        projectId,
        stepId: 'study-results',
        type: `result.${action}`,
        entityType: 'result',
        entityId: row.id,
        entityLabel: row.title,
        message:
          action === 'decision'
            ? `Result decision: ${row.last_decision} — ${row.title}`
            : `Result ${action}: ${row.title}`,
        actor,
        metadata,
      },
      client,
    );
  }

  private async write<T>(
    projectId: string,
    actor: AuditActor,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!actor?.userId || actor.userId === 'system')
      throw new ForbiddenException('An authenticated user is required');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      // Match report writes: serialize with signing and project deletion.
      const { rows } = await client.query(
        'select id from projects where id=$1 for update',
        [projectId],
      );
      if (!rows[0]) throw new NotFoundException('Project not found');
      const user = await client.query('select id from users where id=$1', [
        actor.userId,
      ]);
      if (!user.rows[0])
        throw new ForbiddenException('Authenticated user no longer exists');
      const locked = await client.query(
        `select 1 from workflow_step_state where project_id=$1 and step_id='report-pdf' and state in ('signed','final')
         union all select 1 from report_signature s join report r on r.id=s.report_id where r.project_id=$1`,
        [projectId],
      );
      if (locked.rows.length)
        throw new ForbiddenException('The signed report cannot be edited');
      const result = await fn(client);
      await client.query(
        'update report set updated_at=now(),updated_by_user_id=$2 where project_id=$1',
        [projectId, actor.userId],
      );
      await client.query('update projects set updated_at=now() where id=$1', [
        projectId,
      ]);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}
