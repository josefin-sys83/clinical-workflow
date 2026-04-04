import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TransitionAction, StepLifecycleState } from '../common/types';

export class TransitionDto {
  @ApiProperty({ enum: ['start_review','request_changes','approve','sign','finalize','mark_ready','mark_input_needed'] })
  @IsString()
  @IsIn(['start_review','request_changes','approve','sign','finalize','mark_ready','mark_input_needed'])
  action!: TransitionAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiProperty({ required: false, description: 'Optional actor user id (for audit)' })
  @IsOptional()
  @IsString()
  actorUserId?: string;
}

export type WorkflowSnapshot = Record<string, StepLifecycleState>;
