import { JwtAuthGuard } from '../auth';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeService } from './me.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('me')
@Controller('/api/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@Req() req: any) {
    const u = req.user;
    return { id: u.userId, name: u.name, roles: u.roles, company_id: u.companyId ?? null };
  }

  @Get('actions')
  getActions(@Req() req: any) {
    return this.meService.getActions(req.user.userId);
  }
}
