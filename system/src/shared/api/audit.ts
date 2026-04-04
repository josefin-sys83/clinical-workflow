import { apiFetch } from './http';
import type { AuditEvent, AuditEventType } from '@/shared/workflow/audit';
import type { WorkflowDomain, WorkflowStepId } from '@/shared/workflow/types';

export async function listAuditEvents(projectId: string): Promise<AuditEvent[]> {
  return apiFetch<AuditEvent[]>(`/projects/${encodeURIComponent(projectId)}/audit`);
}

export async function createAuditEvent(args: {
  projectId: string;
  domain: WorkflowDomain;
  stepId: WorkflowStepId;
  type: AuditEventType;
  summary: string;
  details?: string;
}): Promise<AuditEvent> {
  const { projectId, domain, stepId, type, summary, details } = args;
  return apiFetch<AuditEvent>(`/projects/${encodeURIComponent(projectId)}/audit`, {
    method: 'POST',
    body: JSON.stringify({ domain, stepId, type, summary, details }),
  });
}
