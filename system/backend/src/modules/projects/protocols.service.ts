import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';
import { sanitizeSectionHtml } from '../../common/sanitize-section-html';
import type { AuditActor } from '../audit/audit.service';

type Db = { query: PoolClient['query'] };

const iso = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

@Injectable()
export class ProtocolsService {
  async ensureForProject(projectId: string, client: PoolClient): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `insert into protocol (project_id, created_at, updated_at)
       values ($1, now(), now())
       on conflict (project_id) do update set project_id = excluded.project_id
       returning id`,
      [projectId],
    );
    return rows[0].id;
  }

  async getByProject(projectId: string, db: Db = getPool()): Promise<any | null> {
    const { rows: protocolRows } = await db.query(
      `select id, protocol_identifier, version, status, created_at, updated_at
       from protocol where project_id = $1`,
      [projectId],
    );
    const protocolRow = protocolRows[0];
    if (!protocolRow) return null;

    const [sectionsResult, issuesResult, elementsResult, commentsResult, repliesResult, amendmentsResult,
      amendmentSectionsResult, reportSectionsResult, approvalsResult] = await Promise.all([
      db.query(
        `select ps.*, pa.amendment_key
         from protocol_section ps
         left join protocol_amendment pa on pa.id = ps.amendment_id
         where ps.protocol_id = $1
         order by ps.position, ps.created_at`,
        [protocolRow.id],
      ),
      db.query(
        `select i.* from protocol_section_issue i
         join protocol_section s on s.id = i.section_id
         where s.protocol_id = $1
         order by i.raised_date nulls last, i.id`,
        [protocolRow.id],
      ),
      db.query(
        `select e.* from protocol_section_required_element e
         join protocol_section s on s.id = e.section_id
         where s.protocol_id = $1 order by e.id`,
        [protocolRow.id],
      ),
      db.query(
        `select c.* from protocol_section_comment c
         join protocol_section s on s.id = c.section_id
         where s.protocol_id = $1 order by c.created_at, c.id`,
        [protocolRow.id],
      ),
      db.query(
        `select r.* from protocol_section_comment_reply r
         join protocol_section_comment c on c.id = r.comment_id
         join protocol_section s on s.id = c.section_id
         where s.protocol_id = $1 order by r.created_at, r.id`,
        [protocolRow.id],
      ),
      db.query(
        `select * from protocol_amendment
         where protocol_id = $1 order by amendment_number`,
        [protocolRow.id],
      ),
      db.query(
        `select x.*, s.section_key
         from protocol_amendment_section x
         join protocol_section s on s.id = x.section_id
         join protocol_amendment a on a.id = x.amendment_id
         where a.protocol_id = $1 order by s.position`,
        [protocolRow.id],
      ),
      db.query(
        `select x.* from protocol_amendment_report_section x
         join protocol_amendment a on a.id = x.amendment_id
         where a.protocol_id = $1 order by x.report_section_key`,
        [protocolRow.id],
      ),
      db.query(
        `select x.* from protocol_amendment_approval x
         join protocol_amendment a on a.id = x.amendment_id
         where a.protocol_id = $1 order by x.role_key`,
        [protocolRow.id],
      ),
    ]);

    const issuesBySection = new Map<string, any[]>();
    for (const row of issuesResult.rows) {
      const values = issuesBySection.get(row.section_id) ?? [];
      values.push({
        id: row.issue_key,
        severity: row.severity,
        subsection: row.subsection,
        description: row.description,
        reference: row.reference,
        raisedBy: row.raised_by,
        raisedDate: row.raised_date ? String(row.raised_date).slice(0, 10) : null,
        status: row.status,
        dueDate: row.due_date,
        textQuote: row.text_quote,
      });
      issuesBySection.set(row.section_id, values);
    }

    const elementsBySection = new Map<string, any[]>();
    for (const row of elementsResult.rows) {
      const values = elementsBySection.get(row.section_id) ?? [];
      values.push({
        id: row.element_key,
        name: row.name,
        status: row.status,
        reference: row.reference,
        evidence: row.evidence,
        verifiedBy: row.verified_by,
        verifiedDate: row.verified_date ? String(row.verified_date).slice(0, 10) : null,
      });
      elementsBySection.set(row.section_id, values);
    }

    const repliesByComment = new Map<string, any[]>();
    for (const row of repliesResult.rows) {
      const values = repliesByComment.get(row.comment_id) ?? [];
      values.push({
        id: row.reply_key,
        author: row.author_name,
        authorRole: row.author_role,
        timestamp: iso(row.created_at),
        content: row.content,
        status: row.status,
      });
      repliesByComment.set(row.comment_id, values);
    }

    const commentsBySection = new Map<string, any[]>();
    for (const row of commentsResult.rows) {
      const values = commentsBySection.get(row.section_id) ?? [];
      values.push({
        id: row.comment_key,
        author: row.author_name,
        authorRole: row.author_role,
        timestamp: iso(row.created_at),
        content: row.content,
        type: row.comment_type,
        subsection: row.subsection,
        status: row.status,
        resolvedBy: row.resolved_by_name,
        resolvedDate: iso(row.resolved_at),
        replies: repliesByComment.get(row.id) ?? [],
      });
      commentsBySection.set(row.section_id, values);
    }

    const amendmentSections = new Map<string, any[]>();
    for (const row of amendmentSectionsResult.rows) {
      const values = amendmentSections.get(row.amendment_id) ?? [];
      values.push(row);
      amendmentSections.set(row.amendment_id, values);
    }
    const reportSections = new Map<string, string[]>();
    for (const row of reportSectionsResult.rows) {
      const values = reportSections.get(row.amendment_id) ?? [];
      values.push(row.report_section_key);
      reportSections.set(row.amendment_id, values);
    }
    const approvals = new Map<string, Record<string, any>>();
    for (const row of approvalsResult.rows) {
      const values = approvals.get(row.amendment_id) ?? {};
      values[row.role_key] = {
        approved: row.status === 'approved',
        status: row.status,
        by: row.actor_name,
        at: iso(row.acted_at),
        uploadedDoc: row.uploaded_document,
        confirmedAt: iso(row.acted_at),
      };
      approvals.set(row.amendment_id, values);
    }

    const amendments = amendmentsResult.rows.map((row) => {
      const affected = amendmentSections.get(row.id) ?? [];
      const snapshot: Record<string, any> = {};
      for (const item of affected) {
        snapshot[item.section_key] = {
          title: item.snapshot_title,
          content: item.snapshot_content,
          version: item.snapshot_version,
        };
      }
      return {
        id: row.amendment_key,
        number: row.amendment_number,
        title: row.title,
        reason: row.reason,
        description: row.description,
        affectedProtocolSections: affected.map((item) => item.section_key),
        affectedReportSections: reportSections.get(row.id) ?? [],
        status: row.status,
        createdBy: row.created_by_name,
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
        protocolVersion: row.protocol_version,
        protocolSnapshot: snapshot,
        approvals: approvals.get(row.id) ?? {},
      };
    });

    const sections = sectionsResult.rows.map((row) => ({
      id: row.section_key,
      number: row.section_number ?? row.section_key,
      title: row.title,
      content: row.content,
      status: row.status,
      reviewStatus: row.review_status,
      locked: row.locked,
      reviewCycle: row.review_cycle,
      aiGenerated: row.ai_generated,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by_name,
      approvedAt: iso(row.approved_at),
      amended: row.amended,
      amendmentId: row.amendment_key,
      amendmentNumber: row.amendment_number,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      comments: commentsBySection.get(row.id) ?? [],
      issues: issuesBySection.get(row.id) ?? [],
      requiredElements: elementsBySection.get(row.id) ?? [],
    }));

    return {
      protocolId: protocolRow.protocol_identifier,
      version: protocolRow.version,
      status: protocolRow.status,
      createdAt: iso(protocolRow.created_at),
      updatedAt: iso(protocolRow.updated_at),
      sections,
      amendments,
    };
  }

  async getSignaturesByProject(projectId: string, db: Db = getPool()): Promise<any[]> {
    const { rows } = await db.query(
      `select distinct on (s.role_key)
              s.id, s.role_key, s.role_title, s.signed_by_user_id,
              s.signed_by_name, s.signed_by_email, s.signed_at,
              s.timezone, s.ip_address, s.document_hash
       from protocol_signature s
       join protocol p on p.id = s.protocol_id
       where p.project_id = $1
       order by s.role_key, s.signed_at desc, s.id desc`,
      [projectId],
    );
    return rows.map((row) => ({
      id: String(row.id),
      projectId,
      role: row.role_key,
      roleTitle: row.role_title,
      signerName: row.signed_by_name,
      signerEmail: row.signed_by_email || '',
      signerUserId: row.signed_by_user_id ? String(row.signed_by_user_id) : '',
      documentHash: row.document_hash,
      signedAt: iso(row.signed_at),
      timezone: row.timezone,
      ipAddress: row.ip_address || 'unknown',
    }));
  }

  async appendSignatures(
    projectId: string,
    signatures: any[],
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    const protocolId = await this.ensureForProject(projectId, client);
    for (const signature of signatures) {
      if (!signature?.role || String(signature.role).startsWith('report-')) continue;
      if (!String(signature.documentHash || '').trim()) {
        throw new BadRequestException('Protocol signature document hash is required');
      }
      const suppliedId = String(signature.id || '');
      const signatureId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)
        ? suppliedId
        : randomUUID();
      const signedByUserId = signature.signerUserId && actor?.userId === signature.signerUserId
        ? actor.userId
        : actor?.userId ?? null;
      await client.query(
        `insert into protocol_signature (
           id, protocol_id, role_key, role_title, signed_by_user_id,
           signed_by_name, signed_by_email, signed_at, timezone, ip_address,
           document_hash
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do nothing`,
        [
          signatureId,
          protocolId,
          String(signature.role),
          signature.roleTitle || String(signature.role),
          signedByUserId,
          signature.signerName || actor?.name || 'Unknown user',
          signature.signerEmail || actor?.email || null,
          iso(signature.signedAt) || new Date().toISOString(),
          signature.timezone || null,
          signature.ipAddress || null,
          String(signature.documentHash),
        ],
      );
    }
  }

  async save(
    projectId: string,
    value: any,
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Protocol must be an object');
    }
    this.validateProtocolCollections(value);
    const protocolId = await this.ensureForProject(projectId, client);
    await client.query(`select id from protocol where id = $1 for update`, [protocolId]);
    const now = new Date().toISOString();
    const protocol = value;

    await client.query(
      `update protocol set
         protocol_identifier = $2,
         version = $3,
         status = $4,
         updated_at = $5
       where id = $1`,
      [
        protocolId,
        protocol.protocolId ?? null,
        protocol.version || '1.0',
        protocol.status || 'draft',
        now,
      ],
    );

    let amendmentIds = await this.amendmentIdMap(protocolId, client);
    if (Array.isArray(protocol.amendments)) {
      amendmentIds = await this.syncAmendments(protocolId, protocol.amendments, actor, client);
    }
    if (Array.isArray(protocol.sections)) {
      await this.syncSections(protocolId, protocol.sections, amendmentIds, actor, client);
    }
    if (Array.isArray(protocol.amendments)) {
      await this.syncAmendmentRelations(protocolId, protocol.amendments, amendmentIds, client);
    }
  }

  private async amendmentIdMap(protocolId: string, client: PoolClient): Promise<Map<string, string>> {
    const { rows } = await client.query(
      `select id, amendment_key from protocol_amendment where protocol_id = $1`,
      [protocolId],
    );
    return new Map(rows.map((row) => [String(row.amendment_key), String(row.id)]));
  }

  private async syncAmendments(
    protocolId: string,
    amendments: any[],
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<Map<string, string>> {
    const keys: string[] = [];
    const ids = new Map<string, string>();
    for (let index = 0; index < amendments.length; index += 1) {
      const amendment = amendments[index] || {};
      const key = String(amendment.id || `amendment-${index + 1}`);
      keys.push(key);
      const { rows } = await client.query(
         `insert into protocol_amendment (
           protocol_id, amendment_key, amendment_number, title, reason, description,
           status, created_by_user_id, created_by_name, protocol_version,
           created_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         on conflict (protocol_id, amendment_key) do update set
           amendment_number = excluded.amendment_number,
           title = excluded.title,
           reason = excluded.reason,
           description = excluded.description,
           status = excluded.status,
           created_by_user_id = coalesce(excluded.created_by_user_id, protocol_amendment.created_by_user_id),
           created_by_name = coalesce(protocol_amendment.created_by_name, excluded.created_by_name),
           protocol_version = excluded.protocol_version,
           updated_at = excluded.updated_at
         returning id`,
        [
          protocolId,
          key,
          Number(amendment.number || index + 1),
          amendment.title || 'Untitled amendment',
          amendment.reason || '',
          amendment.description || '',
          amendment.status || 'draft',
          amendment.createdBy && actor?.name === amendment.createdBy ? actor.userId ?? null : null,
          amendment.createdBy || actor?.name || null,
          amendment.protocolVersion || '1.0',
          iso(amendment.createdAt) || new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
      ids.set(key, String(rows[0].id));
      await this.syncApprovals(String(rows[0].id), amendment.approvals || {}, actor, client);
    }

    if (keys.length === 0) {
      await client.query(`delete from protocol_amendment where protocol_id = $1`, [protocolId]);
    } else {
      await client.query(
        `delete from protocol_amendment
         where protocol_id = $1 and not (amendment_key = any($2::text[]))`,
        [protocolId, keys],
      );
    }
    return ids;
  }

  private async syncApprovals(
    amendmentId: string,
    approvals: Record<string, any>,
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    const roleKeys = Object.keys(approvals);
    for (const [roleKey, approvalValue] of Object.entries(approvals)) {
      const approval: any = approvalValue || {};
      const status = approval.approved === true ? 'approved' : approval.status || 'pending';
      const actorName = approval.by || null;
      await client.query(
        `insert into protocol_amendment_approval (
           amendment_id, role_key, status, actor_user_id, actor_name, acted_at,
           uploaded_document
         ) values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (amendment_id, role_key) do update set
           status = excluded.status,
           actor_user_id = coalesce(excluded.actor_user_id, protocol_amendment_approval.actor_user_id),
           actor_name = excluded.actor_name,
           acted_at = excluded.acted_at,
           uploaded_document = excluded.uploaded_document`,
        [
          amendmentId,
          roleKey,
          status,
          actorName && actor?.name === actorName ? actor.userId ?? null : null,
          actorName,
          iso(approval.at || approval.confirmedAt),
          approval.uploadedDoc || null,
        ],
      );
    }
    if (roleKeys.length === 0) {
      await client.query(`delete from protocol_amendment_approval where amendment_id = $1`, [amendmentId]);
    } else {
      await client.query(
        `delete from protocol_amendment_approval
         where amendment_id = $1 and not (role_key = any($2::text[]))`,
        [amendmentId, roleKeys],
      );
    }
  }

  private async syncSections(
    protocolId: string,
    sections: any[],
    amendmentIds: Map<string, string>,
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    const keys: string[] = [];
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index] || {};
      const key = String(section.id || index + 1);
      keys.push(key);
      const approvedByName = section.approvedBy || null;
      const { rows } = await client.query(
        `insert into protocol_section (
           protocol_id, section_key, section_number, position, title, content, status,
           review_status, locked, review_cycle, ai_generated, approval_status,
           approved_by_user_id, approved_by_name, approved_at, amended, amendment_id,
           amendment_number, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         on conflict (protocol_id, section_key) do update set
           section_number = excluded.section_number,
           position = excluded.position,
           title = excluded.title,
           content = excluded.content,
           status = excluded.status,
           review_status = excluded.review_status,
           locked = excluded.locked,
           review_cycle = excluded.review_cycle,
           ai_generated = excluded.ai_generated,
           approval_status = excluded.approval_status,
           approved_by_user_id = coalesce(excluded.approved_by_user_id, protocol_section.approved_by_user_id),
           approved_by_name = excluded.approved_by_name,
           approved_at = excluded.approved_at,
           amended = excluded.amended,
           amendment_id = excluded.amendment_id,
           amendment_number = excluded.amendment_number,
           updated_at = excluded.updated_at
         returning id`,
        [
          protocolId,
          key,
          section.number ?? key,
          index + 1,
          section.title || `Section ${index + 1}`,
          sanitizeSectionHtml(section.content || ''),
          section.status || 'draft',
          section.reviewStatus || null,
          section.locked === true,
          Number(section.reviewCycle || 0),
          section.aiGenerated !== false,
          section.approvalStatus || 'draft',
          approvedByName && actor?.name && approvedByName.includes(actor.name) ? actor.userId ?? null : null,
          approvedByName,
          iso(section.approvedAt),
          section.amended === true,
          section.amendmentId ? amendmentIds.get(String(section.amendmentId)) ?? null : null,
          section.amendmentNumber ? Number(section.amendmentNumber) : null,
          iso(section.createdAt) || new Date().toISOString(),
          iso(section.updatedAt) || new Date().toISOString(),
        ],
      );
      const sectionId = String(rows[0].id);
      // A focused write may omit nested collections. Only replace a collection when
      // the caller actually supplied it; absence means "leave the existing rows alone".
      if (Array.isArray(section.issues)) {
        await this.syncIssues(sectionId, section.issues, client);
      }
      if (Array.isArray(section.requiredElements)) {
        await this.syncRequiredElements(sectionId, section.requiredElements, client);
      }
      if (Array.isArray(section.comments)) {
        await this.syncComments(sectionId, section.comments, actor, client);
      }
    }

    if (keys.length === 0) {
      await client.query(`delete from protocol_section where protocol_id = $1`, [protocolId]);
    } else {
      await client.query(
        `delete from protocol_section
         where protocol_id = $1 and not (section_key = any($2::text[]))`,
        [protocolId, keys],
      );
    }
  }

  private async syncIssues(sectionId: string, issues: any[], client: PoolClient): Promise<void> {
    const keys: string[] = [];
    for (let index = 0; index < issues.length; index += 1) {
      const issue = issues[index] || {};
      const key = String(issue.id || `issue-${index + 1}`);
      keys.push(key);
      await client.query(
        `insert into protocol_section_issue (
           section_id, issue_key, severity, subsection, description, reference,
           raised_by, raised_date, status, due_date, text_quote
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (section_id, issue_key) do update set
           severity = excluded.severity,
           subsection = excluded.subsection,
           description = excluded.description,
           reference = excluded.reference,
           raised_by = excluded.raised_by,
           raised_date = excluded.raised_date,
           status = excluded.status,
           due_date = excluded.due_date,
           text_quote = excluded.text_quote`,
        [
          sectionId,
          key,
          issue.severity || 'warning',
          issue.subsection || null,
          issue.description || '',
          issue.reference || null,
          issue.raisedBy || null,
          /^\d{4}-\d{2}-\d{2}$/.test(issue.raisedDate || '') ? issue.raisedDate : null,
          issue.status || 'open',
          issue.dueDate || null,
          issue.textQuote || null,
        ],
      );
    }
    if (keys.length === 0) {
      await client.query(`delete from protocol_section_issue where section_id = $1`, [sectionId]);
    } else {
      await client.query(
        `delete from protocol_section_issue
         where section_id = $1 and not (issue_key = any($2::text[]))`,
        [sectionId, keys],
      );
    }
  }

  private async syncRequiredElements(sectionId: string, elements: any[], client: PoolClient): Promise<void> {
    const keys: string[] = [];
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index] || {};
      const key = String(element.id || `element-${index + 1}`);
      keys.push(key);
      await client.query(
        `insert into protocol_section_required_element (
           section_id, element_key, name, status, reference, evidence,
           verified_by, verified_date
         ) values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (section_id, element_key) do update set
           name = excluded.name,
           status = excluded.status,
           reference = excluded.reference,
           evidence = excluded.evidence,
           verified_by = excluded.verified_by,
           verified_date = excluded.verified_date`,
        [
          sectionId,
          key,
          element.name || 'Required element',
          element.status || 'missing',
          element.reference || null,
          element.evidence || null,
          element.verifiedBy || null,
          /^\d{4}-\d{2}-\d{2}$/.test(element.verifiedDate || '') ? element.verifiedDate : null,
        ],
      );
    }
    if (keys.length === 0) {
      await client.query(`delete from protocol_section_required_element where section_id = $1`, [sectionId]);
    } else {
      await client.query(
        `delete from protocol_section_required_element
         where section_id = $1 and not (element_key = any($2::text[]))`,
        [sectionId, keys],
      );
    }
  }

  private async syncComments(
    sectionId: string,
    comments: any[],
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    const keys: string[] = [];
    for (let index = 0; index < comments.length; index += 1) {
      const comment = comments[index] || {};
      const key = String(comment.id || `comment-${index + 1}`);
      keys.push(key);
      const { rows } = await client.query(
        `insert into protocol_section_comment (
           section_id, comment_key, author_user_id, author_name, author_role,
           content, comment_type, subsection, status, resolved_by_user_id,
           resolved_by_name, resolved_at, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (section_id, comment_key) do update set
           author_user_id = coalesce(excluded.author_user_id, protocol_section_comment.author_user_id),
           author_name = protocol_section_comment.author_name,
           author_role = protocol_section_comment.author_role,
           content = excluded.content,
           comment_type = excluded.comment_type,
           subsection = excluded.subsection,
           status = excluded.status,
           resolved_by_user_id = coalesce(excluded.resolved_by_user_id, protocol_section_comment.resolved_by_user_id),
           resolved_by_name = excluded.resolved_by_name,
           resolved_at = excluded.resolved_at
         returning id`,
        [
          sectionId,
          key,
          comment.author && actor?.name && String(comment.author).includes(actor.name) ? actor.userId ?? null : null,
          comment.author || actor?.name || 'Unknown user',
          comment.authorRole || null,
          comment.content || '',
          comment.type || 'general',
          comment.subsection || null,
          comment.status || 'open',
          comment.resolvedBy && actor?.name && String(comment.resolvedBy).includes(actor.name) ? actor.userId ?? null : null,
          comment.resolvedBy || null,
          iso(comment.resolvedDate),
          iso(comment.timestamp) || new Date().toISOString(),
        ],
      );
      if (Array.isArray(comment.replies)) {
        await this.syncCommentReplies(String(rows[0].id), comment.replies, actor, client);
      }
    }
    if (keys.length === 0) {
      await client.query(`delete from protocol_section_comment where section_id = $1`, [sectionId]);
    } else {
      await client.query(
        `delete from protocol_section_comment
         where section_id = $1 and not (comment_key = any($2::text[]))`,
        [sectionId, keys],
      );
    }
  }

  private async syncCommentReplies(
    commentId: string,
    replies: any[],
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<void> {
    const keys: string[] = [];
    for (let index = 0; index < replies.length; index += 1) {
      const reply = replies[index] || {};
      const key = String(reply.id || `reply-${index + 1}`);
      keys.push(key);
      await client.query(
        `insert into protocol_section_comment_reply (
           comment_id, reply_key, author_user_id, author_name, author_role,
           content, status, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (comment_id, reply_key) do update set
           author_user_id = coalesce(excluded.author_user_id, protocol_section_comment_reply.author_user_id),
           author_name = protocol_section_comment_reply.author_name,
           author_role = protocol_section_comment_reply.author_role,
           content = excluded.content,
           status = excluded.status`,
        [
          commentId,
          key,
          reply.author && actor?.name && String(reply.author).includes(actor.name)
            ? actor.userId ?? null
            : null,
          reply.author || actor?.name || 'Unknown user',
          reply.authorRole || reply.role || null,
          reply.content || '',
          reply.status || 'open',
          iso(reply.timestamp) || new Date().toISOString(),
        ],
      );
    }
    if (keys.length === 0) {
      await client.query(`delete from protocol_section_comment_reply where comment_id = $1`, [commentId]);
    } else {
      await client.query(
        `delete from protocol_section_comment_reply
         where comment_id = $1 and not (reply_key = any($2::text[]))`,
        [commentId, keys],
      );
    }
  }

  private async syncAmendmentRelations(
    protocolId: string,
    amendments: any[],
    amendmentIds: Map<string, string>,
    client: PoolClient,
  ): Promise<void> {
    const { rows: sectionRows } = await client.query(
      `select id, section_key from protocol_section where protocol_id = $1`,
      [protocolId],
    );
    const sectionIds = new Map(sectionRows.map((row) => [String(row.section_key), String(row.id)]));

    for (const amendment of amendments) {
      const amendmentId = amendmentIds.get(String(amendment.id));
      if (!amendmentId) continue;
      await client.query(`delete from protocol_amendment_section where amendment_id = $1`, [amendmentId]);
      await client.query(`delete from protocol_amendment_report_section where amendment_id = $1`, [amendmentId]);

      for (const sectionKey of amendment.affectedProtocolSections || []) {
        const sectionId = sectionIds.get(String(sectionKey));
        if (!sectionId) continue;
        const snapshot = amendment.protocolSnapshot?.[sectionKey] || {};
        await client.query(
          `insert into protocol_amendment_section (
             amendment_id, section_id, snapshot_title, snapshot_content, snapshot_version
           ) values ($1,$2,$3,$4,$5)`,
          [
            amendmentId,
            sectionId,
            snapshot.title || null,
            snapshot.content || null,
            snapshot.version || amendment.protocolVersion || null,
          ],
        );
      }
      for (const reportSectionKey of amendment.affectedReportSections || []) {
        await client.query(
          `insert into protocol_amendment_report_section (amendment_id, report_section_key)
           values ($1,$2)`,
          [amendmentId, String(reportSectionKey)],
        );
      }
    }
  }

  async updateSectionContent(
    projectId: string,
    sectionKey: string,
    values: {
      content: string;
      approvalStatus?: string;
      approvedBy?: string;
      approvedAt?: string;
    },
    actor: AuditActor | undefined,
    client: PoolClient,
  ): Promise<{ title: string; content: string; updatedAt: string }> {
    const protocolId = await this.ensureForProject(projectId, client);
    const now = new Date().toISOString();
    const approvedBy = values.approvedBy ?? null;
    const { rows } = await client.query(
      `update protocol_section set
         content = $3,
         approval_status = coalesce($4, approval_status),
         approved_by_user_id = coalesce($6, approved_by_user_id),
         approved_by_name = coalesce($5, approved_by_name),
         approved_at = coalesce($7, approved_at),
         updated_at = $8
       where protocol_id = $1 and section_key = $2
       returning title, content, updated_at`,
      [
        protocolId,
        sectionKey,
        sanitizeSectionHtml(values.content),
        values.approvalStatus ?? null,
        approvedBy,
        approvedBy && actor?.name && approvedBy.includes(actor.name) ? actor.userId ?? null : null,
        iso(values.approvedAt),
        now,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Protocol section not found');
    await client.query(`update protocol set updated_at = $2 where id = $1`, [protocolId, now]);
    return {
      title: rows[0].title,
      content: rows[0].content,
      updatedAt: iso(rows[0].updated_at) || now,
    };
  }

  private validateProtocolCollections(protocol: any): void {
    for (const key of ['sections', 'amendments']) {
      if (protocol[key] !== undefined && !Array.isArray(protocol[key])) {
        throw new BadRequestException(`Protocol ${key} must be an array`);
      }
    }

    const assertUnique = (values: string[], label: string) => {
      const seen = new Set<string>();
      for (const value of values) {
        if (seen.has(value)) throw new BadRequestException(`Duplicate ${label}: ${value}`);
        seen.add(value);
      }
    };

    const amendments = protocol.amendments || [];
    assertUnique(
      amendments.map((item: any, index: number) => String(item?.id || `amendment-${index + 1}`)),
      'protocol amendment id',
    );
    const amendmentNumbers = amendments.map((item: any, index: number) =>
      Number(item?.number || index + 1),
    );
    if (amendmentNumbers.some((value: number) => !Number.isInteger(value) || value < 1)) {
      throw new BadRequestException('Protocol amendment numbers must be positive integers');
    }
    assertUnique(amendmentNumbers.map(String), 'protocol amendment number');

    const sections = protocol.sections || [];
    assertUnique(
      sections.map((item: any, index: number) => String(item?.id || index + 1)),
      'protocol section id',
    );
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const section = sections[sectionIndex] || {};
      for (const key of ['issues', 'requiredElements', 'comments']) {
        if (section[key] !== undefined && !Array.isArray(section[key])) {
          throw new BadRequestException(`Protocol section ${key} must be an array`);
        }
      }
      assertUnique(
        (section.issues || []).map((item: any, index: number) => String(item?.id || `issue-${index + 1}`)),
        'protocol issue id',
      );
      assertUnique(
        (section.requiredElements || []).map((item: any, index: number) => String(item?.id || `element-${index + 1}`)),
        'protocol required-element id',
      );
      const comments = section.comments || [];
      assertUnique(
        comments.map((item: any, index: number) => String(item?.id || `comment-${index + 1}`)),
        'protocol comment id',
      );
      for (const comment of comments) {
        if (comment?.replies !== undefined && !Array.isArray(comment.replies)) {
          throw new BadRequestException('Protocol comment replies must be an array');
        }
        assertUnique(
          (comment?.replies || []).map((item: any, index: number) => String(item?.id || `reply-${index + 1}`)),
          'protocol comment reply id',
        );
      }
    }
  }
}
