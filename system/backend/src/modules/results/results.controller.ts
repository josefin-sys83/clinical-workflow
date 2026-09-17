import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateResultDto,
  ListResultsDto,
  ResultDecisionDto,
  UpdateResultDto,
} from './dto';
import { ResultsService } from './results.service';

const input = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@ApiBearerAuth()
@ApiTags('results')
@UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
@Controller('/api/projects/:projectId/results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(input) query: ListResultsDto,
  ) {
    return this.results.list(projectId, query);
  }

  @Post()
  @Roles('author', 'admin')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(input) body: CreateResultDto,
    @Req() req: any,
  ) {
    return this.results.create(projectId, body, req.user);
  }

  @Patch(':resultId')
  @Roles('author', 'admin')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Body(input) body: UpdateResultDto,
    @Req() req: any,
  ) {
    return this.results.update(projectId, resultId, body, req.user);
  }

  @Delete(':resultId')
  @Roles('author', 'admin')
  @HttpCode(204)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Req() req: any,
  ) {
    return this.results.remove(projectId, resultId, req.user);
  }

  @Post(':resultId/decisions')
  @Roles('reviewer', 'approver', 'admin')
  @HttpCode(200)
  decide(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Body(input) body: ResultDecisionDto,
    @Req() req: any,
  ) {
    return this.results.decide(projectId, resultId, body, req.user);
  }
}
