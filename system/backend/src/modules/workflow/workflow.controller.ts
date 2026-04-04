import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransitionDto } from './dto';
import { WorkflowService } from './workflow.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('workflow')
@Controller('/api/projects/:projectId/workflow')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get()
  getSnapshot(@Param('projectId') projectId: string) {
    return this.workflow.getSnapshot(projectId);
  }

  @Post('/:stepId/transition')
  transition(
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @Body() dto: TransitionDto,
  ) {
    return this.workflow.transition(projectId, stepId, dto);
  }
}
