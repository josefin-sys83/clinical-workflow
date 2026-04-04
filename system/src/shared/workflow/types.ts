export type WorkflowStepId =
  | 'dashboard'
  | 'project-setup'
  | 'synopsis'
  | 'scope'
  | 'protocol-make'
  | 'protocol-review'
  | 'protocol-pdf'
  | 'report-make'
  | 'report-review'
  | 'report-pdf';

export type WorkflowDomain = 'project' | 'protocol' | 'report';

// Canonical document lifecycle status. Keep it small and deterministic.
export type DocumentLifecycleState =
  | 'draft'
  | 'input_needed'
  | 'ready_for_review'
  | 'in_review'
  | 'blocked'
  | 'approved'
  | 'signed'
  | 'finalized';

export type IssueSeverity = 'blocker' | 'warning' | 'info';

export interface WorkflowStepDefinition {
  id: WorkflowStepId;
  label: string;
  path: string;
  domain: WorkflowDomain;
}
