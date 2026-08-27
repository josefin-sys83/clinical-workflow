import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { SettingsService } from './settings.service';
import { AuditService } from '../audit/audit.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('settings')
@Controller('/api/settings')
export class SettingsController {
  constructor(
    private readonly svc: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.svc.getProfile(req.user.userId);
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() body: { name: string; timezone?: string }) {
    const profile = await this.svc.updateProfile(req.user.userId, body.name, body.timezone ?? 'Europe/Stockholm');
    await this.audit.record({
      companyId: req.user.companyId ?? null,
      type: 'profile.updated',
      message: `${profile.name} updated their profile`,
      entityType: 'user',
      entityId: req.user.userId,
      entityLabel: profile.name,
      actor: req.user,
      metadata: { timezone: profile.timezone },
    });
    return profile;
  }

  @Patch('password')
  async changePassword(
    @Req() req: any,
    @Body() body: { current_password: string; new_password: string },
  ) {
    const result = await this.svc.changePassword(req.user.userId, body.current_password, body.new_password);
    await this.audit.record({
      companyId: req.user.companyId ?? null,
      type: 'password.changed',
      message: `${req.user.name} changed their password`,
      entityType: 'user',
      entityId: req.user.userId,
      entityLabel: req.user.name,
      actor: req.user,
      metadata: {},
    });
    return result;
  }

  @Get('company')
  getCompany(@Req() req: any) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException('No company associated');
    return this.svc.getCompanyData(req.user.companyId);
  }

  // Unlike GET /company (admin-only), this is available to any authenticated user in the
  // company — it backs the person-search autocomplete in Project Setup, which any team
  // member assigning roles can use, not just admins. Still tenant-scoped to req.user.companyId
  // so it can never leak another company's users.
  @Get('company/user-directory')
  getCompanyUserDirectory(@Req() req: any) {
    if (!req.user.companyId) throw new ForbiddenException('No company associated');
    return this.svc.getCompanyUserDirectory(req.user.companyId);
  }

  @Post('company/users')
  async inviteUser(
    @Req() req: any,
    @Body() body: { name: string; email: string; system_role?: string },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException('No company associated');
    const user = await this.svc.inviteUser(
      req.user.companyId,
      body.name,
      body.email,
      body.system_role ?? 'author',
    );
    await this.audit.record({
      companyId: req.user.companyId,
      type: 'user.invited',
      message: `Invited ${user.name} to the company`,
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      actor: req.user,
      metadata: { email: user.email, role: user.system_role, emailSent: user.emailSent },
    });
    return user;
  }

  @Patch('company/users/:id/role')
  async setRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { system_role: string },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException();
    const user = await this.svc.setUserRole(req.user.companyId, id, body.system_role);
    await this.audit.record({
      companyId: req.user.companyId,
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

  @Patch('company/users/:id/active')
  async setActive(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { is_active: boolean },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException();
    const user = await this.svc.setUserActive(req.user.companyId, id, body.is_active, req.user.userId);
    await this.audit.record({
      companyId: req.user.companyId,
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

  @Post('support')
  async support(
    @Req() req: any,
    @Body() body: { category: string; subject: string; message: string },
  ) {
    const ticket = await this.svc.createSupportTicket(
      req.user.userId,
      req.user.companyId ?? null,
      body.category,
      body.subject,
      body.message,
    );
    await this.audit.record({
      companyId: req.user.companyId ?? null,
      type: 'support.ticket.created',
      message: `Created support ticket: ${ticket.subject}`,
      entityType: 'support_ticket',
      entityId: ticket.id,
      entityLabel: ticket.subject,
      actor: req.user,
      metadata: { category: ticket.category, status: ticket.status },
    });
    return ticket;
  }
}
