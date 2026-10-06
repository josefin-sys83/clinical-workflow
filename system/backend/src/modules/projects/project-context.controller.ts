import { BadRequestException, Controller, Get, Header, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InternalServiceGuard } from '../../common/internal-service.guard';
import { ProjectsService } from './projects.service';
import { PROJECT_CONTEXT_FIELD_NAMES, selectProjectContext } from './project-generation-context';

// Single source of project values for internal services, e.g.
//   GET /api/internal/projects/:projectId/context?fields=sponsor,intendedUse
// Omitting `fields` returns every available field.
@ApiTags('internal')
@UseGuards(InternalServiceGuard)
@Controller('/api/internal/projects')
export class ProjectContextController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('/:projectId/context')
  @Header('Cache-Control', 'no-store')
  async getContext(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('fields') fields?: string,
  ) {
    const requested = fields
      ? [...new Set(fields.split(',').map(field => field.trim()).filter(Boolean))]
      : PROJECT_CONTEXT_FIELD_NAMES;
    const unknown = requested.filter(field => !PROJECT_CONTEXT_FIELD_NAMES.includes(field));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown field(s): ${unknown.join(', ')}. Available: ${PROJECT_CONTEXT_FIELD_NAMES.join(', ')}`,
      );
    }
    const project = await this.projects.get(projectId);
    return { projectId, fields: selectProjectContext(project, requested) };
  }
}
