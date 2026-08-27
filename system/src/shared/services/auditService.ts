import { listAuditEvents } from '@/shared/api/audit';
import type { AuditEvent } from '@/shared/workflow/audit';

export async function listProjectAuditEvents(projectId: string): Promise<AuditEvent[]> {
  return listAuditEvents(projectId);
}
