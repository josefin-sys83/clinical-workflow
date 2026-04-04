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

export type StepLifecycleState =
  | 'draft'
  | 'input_needed'
  | 'ready'
  | 'in_review'
  | 'blocked'
  | 'approved'
  | 'signed'
  | 'final';

export type TransitionAction =
  | 'start_review'
  | 'request_changes'
  | 'approve'
  | 'sign'
  | 'finalize'
  | 'mark_ready'
  | 'mark_input_needed';
