import type { WorkflowSnapshot } from '@/shared/api/workflow';
import type { WorkflowStepId } from './types';

// Canonical, sequential order of the workflow. Every step in this list advances to one
// of DONE_STATES (via advanceWorkflowStep) exactly when the next step should unlock —
// see ProjectSetupPage/SynopsisPage/Gate1/Makeprotokoll App/ReportContent/ReviewPageCopy
// for each step's own transition call. This file is the single place that turns those
// scattered transitions into "can the user actually be on step X right now".
export const WORKFLOW_STEP_ORDER: WorkflowStepId[] = [
  'project-setup',
  'synopsis',
  'scope',
  'protocol-make',
  'protocol-review',
  'protocol-pdf',
  'report-make',
  'report-review',
  'report-pdf',
];

const DONE_STATES = new Set(['approved', 'signed', 'final']);

export function isStepUnlocked(stepId: WorkflowStepId, steps: WorkflowSnapshot['steps'] | undefined): boolean {
  const index = WORKFLOW_STEP_ORDER.indexOf(stepId);
  if (index <= 0) return true; // project-setup (or anything unrecognized) is always reachable
  const previousStep = WORKFLOW_STEP_ORDER[index - 1];
  const state = steps?.[previousStep]?.state;
  return !!state && DONE_STATES.has(state);
}

// The furthest step the user has actually unlocked, used to redirect a request for a
// locked step back to somewhere useful instead of rendering it half-broken.
export function furthestUnlockedStep(steps: WorkflowSnapshot['steps'] | undefined): WorkflowStepId {
  let furthest: WorkflowStepId = WORKFLOW_STEP_ORDER[0];
  for (const step of WORKFLOW_STEP_ORDER) {
    if (isStepUnlocked(step, steps)) furthest = step;
    else break;
  }
  return furthest;
}

export function stepPath(stepId: WorkflowStepId, projectId: string): string {
  switch (stepId) {
    case 'project-setup': return `/projects/${projectId}/workflow/project-setup`;
    case 'synopsis': return `/projects/${projectId}/workflow/synopsis`;
    case 'scope': return `/projects/${projectId}/workflow/scope`;
    case 'protocol-make': return `/projects/${projectId}/workflow/protocol/make`;
    case 'protocol-review': return `/projects/${projectId}/workflow/protocol/review`;
    case 'protocol-pdf': return `/projects/${projectId}/workflow/protocol/pdf`;
    case 'report-make': return `/projects/${projectId}/workflow/report/make`;
    case 'report-review': return `/projects/${projectId}/workflow/report/review`;
    case 'report-pdf': return `/projects/${projectId}/workflow/report/pdf`;
    default: return `/projects/${projectId}`;
  }
}
