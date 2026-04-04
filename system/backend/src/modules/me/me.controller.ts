import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('me')
@Controller('/api/me')
export class MeController {
  @Get()
  me() {
    // placeholder until real auth is wired (Entra/Keycloak/Auth0)
    return { id: 'user-dev', name: 'Dev User', roles: ['admin'] };
  }
}
