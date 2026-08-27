import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { getPool } from '../../db/pg';
import { Role } from './roles.decorator';
import { revokeToken } from './revoked-tokens';
import { AuditService } from '../audit/audit.service';

// A fixed bcrypt hash (cost 10 — the same cost every real password_hash is created with,
// see gen_salt('bf', 10) in admin.service.ts/settings.service.ts/seed.ts) of a string that
// is not, and never will be, any real user's password. Comparing the submitted password
// against this whenever the email doesn't resolve to a real, active account means bcrypt's
// ~100ms cost is paid on every login attempt regardless of whether the account exists —
// closing the timing side-channel that previously let an attacker enumerate valid emails
// just by measuring how fast /login responded (pentest F2: the old single WHERE clause let
// Postgres skip the expensive crypt() call entirely once the email predicate failed).
const DUMMY_PASSWORD_HASH = '$2a$10$xNY1ZR8l6Ymc6a5cOuhL1uAxejRMfeonMNHkTzOa3u5v/CWG8FCPC';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string) {
    const { rows } = await getPool().query<{
      id: string;
      name: string;
      email: string;
      system_role: Role;
      company_id: string | null;
      is_superadmin: boolean;
      must_reset_password: boolean;
      is_active: boolean;
      password_hash: string;
      company_status: string | null;
    }>(
      `select u.id, u.name, u.email, u.system_role, u.company_id, u.is_superadmin, u.must_reset_password,
              u.is_active, u.password_hash, c.status as company_status
       from users u
       left join companies c on c.id = u.company_id
       where u.email = $1`,
      [email],
    );

    const user = rows[0];

    // Always run exactly one bcrypt comparison — against the real hash for an existing,
    // active account, or against DUMMY_PASSWORD_HASH otherwise — before branching on
    // whether the account exists or the password matched. See DUMMY_PASSWORD_HASH comment
    // above for why this can't be skipped for nonexistent/inactive accounts.
    const hashToCompare = user?.is_active ? user.password_hash : DUMMY_PASSWORD_HASH;
    const { rows: matchRows } = await getPool().query<{ matches: boolean }>(
      `select ($1 = crypt($2, $1)) as matches`,
      [hashToCompare, password],
    );
    const passwordMatches = matchRows[0]?.matches ?? false;

    if (!user || !user.is_active || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

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

    await this.audit.record({
      companyId: user.company_id,
      scope: user.company_id ? 'company' : 'system',
      type: 'auth.login.succeeded',
      message: `${user.name} signed in`,
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      actor: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.is_superadmin ? 'superadmin' : user.system_role,
        isSuperadmin: user.is_superadmin,
      },
      metadata: {},
    });

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

  me(user: { userId: string; name: string; roles: Role[]; companyId?: string; mustResetPassword?: boolean }) {
    return {
      id: user.userId,
      name: user.name,
      roles: user.roles,
      company_id: user.companyId ?? null,
      must_reset_password: user.mustResetPassword ?? false,
    };
  }

  async logout(
    jti: string,
    exp: number,
    actor: { userId: string; name: string; companyId?: string | null; roles?: string[]; isSuperadmin?: boolean },
  ) {
    await revokeToken(jti, exp);
    await this.audit.record({
      companyId: actor.companyId ?? null,
      scope: actor.companyId ? 'company' : 'system',
      type: 'auth.logout',
      message: `${actor.name} signed out`,
      entityType: 'user',
      entityId: actor.userId,
      entityLabel: actor.name,
      actor,
      metadata: {},
    });
    return { ok: true };
  }
}
