import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from './roles.decorator';
import { requireJwtSecret } from '../../common/require-jwt-secret';
import { isTokenRevoked } from './revoked-tokens';
import { getPool } from '../../db/pg';

export type JwtPayload = {
  sub: string;
  name: string;
  roles: Role[];
  company_id?: string;
  is_superadmin?: boolean;
  jti: string;
  exp: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    // Signature and expiry are already verified by passport-jwt at this point; this is the
    // additional check for tokens that are still within their validity window but have been
    // explicitly logged out (see AuthService.logout / the revoked_tokens table).
    if (await isTokenRevoked(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    // must_reset_password is read fresh from the DB on every request (not embedded in the
    // JWT) so that JwtAuthGuard's lockout (see jwt-auth.guard.ts) both takes effect
    // immediately when the flag is set and lifts immediately once the user actually
    // changes their password — without either requiring a fresh login.
    const { rows } = await getPool().query<{ must_reset_password: boolean }>(
      'select must_reset_password from users where id = $1',
      [payload.sub],
    );
    return {
      userId: payload.sub,
      name: payload.name,
      roles: payload.roles,
      companyId: payload.company_id,
      isSuperadmin: payload.is_superadmin ?? false,
      jti: payload.jti,
      exp: payload.exp,
      mustResetPassword: rows[0]?.must_reset_password ?? false,
    };
  }
}
