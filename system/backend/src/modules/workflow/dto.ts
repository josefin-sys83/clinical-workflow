import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TransitionAction, StepLifecycleState } from '../common/types';

export class TransitionDto {
  // Either 'action' (verb form) or 'to' (target state name) must be supplied.
  // 'to' is the format used by the frontend workflowService; 'action' is the
  // canonical backend form.  The service maps 'to' → 'action' when needed.
  @ApiProperty({ enum: ['start_review','request_changes','approve','sign','finalize','mark_ready','mark_input_needed'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['start_review','request_changes','approve','sign','finalize','mark_ready','mark_input_needed'])
  action?: TransitionAction;

  // Target lifecycle state — alternative to action (used by frontend)
  @ApiProperty({ required: false, description: 'Target state (e.g. approved, blocked). Mapped to action internally.' })
  @IsOptional()
  @IsString()
  to?: string;

  // Accept 'note' as an alias for 'reason' (frontend uses note, backend uses reason)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

}

// Shape returned to the frontend: { projectId, steps: { [stepId]: { state, updatedAt } } }
export type WorkflowSnapshot = { projectId: string; steps: Record<string, { state: StepLifecycleState; updatedAt: string }> };
