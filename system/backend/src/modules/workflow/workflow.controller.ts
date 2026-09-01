import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { WorkflowActionRolesGuard } from './workflow-action-roles.guard';
import { TransitionDto } from './dto';
import { WorkflowService } from './workflow.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@ApiTags('workflow')
@Controller('/api/projects/:projectId/workflow')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getSnapshot(@Param('projectId') projectId: string) {
    return this.workflow.getSnapshot(projectId);
  }

  @Post('/:stepId/transition')
  @UseGuards(WorkflowActionRolesGuard)
  transition(
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @Body() dto: TransitionDto,
    @Req() req: any,
  ) {
    return this.workflow.transition(projectId, stepId, dto, {
      userId: req.user?.userId,
      name: req.user?.name,
      roles: req.user?.roles,
      isSuperadmin: req.user?.isSuperadmin,
    });
  }
}
