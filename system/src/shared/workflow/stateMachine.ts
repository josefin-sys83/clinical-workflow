import type { DocumentLifecycleState } from './types';

export type Transition = {
  from: DocumentLifecycleState;
  to: DocumentLifecycleState;
  // Human-readable reason for audit/debugging.
  reason: string;
};

// A small, explicit state machine for document lifecycles.
// Keep business rules here (later you can move this server-side).
const TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'input_needed', reason: 'Missing required input' },
  { from: 'draft', to: 'ready_for_review', reason: 'Authoring complete' },

  { from: 'input_needed', to: 'draft', reason: 'Input provided' },
  { from: 'input_needed', to: 'ready_for_review', reason: 'All required input provided' },

  { from: 'ready_for_review', to: 'in_review', reason: 'Review started' },
  { from: 'in_review', to: 'blocked', reason: 'Blockers raised during review' },
  { from: 'in_review', to: 'approved', reason: 'Review approved' },

  { from: 'blocked', to: 'draft', reason: 'Blockers addressed in authoring' },
  { from: 'blocked', to: 'ready_for_review', reason: 'Ready for re-review' },

  { from: 'approved', to: 'signed', reason: 'Document signed' },
  { from: 'signed', to: 'finalized', reason: 'Final export completed' },
];

export function canTransition(
  from: DocumentLifecycleState,
  to: DocumentLifecycleState
): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getAllowedTransitions(from: DocumentLifecycleState): Transition[] {
  return TRANSITIONS.filter((t) => t.from === from);
}

export function assertTransition(
  from: DocumentLifecycleState,
  to: DocumentLifecycleState
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}
