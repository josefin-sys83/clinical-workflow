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
  createCompany(@Body() body: CreateCompanyDto) {
    return this.admin.createCompany(body.name, body.domain);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.admin.getCompany(id);
  }

  @Post('companies/:id/users')
  createUser(
    @Param('id') companyId: string,
    @Body() body: CreateCompanyUserDto,
  ) {
    return this.admin.createUser(
      companyId,
      body.name,
      body.email,
      body.password,
      body.system_role ?? 'author',
    );
  }

  @Patch('companies/:id')
  updateCompany(@Param('id') id: string, @Body() body: UpdateCompanyDto) {
    return this.admin.updateCompany(id, body);
  }

  @Patch('companies/:id/status')
  setCompanyStatus(@Param('id') id: string, @Body() body: SetCompanyStatusDto) {
    return this.admin.setCompanyStatus(id, body.status);
  }

  @Patch('users/:id/active')
  setUserActive(@Param('id') id: string, @Body() body: SetUserActiveDto) {
    return this.admin.setUserActive(id, body.is_active);
  }

  @Patch('users/:id/role')
  setUserRole(@Param('id') id: string, @Body() body: SetUserRoleDto) {
    return this.admin.setUserRole(id, body.system_role);
  }

  // ── Team (superadmin) endpoints ──────────────────────────────────────────

  @Get('team')
  listTeam() {
    return this.admin.listSuperadmins();
  }

  @Post('team')
  inviteTeam(@Body() body: InviteSuperadminDto) {
    return this.admin.createSuperadmin(body.name, body.email);
  }

  @Patch('team/:id/active')
  setTeamMemberActive(@Param('id') id: string, @Body() body: SetUserActiveDto) {
    return this.admin.setSuperadminActive(id, body.is_active);
  }

  @Delete('team/:id')
  deleteTeamMember(@Param('id') id: string, @Req() req: any) {
    return this.admin.deleteSuperadmin(id, req.user.userId);
  }
}
