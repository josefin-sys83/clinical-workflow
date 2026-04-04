import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('/api/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Get('/completed')
  listCompleted() {
    return this.projects.listCompleted();
  }

  @Get('/:projectId')
  get(@Param('projectId') projectId: string) {
    return this.projects.get(projectId);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Patch('/:projectId')
  update(@Param('projectId') projectId: string, @Body() body: { name?: string; description?: string }) {
    return this.projects.update(projectId, body);
  }
}