import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { SettingsService } from './settings.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('settings')
@Controller('/api/settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.svc.getProfile(req.user.userId);
  }

  @Patch('me')
  updateMe(@Req() req: any, @Body() body: { name: string; timezone?: string }) {
    return this.svc.updateProfile(req.user.userId, body.name, body.timezone ?? 'Europe/Stockholm');
  }

  @Patch('password')
  changePassword(
    @Req() req: any,
    @Body() body: { current_password: string; new_password: string },
  ) {
    return this.svc.changePassword(req.user.userId, body.current_password, body.new_password);
  }

  @Get('company')
  getCompany(@Req() req: any) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException('No company associated');
    return this.svc.getCompanyData(req.user.companyId);
  }

  @Post('company/users')
  inviteUser(
    @Req() req: any,
    @Body() body: { name: string; email: string; system_role?: string },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException('No company associated');
    return this.svc.inviteUser(
      req.user.companyId,
      body.name,
      body.email,
      body.system_role ?? 'author',
    );
  }

  @Patch('company/users/:id/role')
  setRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { system_role: string },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException();
    return this.svc.setUserRole(req.user.companyId, id, body.system_role);
  }

  @Patch('company/users/:id/active')
  setActive(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { is_active: boolean },
  ) {
    if (!req.user.roles?.includes('admin')) throw new ForbiddenException();
    if (!req.user.companyId) throw new ForbiddenException();
    return this.svc.setUserActive(req.user.companyId, id, body.is_active, req.user.userId);
  }

  @Post('support')
  support(
    @Req() req: any,
    @Body() body: { category: string; subject: string; message: string },
  ) {
    return this.svc.createSupportTicket(
      req.user.userId,
      req.user.companyId ?? null,
      body.category,
      body.subject,
      body.message,
    );
  }
}
