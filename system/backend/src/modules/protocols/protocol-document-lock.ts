import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';

export async function assertProtocolDocumentsMutable(client: Pick<PoolClient, 'query'>, projectId: string) {
  const project = await client.query('select data from projects where id=$1 for update', [projectId]);
  if (!project.rows[0]) throw new NotFoundException('Project not found');
  const { rows } = await client.query(
    `select 1 from workflow_step_state where project_id=$1 and step_id='protocol-pdf'
       and state in ('in_review','ready_for_review','approved','signed','final')
     union all select 1 from document_artifact where project_id=$1 and doc_type='protocol'
     union all select 1 from protocol where project_id=$1 and status in ('signed','final','finalized')`,
    [projectId],
  );
  if (rows.length) throw new ForbiddenException('Protocol document links are locked while out for signature or finalized.');
  return project.rows[0].data || {};
}
