import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginThrottlerGuard } from './login-throttler.guard';
import { LoginAccountThrottlerGuard } from './login-account-throttler.guard';

@ApiTags('auth')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(LoginThrottlerGuard, LoginAccountThrottlerGuard)
  @Post('/login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() req: any) {
    return this.auth.me(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/logout')
  logout(@Req() req: any) {
    return this.auth.logout(req.user.jti, req.user.exp, req.user);
  }
}
