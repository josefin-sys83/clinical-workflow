import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransitionDto } from './dto';
import { WorkflowService } from './workflow.service';

// No auth guards — workflow endpoints are accessed by the same unauthenticated
// frontend that calls /api/projects. JWT is not yet wired end-to-end.
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
