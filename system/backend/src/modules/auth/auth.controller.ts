import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/login')
  login(@Body() body: { username: string; password: string }) {
    return this.auth.login(body.username, body.password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() req: any) {
    return this.auth.me(req.user);
  }
}
