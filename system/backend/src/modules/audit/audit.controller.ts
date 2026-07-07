import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProjectAccessGuard } from "../auth/project-access.guard";
import { CreateAuditEventDto } from "./dto";
import { AuditService } from "./audit.service";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@ApiTags("audit")
@Controller("/api/projects/:projectId/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Param("projectId") projectId: string, @Query("stepId") stepId?: string) {
    return this.audit.list(projectId, stepId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateAuditEventDto) {
    return this.audit.create(projectId, dto);
  }
}
