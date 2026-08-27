import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, SuperadminGuard } from '../auth';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCompanyDto,
  CreateCompanyUserDto,
  InviteSuperadminDto,
  SetCompanyStatusDto,
  SetUserActiveDto,
  SetUserRoleDto,
  UpdateCompanyDto,
} from './dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperadminGuard)
@ApiTags('admin')
@Controller('/api/admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  @Get('companies')
  listCompanies() {
    return this.admin.listCompanies();
  }

  @Post('companies')
  async createCompany(@Body() body: CreateCompanyDto, @Req() req: any) {
    const company = await this.admin.createCompany(body.name, body.domain);
    await this.audit.record({
      companyId: company.id,
      scope: 'company',
      type: 'company.created',
      message: `Created company ${company.name}`,
      entityType: 'company',
      entityId: company.id,
      entityLabel: company.name,
      actor: req.user,
      metadata: { domain: company.domain ?? null },
    });
    return company;
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.admin.getCompany(id);
  }

  @Post('companies/:id/users')
  async createUser(
    @Param('id') companyId: string,
    @Body() body: CreateCompanyUserDto,
    @Req() req: any,
  ) {
    const user = await this.admin.createUser(
      companyId,
      body.name,
      body.email,
      body.password,
      body.system_role ?? 'author',
    );
    await this.audit.record({
      companyId,
      scope: 'company',
      type: 'user.created',
      message: `Created account for ${user.name}`,
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { email: user.email, role: user.system_role },
    });
    return user;
  }

  @Patch('companies/:id')
  async updateCompany(@Param('id') id: string, @Body() body: UpdateCompanyDto, @Req() req: any) {
    const company = await this.admin.updateCompany(id, body);
    await this.audit.record({
      companyId: id,
      scope: 'company',
      type: 'company.updated',
      message: `Updated company ${company.name}`,
      entityType: 'company',
      entityId: id,
      entityLabel: company.name,
      actor: req.user,
      metadata: { changedFields: Object.keys(body) },
    });
    return company;
  }

  @Patch('companies/:id/status')
  async setCompanyStatus(@Param('id') id: string, @Body() body: SetCompanyStatusDto, @Req() req: any) {
    const company = await this.admin.setCompanyStatus(id, body.status);
    await this.audit.record({
      companyId: id,
      scope: 'company',
      type: 'company.status.changed',
      message: `${company.name} was ${company.status === 'suspended' ? 'suspended' : 'reactivated'}`,
      entityType: 'company',
      entityId: id,
      entityLabel: company.name,
      actor: req.user,
      metadata: { status: company.status },
    });
    return company;
  }

  @Patch('users/:id/active')
  async setUserActive(@Param('id') id: string, @Body() body: SetUserActiveDto, @Req() req: any) {
    const user = await this.admin.setUserActive(id, body.is_active);
    await this.audit.record({
      companyId: user.company_id,
      scope: user.company_id ? 'company' : 'system',
      type: 'user.status.changed',
      message: `${user.name}'s account was ${user.is_active ? 'activated' : 'deactivated'}`,
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { active: user.is_active },
    });
    return user;
  }

  @Patch('users/:id/role')
  async setUserRole(@Param('id') id: string, @Body() body: SetUserRoleDto, @Req() req: any) {
    const user = await this.admin.setUserRole(id, body.system_role);
    await this.audit.record({
      companyId: user.company_id,
      scope: user.company_id ? 'company' : 'system',
      type: 'user.role.changed',
      message: `Changed ${user.name}'s role to ${user.system_role}`,
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { role: user.system_role },
    });
    return user;
  }

  // ── Team (superadmin) endpoints ──────────────────────────────────────────

  @Get('team')
  listTeam() {
    return this.admin.listSuperadmins();
  }

  @Post('team')
  async inviteTeam(@Body() body: InviteSuperadminDto, @Req() req: any) {
    const user = await this.admin.createSuperadmin(body.name, body.email);
    await this.audit.record({
      companyId: null,
      scope: 'system',
      type: 'superadmin.created',
      message: `Added ${user.name} as a platform superadmin`,
      entityType: 'superadmin',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { email: user.email },
    });
    return user;
  }

  @Patch('team/:id/active')
  async setTeamMemberActive(@Param('id') id: string, @Body() body: SetUserActiveDto, @Req() req: any) {
    const user = await this.admin.setSuperadminActive(id, body.is_active);
    await this.audit.record({
      companyId: null,
      scope: 'system',
      type: 'superadmin.status.changed',
      message: `${user.name}'s superadmin access was ${user.is_active ? 'activated' : 'deactivated'}`,
      entityType: 'superadmin',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { active: user.is_active },
    });
    return user;
  }

  @Delete('team/:id')
  async deleteTeamMember(@Param('id') id: string, @Req() req: any) {
    const user = await this.admin.deleteSuperadmin(id, req.user.userId);
    await this.audit.record({
      companyId: null,
      scope: 'system',
      type: 'superadmin.deleted',
      message: `Removed ${user.name}'s platform superadmin account`,
      entityType: 'superadmin',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { email: user.email },
    });
    return { ok: true };
  }
}
