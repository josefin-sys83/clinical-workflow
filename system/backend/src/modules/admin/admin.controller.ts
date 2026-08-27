import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, SuperadminGuard } from '../auth';
import { AdminService } from './admin.service';
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
  constructor(private readonly admin: AdminService) {}

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
    return this.admin.createCompany(body.name, body.domain, req.user);
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
    return this.admin.createUser(
      companyId,
      body.name,
      body.email,
      body.password,
      body.system_role ?? 'author',
      req.user,
    );
  }

  @Patch('companies/:id')
  async updateCompany(@Param('id') id: string, @Body() body: UpdateCompanyDto, @Req() req: any) {
    return this.admin.updateCompany(id, body, req.user);
  }

  @Patch('companies/:id/status')
  async setCompanyStatus(@Param('id') id: string, @Body() body: SetCompanyStatusDto, @Req() req: any) {
    return this.admin.setCompanyStatus(id, body.status, req.user);
  }

  @Patch('users/:id/active')
  async setUserActive(@Param('id') id: string, @Body() body: SetUserActiveDto, @Req() req: any) {
    return this.admin.setUserActive(id, body.is_active, req.user);
  }

  @Patch('users/:id/role')
  async setUserRole(@Param('id') id: string, @Body() body: SetUserRoleDto, @Req() req: any) {
    return this.admin.setUserRole(id, body.system_role, req.user);
  }

  // ── Team (superadmin) endpoints ──────────────────────────────────────────

  @Get('team')
  listTeam() {
    return this.admin.listSuperadmins();
  }

  @Post('team')
  async inviteTeam(@Body() body: InviteSuperadminDto, @Req() req: any) {
    return this.admin.createSuperadmin(body.name, body.email, req.user);
  }

  @Patch('team/:id/active')
  async setTeamMemberActive(@Param('id') id: string, @Body() body: SetUserActiveDto, @Req() req: any) {
    return this.admin.setSuperadminActive(id, body.is_active, req.user);
  }

  @Delete('team/:id')
  async deleteTeamMember(@Param('id') id: string, @Req() req: any) {
    await this.admin.deleteSuperadmin(id, req.user.userId, req.user);
    return { ok: true };
  }
}
