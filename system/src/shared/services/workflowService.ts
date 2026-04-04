import type { WorkflowStepId, DocumentLifecycleState } from '@/shared/workflow/types';
import { getWorkflow, transitionWorkflowStep, type WorkflowSnapshot } from '@/shared/api/workflow';

export async function getWorkflowSnapshot(projectId: string): Promise<WorkflowSnapshot> {
  return getWorkflow(projectId);
}

export async function transitionWorkflow(args: {
  projectId: string;
  stepId: WorkflowStepId;
  to: DocumentLifecycleState;
  note?: string;
}): Promise<{ snapshot: WorkflowSnapshot }> {
  const res = await transitionWorkflowStep({ projectId: args.projectId, stepId: args.stepId, to: args.to, note: args.note });
  return { snapshot: res.snapshot };
}
