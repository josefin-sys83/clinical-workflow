import type {
  DocumentLifecycleState,
  IssueSeverity,
  WorkflowDomain,
  WorkflowStepId,
} from './types';

export type AuditEventType =
  | 'lifecycle_transition'
  | 'risk_accepted'
  | 'changes_requested'
  | 'note'
  | 'viewed';

export interface AuditEvent {
  id: string;
  projectId: string;
  domain: WorkflowDomain;
  stepId: WorkflowStepId;
  type: AuditEventType;
  at: string; // ISO timestamp
  actor: {
    name: string;
    email: string;
    role?: string;
  };
  summary: string;
  details?: string;
  reason?: string;
  sectionTitle?: string;
  severity?: IssueSeverity;
  fromState?: DocumentLifecycleState;
  toState?: DocumentLifecycleState;
}
