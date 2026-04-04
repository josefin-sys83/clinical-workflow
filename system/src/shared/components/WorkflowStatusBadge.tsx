import { Badge } from '@/shared/ui/badge';
import type { DocumentLifecycleState } from '@/shared/workflow/types';

const LABEL: Record<DocumentLifecycleState, string> = {
  draft: 'Draft',
  input_needed: 'Input',
  ready_for_review: 'Ready',
  in_review: 'Review',
  blocked: 'Blocked',
  approved: 'Approved',
  signed: 'Signed',
  finalized: 'Final',
};

function variantFor(state: DocumentLifecycleState): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (state) {
    case 'blocked':
      return 'destructive';
    case 'approved':
    case 'signed':
    case 'finalized':
      return 'default';
    case 'in_review':
      return 'secondary';
    case 'ready_for_review':
      return 'secondary';
    case 'input_needed':
      return 'outline';
    case 'draft':
    default:
      return 'outline';
  }
}

export function WorkflowStatusBadge(props: { state?: DocumentLifecycleState; className?: string }) {
  const state = props.state ?? 'draft';
  return (
    <Badge variant={variantFor(state)} className={props.className}>
      {LABEL[state]}
    </Badge>
  );
}
