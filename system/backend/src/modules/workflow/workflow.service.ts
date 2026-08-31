import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { TransitionDto, WorkflowSnapshot } from './dto';
import { StepLifecycleState, TransitionAction } from '../common/types';
import { AuditService } from '../audit/audit.service';
import type { AuditActor } from '../audit/audit.service';
import type { PoolClient } from 'pg';

// Map a target state name (sent by the frontend) to the action verb the service uses.
// Exported so the role-gating guard can resolve the same action from a `to`-style body
// without duplicating this mapping.
export function stateNameToAction(to: string): TransitionAction {
  switch (to) {
    case 'approved':        return 'approve';
    case 'blocked':         return 'request_changes';
    case 'in_review':       return 'start_review';
    case 'signed':          return 'sign';
    case 'finalized':
    case 'final':           return 'finalize';
    case 'ready':
    case 'ready_for_review': return 'mark_ready';
    case 'input_needed':    return 'mark_input_needed';
    default:
      throw new BadRequestException(`Unknown target state: ${to}`);
  }
}

function nextState(current: StepLifecycleState, action: TransitionAction): StepLifecycleState {
  // minimal, deterministic rules. Extend as you formalize.
  switch (action) {
    case 'mark_input_needed':
      return 'input_needed';
    case 'mark_ready':
      return 'ready_for_review';
    case 'start_review':
      return 'in_review';
    case 'request_changes':
      return 'blocked';
    case 'approve':
      return 'approved';
    case 'sign':
      return 'signed';
    case 'finalize':
      return 'final';
    default:
      return current;
  }
}

// Which current states each named action may be invoked from. This is the backend
// enforcement of the lifecycle the frontend's (currently unimported) reference file
// shared/workflow/stateMachine.ts describes, adapted to this service's model where a
// given action always resolves to the same fixed target regardless of current state
// (see nextState() above) — so validity here is expressed as "is `current` one of the
// states this action is allowed to start from", not as a `from -> to` pair.
//
// request_changes is the one intentionally backward-moving action (a reviewer/approver
// sending work back to authoring). No other backward jump is permitted, and no action
// may be invoked from a state that skips earlier stages (e.g. finalize from 'draft').
const ALLOWED_FROM_STATES: Record<TransitionAction, StepLifecycleState[]> = {
  mark_input_needed: ['draft'],
  // `ready` is retained as a compatibility state for rows written before the
  // frontend/backend naming was aligned on `ready_for_review`.
  mark_ready: ['draft', 'input_needed', 'blocked', 'ready'],
  start_review: ['ready', 'ready_for_review'],
  request_changes: ['in_review'],
  approve: ['in_review'],
  sign: ['approved'],
  finalize: ['signed'],
};

function assertValidTransition(
  stepId: string,
  current: StepLifecycleState,
  action: TransitionAction,
  next: StepLifecycleState,
): void {
  // Re-invoking an action whose target is already the current state is a no-op (e.g.
  // viewing an already-finalized PDF fires 'finalize' again) — allow it unconditionally
  // rather than treating it as a jump that needs a starting-state check.
  if (current === next) return;
  const allowedFrom = ALLOWED_FROM_STATES[action];
  if (!allowedFrom.includes(current)) {
    throw new BadRequestException(
      `Invalid transition for step '${stepId}': cannot go from '${current}' to '${next}' via '${action}'. ` +
      `'${action}' is only allowed from: ${allowedFrom.join(', ')}.`,
    );
  }
}

@Injectable()
export class WorkflowService {
  constructor(private readonly audit: AuditService) {}

  async getSnapshot(projectId: string): Promise<WorkflowSnapshot> {
    const { rows } = await getPool().query(
      `select step_id as "stepId", state, updated_at as "updatedAt" from workflow_step_state where project_id=$1`,
      [projectId],
    );
    if (rows.length === 0) {
      // might be missing project or init
      const { rows: p } = await getPool().query(`select 1 from projects where id=$1`, [projectId]);
      if (p.length === 0) throw new NotFoundException('Project not found');
    }
    // Return the nested shape the frontend expects: { projectId, steps: { [stepId]: { state, updatedAt } } }
    const steps: Record<string, { state: string; updatedAt: string }> = {};
    for (const r of rows) steps[r.stepId] = { state: r.state, updatedAt: r.updatedAt };
    return { projectId, steps } as any;
  }

  async transition(
    projectId: string,
    stepId: string,
    dto: TransitionDto,
    actor?: AuditActor,
    transactionClient?: PoolClient,
  ) {
    // Resolve action: accept either the 'action' verb or 'to' state-name form.
    const action: TransitionAction = dto.action ?? (dto.to ? stateNameToAction(dto.to) : (() => { throw new BadRequestException('action or to is required'); })());
    // Accept 'note' as an alias for 'reason' (frontend sends note)
    const reason = dto.reason ?? dto.note;

    // Reading `current` and writing `next` were previously two separate, unlocked
    // queries: two concurrent transitions on the same step could both read the same
    // stale `current`, so both would log a "transition from X" even though only one of
    // them was really starting from X — a lost-update race identical in shape to the
    // one fixed in ProjectsService.updateProtocolAtomic(). SELECT ... FOR UPDATE takes
    // a row lock for the transaction, so a second concurrent call blocks until the first
    // commits and then reads its already-updated state, serializing transitions on the
    // same (project_id, step_id) without changing the transition logic above.
    const client = transactionClient ?? await getPool().connect();
    const ownsTransaction = !transactionClient;
    let current: StepLifecycleState;
    let next: StepLifecycleState;
    const now = new Date().toISOString();
    try {
      if (ownsTransaction) await client.query('BEGIN');

      const { rows: stepRows } = await client.query(
        `select 1 from workflow_steps where step_id=$1`,
        [stepId],
      );
      if (stepRows.length === 0) throw new BadRequestException('Unknown stepId');
      const { rows } = await client.query(
        `select state from workflow_step_state where project_id=$1 and step_id=$2 for update`,
        [projectId, stepId],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Workflow state not initialized for project');
      }
      current = rows[0].state;

      // Immutability hardening: if a document has been finalized, lock transitions for that doc's workflow steps.
      const docType: 'protocol' | 'report' | null = stepId.startsWith('protocol-') ? 'protocol' : stepId.startsWith('report-') ? 'report' : null;
      if (docType) {
        const { rows: art } = await client.query(
          `select 1 from document_artifact where project_id=$1 and doc_type=$2 limit 1`,
          [projectId, docType],
        );
        if (art.length > 0 && action !== 'finalize' && action !== 'request_changes') {
          throw new BadRequestException(`${docType} workflow is locked because a finalized artifact exists`);
        }
      }

      next = nextState(current, action);
      assertValidTransition(stepId, current, action, next);

      await client.query(
        `update workflow_step_state set state=$3, updated_at=$4 where project_id=$1 and step_id=$2`,
        [projectId, stepId, next, now],
      );

      // Record the transition before COMMIT on the same connection. This closes the
      // previous reliability gap where the workflow state committed first and its audit
      // insert could fail afterward, leaving an untracked transition.
      await this.audit.record({
        projectId,
        stepId,
        type: 'workflow.transition',
        message: `Changed ${stepId} from ${current} to ${next}`,
        actor: actor ?? { name: 'System' },
        entityType: 'workflow_step',
        entityId: stepId,
        entityLabel: stepId,
        metadata: { action, from: current, to: next, reason: reason ?? null },
      }, client);

      if (ownsTransaction) await client.query('COMMIT');
    } catch (err) {
      if (ownsTransaction) await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      if (ownsTransaction) client.release();
    }
    return { projectId, stepId, from: current, to: next, ts: now };
  }

  async forceSynopsis(projectId: string, actor: AuditActor) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `select state from workflow_step_state
         where project_id = $1 and step_id = 'synopsis'
         for update`,
        [projectId],
      );

      if (rows.length === 0) {
        await client.query(
          `insert into workflow_step_state (project_id, step_id, state, updated_at)
           values ($1, 'synopsis', 'approved', now())`,
          [projectId],
        );
        await this.audit.record({
          projectId,
          stepId: 'synopsis',
          type: 'workflow.bypass',
          message: 'Created and approved the Synopsis step using the admin bypass',
          actor,
          entityType: 'workflow_step',
          entityId: 'synopsis',
          entityLabel: 'Synopsis',
          metadata: { previousState: null, nextState: 'approved' },
        }, client);
        await client.query('COMMIT');
        return { ok: true, message: 'Synopsis step inserted and set to approved' };
      }

      const currentState = rows[0].state;
      if (['approved', 'signed', 'final'].includes(currentState)) {
        await client.query('ROLLBACK');
        return { ok: true, message: 'Synopsis already advanced' };
      }

      await client.query(
        `update workflow_step_state set state = 'approved', updated_at = now()
         where project_id = $1 and step_id = 'synopsis'`,
        [projectId],
      );
      await this.audit.record({
        projectId,
        stepId: 'synopsis',
        type: 'workflow.bypass',
        message: 'Synopsis step forced to approved via admin bypass',
        actor,
        entityType: 'workflow_step',
        entityId: 'synopsis',
        entityLabel: 'Synopsis',
        metadata: { previousState: currentState, nextState: 'approved' },
      }, client);
      await client.query('COMMIT');
      return { ok: true, message: 'Synopsis step forced to approved' };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
