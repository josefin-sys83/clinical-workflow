import { apiFetch } from './http';
import type { DocumentLifecycleState, WorkflowStepId } from '@/shared/workflow/types';
import type { AuditEvent } from '@/shared/workflow/audit';

export interface WorkflowSnapshot {
  projectId: string;
  steps: Record<WorkflowStepId, { state: DocumentLifecycleState; updatedAt: string }>;
}

export async function getWorkflow(projectId: string): Promise<WorkflowSnapshot> {
  return apiFetch<WorkflowSnapshot>(`/projects/${encodeURIComponent(projectId)}/workflow`);
}

export async function transitionWorkflowStep(args: {
  projectId: string;
  stepId: WorkflowStepId;
  to: DocumentLifecycleState;
  note?: string;
}): Promise<{ ok: true; snapshot: WorkflowSnapshot; auditEvent: AuditEvent }> {
  const { projectId, stepId, to, note } = args;
  return apiFetch<{ ok: true; snapshot: WorkflowSnapshot; auditEvent: AuditEvent }>(
    `/projects/${encodeURIComponent(projectId)}/workflow/${encodeURIComponent(stepId)}/transition`,
    {
    method: 'POST',
    body: JSON.stringify({ to, note }),
    }
  );
}
