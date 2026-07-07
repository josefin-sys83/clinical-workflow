import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard, SuperadminGuard } from '../auth';
import { AdminService } from './admin.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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
  createCompany(@Body() body: { name: string; domain?: string }) {
    return this.admin.createCompany(body.name, body.domain);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.admin.getCompany(id);
  }

  @Post('companies/:id/users')
  createUser(
    @Param('id') companyId: string,
    @Body() body: { name: string; email: string; password: string; system_role?: string },
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
  updateCompany(@Param('id') id: string, @Body() body: {
    name: string; domain?: string;
    contact_name?: string; contact_email?: string; contact_phone?: string;
    billing_address_line1?: string; billing_address_line2?: string;
    billing_city?: string; billing_postal_code?: string; billing_country?: string;
    subscription_plan?: string; subscription_start?: string; subscription_renewal?: string;
  }) {
    return this.admin.updateCompany(id, body);
  }

  @Patch('companies/:id/status')
  setCompanyStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'suspended' }) {
    return this.admin.setCompanyStatus(id, body.status);
  }

  @Patch('users/:id/active')
  setUserActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.admin.setUserActive(id, body.is_active);
  }

  @Patch('users/:id/role')
  setUserRole(@Param('id') id: string, @Body() body: { system_role: string }) {
    return this.admin.setUserRole(id, body.system_role);
  }

  // ── Team (superadmin) endpoints ──────────────────────────────────────────

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('team')
  listTeam() {
    return this.admin.listSuperadmins();
  }

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Post('team')
  inviteTeam(@Body() body: { name: string; email: string }) {
    return this.admin.createSuperadmin(body.name, body.email);
  }

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Patch('team/:id/active')
  setTeamMemberActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.admin.setSuperadminActive(id, body.is_active);
  }

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Delete('team/:id')
  deleteTeamMember(@Param('id') id: string, @Req() req: any) {
    return this.admin.deleteSuperadmin(id, req.user.userId);
  }
}
