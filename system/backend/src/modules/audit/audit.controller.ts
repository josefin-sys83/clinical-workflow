import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAuditEventDto } from './dto';
import { AuditService } from './audit.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('audit')
@Controller('/api/projects/:projectId/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Param('projectId') projectId: string, @Query('stepId') stepId?: string) {
    return this.audit.list(projectId, stepId);
  }

  @Roles('admin','author','reviewer','approver')
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateAuditEventDto) {
    return this.audit.create(projectId, dto);
  }
}
