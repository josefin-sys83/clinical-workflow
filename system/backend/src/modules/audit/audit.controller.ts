import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
  create(@Param("projectId") projectId: string, @Body() dto: CreateAuditEventDto, @Req() req: any) {
    // Identity and tenant ownership come from the verified JWT/project guard, never
    // from actorUserId supplied by the browser.
    return this.audit.create(projectId, dto, {
      userId: req.user.userId,
      name: req.user.name,
      roles: req.user.roles,
      isSuperadmin: req.user.isSuperadmin,
    });
  }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags("audit")
@Controller("/api/audit")
export class GlobalAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get("entity-types")
  listEntityTypes(
    @Req() req: any,
    @Query("companyId") companyId?: string,
    @Query("scope") scope?: "system" | "company" | "project",
  ) {
    return this.audit.listEntityTypesVisibleTo(req.user, { companyId, scope });
  }

  @Get()
  list(
    @Req() req: any,
    @Query("companyId") companyId?: string,
    @Query("projectId") projectId?: string,
    @Query("stepId") stepId?: string,
    @Query("scope") scope?: "system" | "company" | "project",
    @Query("type") type?: string,
    @Query("entityType") entityType?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    return this.audit.listVisibleTo(req.user, {
      companyId,
      projectId,
      stepId,
      scope,
      type,
      entityType,
      search,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
