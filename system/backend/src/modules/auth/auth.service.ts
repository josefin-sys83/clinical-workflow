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
      company_status: string | null;
    }>(
      `select u.id, u.name, u.system_role, u.company_id, u.is_superadmin, u.must_reset_password,
              c.status as company_status
       from users u
       left join companies c on c.id = u.company_id
       where u.email = $1
         and u.password_hash = crypt($2, u.password_hash)
         and u.is_active = true`,
      [email, password],
    );

    const user = rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // A suspended company's users are locked out entirely (superadmins bypass this,
    // since their company_id is incidental, not the account they're acting on behalf of).
    if (!user.is_superadmin && user.company_status === 'suspended') {
      throw new UnauthorizedException('Your organisation account is suspended. Contact your administrator.');
    }

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
