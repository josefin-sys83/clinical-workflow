import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { TransitionDto, WorkflowSnapshot } from './dto';
import { StepLifecycleState, TransitionAction } from '../common/types';
import { AuditService } from '../audit/audit.service';

// Map a target state name (sent by the frontend) to the action verb the service uses.
function stateNameToAction(to: string): TransitionAction {
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
      return 'ready';
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

  async transition(projectId: string, stepId: string, dto: TransitionDto) {
    // Resolve action: accept either the 'action' verb or 'to' state-name form.
    const action: TransitionAction = dto.action ?? (dto.to ? stateNameToAction(dto.to) : (() => { throw new BadRequestException('action or to is required'); })());
    // Accept 'note' as an alias for 'reason' (frontend sends note)
    const reason = dto.reason ?? dto.note;

    // validate step exists
    const { rows: stepRows } = await getPool().query(`select 1 from workflow_steps where step_id=$1`, [stepId]);
    if (stepRows.length === 0) throw new BadRequestException('Unknown stepId');

    // get current
    const { rows } = await getPool().query(
      `select state from workflow_step_state where project_id=$1 and step_id=$2`,
      [projectId, stepId],
    );
    if (rows.length === 0) throw new NotFoundException('Workflow state not initialized for project');
    const current: StepLifecycleState = rows[0].state;

    // Immutability hardening: if a document has been finalized, lock transitions for that doc's workflow steps.
    const docType: 'protocol' | 'report' | null = stepId.startsWith('protocol-') ? 'protocol' : stepId.startsWith('report-') ? 'report' : null;
    if (docType) {
      const { rows: art } = await getPool().query(
        `select 1 from document_artifact where project_id=$1 and doc_type=$2 limit 1`,
        [projectId, docType],
      );
      if (art.length > 0 && action !== 'finalize' && action !== 'request_changes') {
        throw new BadRequestException(`${docType} workflow is locked because a finalized artifact exists`);
      }
    }

    const next = nextState(current, action);

    const now = new Date().toISOString();
    await getPool().query(
      `update workflow_step_state set state=$3, updated_at=$4 where project_id=$1 and step_id=$2`,
      [projectId, stepId, next, now],
    );

    await this.audit.record({
      projectId,
      stepId,
      type: 'workflow.transition',
      message: `Transition ${current} -> ${next} via ${action}`,
      actorUserId: dto.actorUserId ?? null,
      metadata: { action, from: current, to: next, reason: reason ?? null },
    });

    return { projectId, stepId, from: current, to: next, ts: now };
  }
}
