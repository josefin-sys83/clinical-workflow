import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { requireJwtSecret } from '../../common/require-jwt-secret';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecret(config),
        // @nestjs/jwt v11 types expiresIn as ms.StringValue | number instead of plain
        // string; JWT_EXPIRES_IN is a free-form env var ("8h" etc.) so its format is
        // only checked at runtime by jsonwebtoken, same as before this upgrade.
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as StringValue },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [JwtModule],
})
export class AuthModule {}
