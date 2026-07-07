import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../auth/roles.decorator';
import { TransitionAction } from '../common/types';
import { stateNameToAction } from './workflow.service';

// transition() is one endpoint that drives every workflow action via a body field
// (`action` or `to`), so a static @Roles() decorator can't express "who may do this" —
// the answer depends on which action the request actually resolves to. This guard
// mirrors the role convention already established in documents.controller.ts: authors
// do draft-stage work and submit for review, reviewers approve/reject during review,
// approvers sign and finalize. 'admin' is always allowed, matching every @Roles() list
// in that controller.
const ACTION_ROLES: Record<TransitionAction, Role[]> = {
  mark_input_needed: ['admin', 'author'],
  mark_ready: ['admin', 'author'],
  start_review: ['admin', 'author'],
  request_changes: ['admin', 'reviewer'],
  approve: ['admin', 'reviewer'],
  sign: ['admin', 'approver'],
  finalize: ['admin', 'approver'],
};

// request_changes is the one action whose allowed roles depend on which step it's
// invoked against. On the review steps it's a reviewer's call. On the final PDF steps
// it's an approver's last checkpoint before signing — an approver sending the document
// back for changes there is a distinct, legitimate use case from the review-stage
// action, not a broadening of who can reject during review.
const STEP_ACTION_ROLE_OVERRIDES: Partial<Record<string, Partial<Record<TransitionAction, Role[]>>>> = {
  'protocol-pdf': { request_changes: ['admin', 'reviewer', 'approver'] },
  'report-pdf': { request_changes: ['admin', 'reviewer', 'approver'] },
};

@Injectable()
export class WorkflowActionRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const body = req.body ?? {};
    const stepId: string | undefined = req.params?.stepId;

    let action: TransitionAction;
    try {
      action = body.action ?? (body.to ? stateNameToAction(body.to) : undefined);
    } catch {
      return true; // an unresolvable `to` value is a 400 from the service, not a 403 here
    }
    if (!action) return true; // missing action/to is a 400 from the service, not a 403 here

    // Fail closed: an action that resolves but isn't in ACTION_ROLES (nor overridden
    // for this step) is unknown to this guard, not "unrestricted" — block it here
    // rather than assuming DTO validation downstream will happen to reject it too.
    const allowed = (stepId && STEP_ACTION_ROLE_OVERRIDES[stepId]?.[action]) ?? ACTION_ROLES[action];
    if (!allowed) {
      throw new ForbiddenException(`Unknown action '${action}'`);
    }
    const userRoles: Role[] = req.user?.roles ?? [];
    if (!allowed.some((r) => userRoles.includes(r))) {
      throw new ForbiddenException(`Role required to perform '${action}': one of [${allowed.join(', ')}]`);
    }
    return true;
  }
}
