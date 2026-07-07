import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { getPool } from '../../db/pg';
import { Role } from './roles.decorator';
import { revokeToken } from './revoked-tokens';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const { rows } = await getPool().query<{
      id: string;
      name: string;
      system_role: Role;
      company_id: string | null;
      is_superadmin: boolean;
      must_reset_password: boolean;
    }>(
      `select id, name, system_role, company_id, is_superadmin, must_reset_password
       from users
       where email = $1
         and password_hash = crypt($2, password_hash)
         and is_active = true`,
      [email, password],
    );

    const user = rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Touch last_active_at for the company on every login
    if (user.company_id) {
      await getPool().query(
        `update companies set last_active_at = now() where id = $1`,
        [user.company_id],
      );
    }

    // admin carries all roles so existing role guards keep working
    const roles: Role[] =
      user.system_role === 'admin'
        ? ['admin', 'author', 'reviewer', 'approver']
        : [user.system_role];

    const access_token = this.jwt.sign(
      { name: user.name, roles, company_id: user.company_id, is_superadmin: user.is_superadmin, jti: randomUUID() },
      { subject: user.id },
    );

    return {
      access_token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        roles,
        company_id: user.company_id,
        is_superadmin: user.is_superadmin,
        must_reset_password: user.must_reset_password,
      },
    };
  }

  me(user: { userId: string; name: string; roles: Role[]; companyId?: string }) {
    return { id: user.userId, name: user.name, roles: user.roles, company_id: user.companyId ?? null };
  }

  async logout(jti: string, exp: number) {
    await revokeToken(jti, exp);
    return { ok: true };
  }
}
