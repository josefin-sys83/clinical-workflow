import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { TransitionDto, WorkflowSnapshot } from './dto';
import { StepLifecycleState, TransitionAction } from '../common/types';
import { AuditService } from '../audit/audit.service';

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
      `select step_id as "stepId", state from workflow_step_state where project_id=$1`,
      [projectId],
    );
    if (rows.length === 0) {
      // might be missing project or init
      const { rows: p } = await getPool().query(`select 1 from projects where id=$1`, [projectId]);
      if (p.length === 0) throw new NotFoundException('Project not found');
    }
    const snapshot: WorkflowSnapshot = {};
    for (const r of rows) snapshot[r.stepId] = r.state;
    return snapshot;
  }

  async transition(projectId: string, stepId: string, dto: TransitionDto) {
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
      if (art.length > 0 && dto.action !== 'finalize') {
        throw new BadRequestException(`${docType} workflow is locked because a finalized artifact exists`);
      }
    }

    const next = nextState(current, dto.action);

    const now = new Date().toISOString();
    await getPool().query(
      `update workflow_step_state set state=$3, updated_at=$4 where project_id=$1 and step_id=$2`,
      [projectId, stepId, next, now],
    );

    await this.audit.record({
      projectId,
      stepId,
      type: 'workflow.transition',
      message: `Transition ${current} -> ${next} via ${dto.action}`,
      actorUserId: dto.actorUserId ?? null,
      metadata: { action: dto.action, from: current, to: next, reason: dto.reason ?? null },
    });

    return { projectId, stepId, from: current, to: next, ts: now };
  }
}
