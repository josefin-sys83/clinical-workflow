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
    // must_reset_password, is_active and the owning company's status are all read fresh
    // from the DB on every request (never trusted from the JWT) so that deactivating a
    // user or suspending their company takes effect immediately on their next API call —
    // not just on their next login. Without this, revoking access (e.g. offboarding a
    // terminated employee, suspending an abusive tenant) would leave every already-issued
    // token usable for up to its full remaining lifetime (JWT_EXPIRES_IN).
    const { rows } = await getPool().query<{
      is_active: boolean;
      must_reset_password: boolean;
      company_status: string | null;
    }>(
      `select u.is_active, u.must_reset_password, c.status as company_status
       from users u
       left join companies c on c.id = u.company_id
       where u.id = $1`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }
    // Superadmins bypass this, same as the equivalent check at login (AuthService.login) —
    // their company_id is incidental, not the account they're acting on behalf of.
    if (!payload.is_superadmin && user.company_status === 'suspended') {
      throw new UnauthorizedException('Your organisation account is suspended');
    }
    return {
      userId: payload.sub,
      name: payload.name,
      roles: payload.roles,
      companyId: payload.company_id,
      isSuperadmin: payload.is_superadmin ?? false,
      jti: payload.jti,
      exp: payload.exp,
      mustResetPassword: user.must_reset_password,
    };
  }
}
