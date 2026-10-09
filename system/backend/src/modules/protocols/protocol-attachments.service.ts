import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { assertProtocolDocumentsMutable } from './protocol-document-lock';
import { validateFindingRequirements, acceptedFindingRequirements } from '../projects/finding-requirements';
import { extractDocumentText } from '../../common/document-text';
import { listProjectRequirements } from '../projects/project-requirements';

@Injectable()
export class ProtocolAttachmentsService {
  constructor(private readonly audit: AuditService) {}


  private async assertCanManageProtocolAttachments(
    client: PoolClient,
    projectId: string,
    userId?: string | null,
  ): Promise<void> {
    if (!userId) {
      throw new ForbiddenException('Only Protocol Lead or Regulatory Affairs may manage protocol attachments');
    }

    const { rows } = await client.query(
      `select 1
       from project_members
       where project_id = $1
         and user_id = $2
         and role_title = any($3::text[])
       limit 1`,
      [projectId, userId, ['Protocol Lead', 'Regulatory Affairs']],
    );
    if (!rows[0]) {
      throw new ForbiddenException('Only Protocol Lead or Regulatory Affairs may manage protocol attachments');
    }
  }

  async listProtocolAttachments(args: { projectId: string }, client?: PoolClient) {
    const { rows } = await (client ?? getPool()).query(
      `select pa.id,
              pa.appendix_number,
              pa.filename,
              pa.mime_type,
              octet_length(pa.bytes)::int as size_bytes,
              pa.description,
              pa.uploaded_by_user_id,
              coalesce(u.name, pa.uploaded_by_name) as uploader_name,
              coalesce(u.email, pa.uploaded_by_email) as uploader_email,
              pa.uploaded_at, pa.requirement_ids, pa.extraction_error
       from protocol_attachment pa
       join protocol pr on pr.id = pa.protocol_id
       left join users u on u.id = pa.uploaded_by_user_id
       where pr.project_id = $1
       order by pa.appendix_number asc`,
      [args.projectId],
    );

    return rows.map((row) => ({
      id: String(row.id),
      appendixNumber: Number(row.appendix_number),
      filename: String(row.filename),
      mimeType: String(row.mime_type),
      sizeBytes: Number(row.size_bytes),
      description: row.description ?? null,
      uploadedByUserId: row.uploaded_by_user_id ?? null,
      uploaderName: String(row.uploader_name),
      uploaderEmail: row.uploader_email ?? null,
      uploadedAt: row.uploaded_at,
      requirementIds: row.requirement_ids || [],
      extractionError: row.extraction_error ?? null,
    }));
  }

  async uploadProtocolAttachment(args: {
    projectId: string;
    filename: string;
    mimeType: string;
    bytes: Buffer;
    description?: string;
    actor: AuditActor;
  }) {
    const id = randomUUID();
    const now = new Date();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await this.assertCanManageProtocolAttachments(client, args.projectId, args.actor.userId);
      await assertProtocolDocumentsMutable(client, args.projectId);

      const { rows: actorRows } = await client.query(
        `select name, email from users where id = $1`,
        [args.actor.userId],
      );
      if (!actorRows[0]) throw new ForbiddenException('Authenticated user no longer exists');

      const { rows: protocolRows } = await client.query(
        `insert into protocol (project_id, created_at, updated_at)
         values ($1, now(), now())
         on conflict (project_id) do update set project_id = excluded.project_id
         returning id`,
        [args.projectId],
      );
      const protocolId = String(protocolRows[0].id);

      // Allocate from a per-protocol monotonic counter. A removed number is never
      // reused, so old section text cannot silently start pointing to a new file.
      const { rows: numberRows } = await client.query(
        `insert into protocol_attachment_sequence (protocol_id, next_appendix_number)
         values ($1, 2)
         on conflict (protocol_id) do update
           set next_appendix_number = protocol_attachment_sequence.next_appendix_number + 1
         returning next_appendix_number - 1 as assigned_number`,
        [protocolId],
      );
      const appendixNumber = Number(numberRows[0].assigned_number);
      const description = args.description?.trim() || null;

      await client.query(
        `insert into protocol_attachment (
           id, protocol_id, appendix_number, filename, mime_type, bytes,
           description, uploaded_by_user_id, uploaded_by_name,
           uploaded_by_email, uploaded_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          protocolId,
          appendixNumber,
          args.filename,
          args.mimeType,
          args.bytes,
          description,
          args.actor.userId,
          actorRows[0].name,
          actorRows[0].email,
          now,
        ],
      );

      await this.audit.record({
        projectId: args.projectId,
        stepId: 'protocol-make',
        type: 'protocol.attachment.added',
        message: `Added Appendix ${appendixNumber}: ${args.filename}`,
        entityType: 'protocol_attachment',
        entityId: id,
        entityLabel: `Appendix ${appendixNumber}: ${args.filename}`,
        actor: args.actor,
        metadata: {
          appendixNumber,
          filename: args.filename,
          mimeType: args.mimeType,
          sizeBytes: args.bytes.length,
          description,
        },
      }, client);

      const attachments = await this.listProtocolAttachments({ projectId: args.projectId }, client);
      await client.query('COMMIT');
      return attachments;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async removeProtocolAttachment(args: {
    projectId: string;
    attachmentId: string;
    actor: AuditActor;
  }) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await this.assertCanManageProtocolAttachments(client, args.projectId, args.actor.userId);
      await assertProtocolDocumentsMutable(client, args.projectId);
      const { rows } = await client.query(
        `select appendix_number, filename, mime_type, description,
                octet_length(bytes)::int as size_bytes
         from protocol_attachment pa
         join protocol pr on pr.id = pa.protocol_id
         where pa.id = $1 and pr.project_id = $2
         for update of pa`,
        [args.attachmentId, args.projectId],
      );
      const attachment = rows[0];
      if (!attachment) throw new NotFoundException('Protocol attachment not found');

      const linkedFindings = await client.query(
        `update protocol_section_issue set attachment_id=null,verification_status=null,verification_request_id=null,
         verification_reason=null,verified_at=null,document_linked_by_user_id=null,document_linked_at=null
         where attachment_id=$1 returning id`, [args.attachmentId],
      );

      await client.query(
        `delete from protocol_attachment where id = $1`,
        [args.attachmentId],
      );
      await this.audit.record({
        projectId: args.projectId,
        stepId: 'protocol-make',
        type: 'protocol.attachment.removed',
        message: `Removed Appendix ${attachment.appendix_number}: ${attachment.filename}`,
        entityType: 'protocol_attachment',
        entityId: args.attachmentId,
        entityLabel: `Appendix ${attachment.appendix_number}: ${attachment.filename}`,
        actor: args.actor,
        metadata: {
          appendixNumber: Number(attachment.appendix_number),
          filename: attachment.filename,
          mimeType: attachment.mime_type,
          sizeBytes: Number(attachment.size_bytes),
          description: attachment.description ?? null,
          removedDocumentLinks: linkedFindings.rows.map(finding => finding.id),
        },
      }, client);

      const attachments = await this.listProtocolAttachments({ projectId: args.projectId }, client);
      await client.query('COMMIT');
      return attachments;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async updateRequirements(projectId: string, attachmentId: string, requirementIds: string[], actor: AuditActor) {
    if (!Array.isArray(requirementIds) || requirementIds.some(id => typeof id !== 'string' || !id.trim())) {
      throw new BadRequestException('requirementIds must contain accepted requirement IDs');
    }
    const ids = [...new Set(requirementIds)];
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await this.assertCanManageProtocolAttachments(client, projectId, actor.userId);
      await assertProtocolDocumentsMutable(client, projectId);
      validateFindingRequirements(ids.map(requirementId => ({ requirementId })), await listProjectRequirements(projectId, client));
      const { rows } = await client.query(
        `update protocol_attachment pa set requirement_ids=$3
         from protocol pr where pa.protocol_id=pr.id and pr.project_id=$1 and pa.id=$2
         returning pa.appendix_number, pa.filename`, [projectId, attachmentId, ids],
      );
      if (!rows[0]) throw new NotFoundException('Protocol attachment not found');
      await this.audit.record({
        projectId, stepId: 'protocol-make', type: 'protocol.attachment.requirements.updated',
        message: `Updated requirements covered by Appendix ${rows[0].appendix_number}: ${rows[0].filename}`,
        actor, entityType: 'protocol_attachment', entityId: attachmentId,
        metadata: { requirementIds: ids, ...rows[0] },
      }, client);
      const result = await this.listProtocolAttachments({ projectId }, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }

  async supportingDocuments(projectId: string, includeText = false) {
    const accepted = acceptedFindingRequirements(await listProjectRequirements(projectId));
    const { rows } = await getPool().query(
      `select pa.id, pa.appendix_number, pa.filename, pa.description, pa.requirement_ids,
              array(select distinct i.requirement_id from protocol_section_issue i
                    where i.attachment_id=pa.id and i.status='open' and i.requirement_id is not null) as finding_requirement_ids,
              pa.extracted_text, pa.extraction_error${includeText ? ', pa.bytes, pa.mime_type' : ''}
       from protocol_attachment pa join protocol pr on pr.id=pa.protocol_id
       where pr.project_id=$1 order by pa.appendix_number`, [projectId],
    );
    return Promise.all(rows.map(async row => {
      let extractedText = row.extracted_text;
      let extractionError = row.extraction_error;
      if (includeText && extractedText == null && extractionError == null) {
        try { extractedText = await extractDocumentText(row.bytes, row.filename, row.mime_type); }
        catch (error) { extractionError = error instanceof Error ? error.message : 'Text extraction failed'; }
        await getPool().query('update protocol_attachment set extracted_text=$2, extraction_error=$3 where id=$1',
          [row.id, extractedText ?? null, extractionError ?? null]);
      }
      const requirementIds: string[] = [...new Set<string>([...(row.requirement_ids || []), ...(row.finding_requirement_ids || [])])]
        .filter(id => accepted.some(r => r.id === id));
      return {
        id: row.id, label: `Appendix ${row.appendix_number} - ${row.filename}`,
        appendixNumber: Number(row.appendix_number), filename: row.filename, description: row.description,
        requirementIds,
        requirements: accepted.filter(r => requirementIds.includes(r.id)),
        ...(includeText ? { extractedText: extractedText ?? '', extractionError: extractionError ?? null } : {}),
      };
    }));
  }
}
