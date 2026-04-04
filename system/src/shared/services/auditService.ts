import { createAuditEvent, listAuditEvents } from '@/shared/api/audit';
import type { AuditEvent, AuditEventType } from '@/shared/workflow/audit';
import type { WorkflowDomain, WorkflowStepId } from '@/shared/workflow/types';

export async function listProjectAuditEvents(projectId: string): Promise<AuditEvent[]> {
  return listAuditEvents(projectId);
}

export async function createProjectAuditEvent(args: {
  projectId: string;
  domain: WorkflowDomain;
  stepId: WorkflowStepId;
  type: AuditEventType;
  summary: string;
  details?: string;
}): Promise<AuditEvent | null> {
  return createAuditEvent({ projectId: args.projectId, domain: args.domain, stepId: args.stepId, type: args.type, summary: args.summary, details: args.details });
}
