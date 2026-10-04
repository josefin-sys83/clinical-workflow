import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getPool } from '../../db/pg';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { acceptedFindingRequirements } from '../projects/finding-requirements';
import { ProtocolsService } from './protocols.service';
import { ProtocolAttachmentsService } from './protocol-attachments.service';
import { assertProtocolDocumentsMutable } from './protocol-document-lock';

@Injectable()
export class ProtocolFindingDocumentsService {
  constructor(
    private readonly protocols: ProtocolsService,
    private readonly attachments: ProtocolAttachmentsService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  async decide(projectId: string, sectionKey: string, issueId: string,
    action: 'document' | 'unlink' | 'risk_accepted', actor: AuditActor,
    attachmentId?: string, reason?: string) {
    const client = await getPool().connect();
    let verification: { id: string; requestId: string } | undefined;
    try {
      await client.query('BEGIN');
      const data = await assertProtocolDocumentsMutable(client, projectId);
      const protocol = await this.protocols.getByProject(projectId, client);
      const section = protocol?.sections?.find((item: any) => item.id === sectionKey);
      const issue = section?.issues?.find((item: any) => item.id === issueId);
      if (!issue) throw new NotFoundException('Finding not found; reload the section.');
      const { rows: findings } = await client.query(
        `select i.id from protocol_section_issue i join protocol_section ps on ps.id=i.section_id
         join protocol pr on pr.id=ps.protocol_id where pr.project_id=$1 and ps.section_key=$2 and i.issue_key=$3`,
        [projectId, sectionKey, issueId],
      );
      const findingId = findings[0]?.id;
      if (!findingId) throw new NotFoundException('Finding not found; reload the section.');
      const requirement = acceptedFindingRequirements(data.scope?.requirements).find(r => r.id === issue.requirementId);
      const snapshot = { ...issue, severity: issue.originalSeverity || issue.severity, status: 'open' };
      let document: any;
      if (action === 'document') {
        if (!requirement) throw new BadRequestException('Only findings linked to an accepted requirement can be satisfied by a document.');
        if (!['blocker','warning'].includes(snapshot.severity)) throw new BadRequestException('Choose a blocker or warning finding.');
        const { rows } = await client.query(
          `select pa.id,pa.filename,pa.appendix_number from protocol_attachment pa join protocol pr on pr.id=pa.protocol_id
           where pr.project_id=$1 and pa.id=$2`, [projectId, attachmentId],
        );
        document = rows[0];
        if (!document) throw new NotFoundException('Protocol attachment not found in this project');
      }
      if (action === 'unlink' || action === 'risk_accepted') {
        if (action === 'unlink' && !issue.documentLink) throw new NotFoundException('Document link not found');
        if (action === 'risk_accepted' && !reason?.trim()) throw new BadRequestException('A reason is required for risk acceptance');
        await client.query(
          `update protocol_section_issue set attachment_id=null,verification_status=null,verification_request_id=null,
           verification_reason=null,verified_at=null,document_linked_by_user_id=null,document_linked_at=null,
           status=case when $2 then 'resolved' else status end where id=$1`,
          [findingId, action === 'risk_accepted'],
        );
        if (issue.documentLink) document = { id: issue.documentLink.attachmentId, label: issue.documentLink.label };
      } else {
        const requestId = randomUUID();
        await client.query(
          `update protocol_section_issue set attachment_id=$2,verification_status='checking',verification_request_id=$3,
           verification_reason=null,verified_at=null,document_linked_by_user_id=$4,document_linked_at=now() where id=$1`,
          [findingId, document.id, requestId, actor.userId ?? null],
        );
        verification = { id: findingId, requestId };
      }
      await this.audit.record({
        projectId, stepId: 'protocol-make', type: `protocol.finding.${action === 'document' ? 'document.linked' : action === 'unlink' ? 'document.unlinked' : 'risk_accepted'}`,
        message: action === 'document' ? `Linked finding to Appendix ${document.appendix_number} - ${document.filename}`
          : action === 'unlink' ? `Removed finding link to ${document.label}` : `Accepted finding risk: ${issue.description}`,
        actor, entityType: 'protocol_section', entityId: sectionKey,
        metadata: { description: issue.description, requirementId: issue.requirementId, document, reason: reason ?? null },
      }, client);
      const result = await this.protocols.getByProject(projectId, client);
      await client.query('COMMIT');
      if (verification) void this.verify(projectId, verification.id, verification.requestId).catch(() => {});
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }

  private async verify(projectId: string, id: string, requestId: string) {
    const { rows } = await getPool().query(
      `select d.*,p.data,ps.section_key,ps.title,ps.content from protocol_section_issue d
       join protocol_section ps on ps.id=d.section_id join protocol pr on pr.id=ps.protocol_id
       join projects p on p.id=pr.project_id where p.id=$1 and d.id=$2 and d.verification_request_id=$3`, [projectId, id, requestId],
    );
    const decision = rows[0];
    if (!decision) return;
    let status = 'failed';
    let reason = 'Document check unavailable. The document remains linked.';
    try {
      const requirement = acceptedFindingRequirements(decision.data?.scope?.requirements).find(r => r.id === decision.requirement_id);
      const documents = await this.attachments.supportingDocuments(projectId, decision.data?.scope?.requirements, true);
      const document = documents.find(d => d.id === decision.attachment_id);
      if (!requirement || !document?.extractedText) throw new Error(document?.extractionError || 'The document has no readable text or the requirement is no longer accepted.');
      const result = await this.ai.checkFindingDocument({
        issue: {
          id: decision.issue_key, requirementId: decision.requirement_id,
          severity: decision.severity, description: decision.description,
          subsection: decision.subsection, reference: decision.reference, source: decision.source,
          targetSection: decision.target_section, remediation: decision.remediation, textQuote: decision.text_quote,
        }, requirement,
        section: { id: decision.section_key, title: decision.title, content: decision.content }, document,
      });
      status = result.status;
      reason = result.reason;
    } catch (error) {
      reason = error instanceof Error ? error.message : reason;
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      // A check started before signature readiness must still report its result.
      // This updates the assessment of an existing link, never its association.
      await client.query('select id from projects where id=$1 for update', [projectId]);
      const { rows: updated } = await client.query(
        `update protocol_section_issue set verification_status=$4,verification_reason=$5,verified_at=now()
         where id=$1 and verification_request_id=$2 and attachment_id=$3 returning id`,
        [id, requestId, decision.attachment_id, status, reason],
      );
      if (updated.length) await this.audit.record({
        projectId, stepId: 'protocol-make', type: 'protocol.finding.document.checked',
        message: `Supporting document check: ${status}`, actor: { name: 'AI Document Review' },
        entityType: 'protocol_section', entityId: decision.section_key,
        metadata: { attachmentId: decision.attachment_id, requirementId: decision.requirement_id, status, reason },
      }, client);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
}
