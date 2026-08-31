import type { WorkflowStepId, DocumentLifecycleState } from '@/shared/workflow/types';
import { getWorkflow, transitionWorkflowStep, type WorkflowSnapshot } from '@/shared/api/workflow';
import { ApiError } from '@/shared/api/http';

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

// The backend now validates each transition against the step's current state (a given
// action only succeeds from the state(s) it's meant to follow), so reaching `to` from
// wherever the step currently sits may require passing through every stage in between.
// 'blocked' branches off of 'in_review' rather than continuing the same forward line as
// approved/signed/final, so this is a prerequisite map rather than one linear chain.
const WORKFLOW_PREREQUISITES: Partial<Record<DocumentLifecycleState, DocumentLifecycleState[]>> = {
  in_review: ['ready_for_review'],
  blocked: ['ready_for_review', 'in_review'],
  approved: ['ready_for_review', 'in_review'],
  signed: ['ready_for_review', 'in_review', 'approved'],
  final: ['ready_for_review', 'in_review', 'approved', 'signed'],
};

// Thrown instead of a raw 403 when advanceWorkflowStep() determines that the *current*
// user genuinely cannot proceed because an earlier stage is still owned by a different
// role — as opposed to a real client bug. Callers should show `.message` to the user
// rather than treating this as an unexpected failure.
export class WorkflowStepBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowStepBlockedError';
  }
}

const ACTION_LABELS: Record<string, string> = {
  mark_input_needed: 'mark this step as needing input',
  mark_ready: 'mark this step ready for review',
  start_review: 'start the review',
  request_changes: 'request changes',
  approve: 'approve',
  sign: 'sign',
  finalize: 'finalize',
};

// The backend's role-guard message looks like "Role required to perform 'approve': one
// of [admin, reviewer]" — parsed here into a sentence a non-technical user can act on
// ("wait for a reviewer"), rather than surfacing the raw 403 text.
function describeRoleBlock(payload: unknown): string {
  const raw = typeof (payload as { message?: unknown })?.message === 'string' ? (payload as { message: string }).message : '';
  const match = raw.match(/perform '([^']+)': one of \[([^\]]+)\]/);
  if (!match) {
    return 'This step is waiting for someone with a different role to complete an earlier action before you can continue.';
  }
  const [, action, rolesRaw] = match;
  const allRoles = rolesRaw.split(',').map((r) => r.trim());
  const roles = allRoles.filter((r) => r !== 'admin');
  const roleList = (roles.length ? roles : allRoles).join(' or ');
  const actionLabel = ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
  return `This step is waiting for a ${roleList} to ${actionLabel} before you can continue.`;
}

export async function advanceWorkflowStep(args: {
  projectId: string;
  stepId: WorkflowStepId;
  to: DocumentLifecycleState;
  note?: string;
}): Promise<void> {
  // Read the step's actual current state first, rather than assuming it always starts
  // from scratch — a prerequisite stage another role already completed (e.g. an author's
  // earlier mark_ready/start_review) must never be re-attempted under the current
  // caller's own role.
  const snapshot = await getWorkflowSnapshot(args.projectId);
  const currentState = snapshot.steps[args.stepId]?.state;

  const chain = [...(WORKFLOW_PREREQUISITES[args.to] ?? []), args.to];
  // Older backend rows use `ready`; the canonical frontend name is
  // `ready_for_review`. Treat them as the same state so a retry does not attempt
  // mark_ready twice and fail with an invalid ready -> ready transition.
  const normalizedCurrentState = (currentState as string | undefined) === 'ready'
    ? 'ready_for_review'
    : currentState;
  const currentIndex = normalizedCurrentState ? chain.indexOf(normalizedCurrentState) : -1;
  // currentState not found in this target's chain (e.g. still 'draft', or a branch
  // state like 'blocked' that re-enters at the top) means nothing has been done yet —
  // run the full chain. Otherwise only what's strictly after where it already sits.
  const remaining = currentIndex === -1 ? chain : chain.slice(currentIndex + 1);

  for (const stage of remaining) {
    try {
      await transitionWorkflow({ projectId: args.projectId, stepId: args.stepId, to: stage, note: args.note });
    } catch (err) {
      // A role mismatch here is never a bug in this helper — it means the step
      // genuinely needs another role's action first. Surface that plainly instead of
      // swallowing it (the old behavior let callers silently "succeed" and navigate
      // away without the transition ever having happened).
      if (err instanceof ApiError && err.status === 403) {
        throw new WorkflowStepBlockedError(describeRoleBlock(err.payload));
      }
      throw err;
    }
  }
}
