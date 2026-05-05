import { apiFetch } from './http';
import type { AuditEvent, AuditEventType } from '@/shared/workflow/audit';
import type { WorkflowDomain, WorkflowStepId } from '@/shared/workflow/types';

export async function listAuditEvents(projectId: string): Promise<AuditEvent[]> {
  const raw = await apiFetch<any[]>(`/projects/${encodeURIComponent(projectId)}/audit`);
  return raw.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    stepId: e.stepId ?? null,
    type: e.type,
    summary: e.message,
    details: e.metadata && (e.metadata.previousContent || e.metadata.newContent) ? ("|||BEFORE|||" + (e.metadata.previousContent || "").replace(/[*#_`]/g, "").substring(0, 500) + "|||AFTER|||" + (e.metadata.newContent || "").replace(/[*#_`]/g, "").substring(0, 500)) : e.metadata?.roles ? e.metadata.roles : undefined,
    at: e.createdAt,
    actor: e.actorUserId ? { id: e.actorUserId, name: e.actorUserId } : undefined,
    reason: e.metadata?.reason ?? undefined,
  }));
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