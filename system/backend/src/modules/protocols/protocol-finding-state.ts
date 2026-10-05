import type { PoolClient } from 'pg';
import { BadRequestException } from '@nestjs/common';

export function withFindingDocumentLink(issue: any, row: any): any {
  if (!row.attachment_id) return issue;
  const state = row.verification_status || 'failed';
  return {
    ...issue,
    originalSeverity: issue.severity,
    severity: state === 'warning' || state === 'blocker' ? state : issue.severity,
    documentLink: {
      id: row.id, attachmentId: row.attachment_id,
      label: `Appendix ${row.appendix_number} - ${row.filename}`,
      status: state, reason: row.verification_reason ?? null,
      decidedByUserId: row.document_linked_by_user_id, decidedAt: row.document_linked_at,
    },
  };
}

export async function assertNoProtocolBlockers(client: Pick<PoolClient, 'query'>, projectId: string) {
  const sections = await client.query(
    'select ps.id,ps.ai_generated,ps.analysis_status from protocol_section ps join protocol pr on pr.id=ps.protocol_id where pr.project_id=$1', [projectId]);
  if (sections.rows.some(section => section.ai_generated && section.analysis_status !== 'succeeded')) {
    throw new BadRequestException('Complete protocol section analysis before completing this step.');
  }
  const findings = await client.query(`select i.* from protocol_section_issue i join protocol_section ps on ps.id=i.section_id
    join protocol pr on pr.id=ps.protocol_id where pr.project_id=$1`, [projectId]);
  if (findings.rows.some(issue => issue.status === 'open' && (issue.attachment_id
    ? issue.verification_status === 'blocker' : issue.severity === 'blocker'))) {
    throw new BadRequestException('Resolve the protocol blockers before completing this step.');
  }
}
