import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';
import { EmailService } from '../email/email.service';

export const PLAN_LIMITS: Record<string, number> = {
  starter: 2,
  professional: 6,
  enterprise: Infinity,
};

// Postgres unique_violation. Maps known constraint names to a message the caller
// can actually act on, instead of letting the raw DB error surface as a 500.
const UNIQUE_VIOLATION = '23505';
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  companies_domain_key: 'This domain is already in use by another company.',
  users_email_key: 'This email address is already in use.',
};

function rethrowKnownUniqueViolation(err: unknown): never {
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr?.code === UNIQUE_VIOLATION) {
    const message = pgErr.constraint ? UNIQUE_CONSTRAINT_MESSAGES[pgErr.constraint] : undefined;
    if (message) throw new ConflictException(message);
  }
  throw err;
}

@Injectable()
export class AdminService {
  constructor(private readonly email: EmailService) {}

  async getStats() {
    const pool = getPool();
    const [c, u, p] = await Promise.all([
      pool.query('select count(*)::int as n from companies'),
      pool.query('select count(*)::int as n from users'),
      pool.query('select count(*)::int as n from projects'),
    ]);
    return {
      companies: c.rows[0].n,
      users: u.rows[0].n,
      projects: p.rows[0].n,
    };
  }

  async listCompanies() {
    const { rows } = await getPool().query(`
      select c.id, c.name, c.domain, c.status, c.subscription_plan,
             c.last_active_at, c.created_at,
             count(distinct u.id)::int  as user_count,
             count(distinct p.id)::int  as project_count
      from   companies c
      left join users    u on u.company_id = c.id
      left join projects p on p.company_id = c.id
      group  by c.id
      order  by c.created_at desc
    `);
    return rows;
  }

  async createCompany(name: string, domain?: string) {
    try {
      const { rows } = await getPool().query(
        `insert into companies (name, domain)
         values ($1, nullif($2, ''))
         returning id, name, domain, status, subscription_plan, created_at`,
        [name, domain ?? ''],
      );
      return rows[0];
    } catch (err) {
      rethrowKnownUniqueViolation(err);
    }
  }

  async getCompany(id: string) {
    const pool = getPool();
    const [cr, ur, projr] = await Promise.all([
      pool.query(
        `select id, name, domain, status,
                contact_name, contact_email, contact_phone,
                billing_address_line1, billing_address_line2,
                billing_city, billing_postal_code, billing_country,
                subscription_plan, subscription_start, subscription_renewal,
                last_active_at, created_at
         from companies where id = $1`,
        [id],
      ),
      pool.query(
        `select id, name, email, system_role, is_active, created_at
         from users where company_id = $1 order by created_at`,
        [id],
      ),
      pool.query(
        `select id, name, status, created_at
         from projects where company_id = $1 order by created_at desc`,
        [id],
      ),
    ]);
    if (!cr.rows[0]) throw new NotFoundException('Company not found');
    return { ...cr.rows[0], users: ur.rows, projects: projr.rows };
  }

  async updateCompany(id: string, body: {
    name: string;
    domain?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    billing_address_line1?: string;
    billing_address_line2?: string;
    billing_city?: string;
    billing_postal_code?: string;
    billing_country?: string;
    subscription_plan?: string;
    subscription_start?: string;
    subscription_renewal?: string;
  }) {
    const n = (v?: string) => v ?? '';
    const { rows } = await getPool().query(
      `update companies set
         name                  = $1,
         domain                = nullif($2, ''),
         contact_name          = nullif($3, ''),
         contact_email         = nullif($4, ''),
         contact_phone         = nullif($5, ''),
         billing_address_line1 = nullif($6, ''),
         billing_address_line2 = nullif($7, ''),
         billing_city          = nullif($8, ''),
         billing_postal_code   = nullif($9, ''),
         billing_country       = nullif($10, ''),
         subscription_plan     = coalesce(nullif($11, ''), subscription_plan),
         subscription_start    = nullif($12, '')::date,
         subscription_renewal  = nullif($13, '')::date
       where id = $14
       returning id, name, domain, status,
                 contact_name, contact_email, contact_phone,
                 billing_address_line1, billing_address_line2,
                 billing_city, billing_postal_code, billing_country,
                 subscription_plan, subscription_start, subscription_renewal,
                 last_active_at, created_at`,
      [
        body.name,       n(body.domain),
        n(body.contact_name),  n(body.contact_email),  n(body.contact_phone),
        n(body.billing_address_line1), n(body.billing_address_line2),
        n(body.billing_city), n(body.billing_postal_code), n(body.billing_country),
        n(body.subscription_plan), n(body.subscription_start), n(body.subscription_renewal),
        id,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Company not found');
    return rows[0];
  }

  async setCompanyStatus(id: string, status: 'active' | 'suspended') {
    const { rows } = await getPool().query(
      `update companies set status = $1 where id = $2
       returning id, name, status`,
      [status, id],
    );
    if (!rows[0]) throw new NotFoundException('Company not found');
    return rows[0];
  }

  async createUser(
    companyId: string,
    name: string,
    email: string,
    password: string,
    systemRole: string,
  ) {
    try {
      const { rows } = await getPool().query(
        `insert into users (company_id, name, email, password_hash, system_role)
         values ($1, $2, $3, crypt($4, gen_salt('bf', 10)), $5)
         returning id, name, email, system_role, is_active, created_at`,
        [companyId, name, email, password, systemRole],
      );
      return rows[0];
    } catch (err) {
      rethrowKnownUniqueViolation(err);
    }
  }

  async setUserActive(userId: string, isActive: boolean) {
    const { rows } = await getPool().query(
      `update users set is_active = $1, updated_at = now()
       where id = $2
       returning id, company_id, name, email, system_role, is_active`,
      [isActive, userId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async setUserRole(userId: string, systemRole: string) {
    const { rows } = await getPool().query(
      `update users set system_role = $1, updated_at = now()
       where id = $2
       returning id, company_id, name, email, system_role, is_active`,
      [systemRole, userId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  /**
   * Called by ProjectsService.create() before inserting a project. Throws if the
   * company doesn't exist, is suspended, or is already at its plan's project limit.
   *
   * Must be called with the same transaction `client` that performs the insert, and
   * that client must already be inside a BEGIN. `for update` takes a row lock on the
   * company for the rest of that transaction, so a second concurrent create() for the
   * same company blocks here until the first commits (and its insert becomes visible
   * to this one's count) instead of both reading the same stale project_count — the
   * plain unlocked read-then-insert this replaced allowed both to pass the limit check.
   */
  async enforceProjectLimit(companyId: string, client: PoolClient): Promise<void> {
    const { rows } = await client.query(
      `select status, subscription_plan from companies where id = $1 for update`,
      [companyId],
    );
    const company = rows[0];
    // An unknown company is never valid here — a nonexistent/deleted company_id (e.g. a
    // stale JWT issued before the company was removed) must be rejected explicitly, not
    // waved through: letting it through only ever led to an unhandled FK-violation 500
    // on the insert that followed, since projects.company_id references companies(id).
    if (!company) {
      throw new BadRequestException('Company not found for this account. Contact your administrator.');
    }
    if (company.status === 'suspended') {
      throw new ForbiddenException('Your organisation account is suspended. Contact your administrator.');
    }
    const { rows: cntRows } = await client.query(
      `select count(*)::int as project_count from projects where company_id = $1`,
      [companyId],
    );
    const projectCount = Number(cntRows[0]?.project_count ?? 0);
    const limit = PLAN_LIMITS[company.subscription_plan] ?? 2;
    if (projectCount >= limit) {
      const planLabel = company.subscription_plan.charAt(0).toUpperCase() + company.subscription_plan.slice(1);
      throw new ForbiddenException(
        `Project limit reached. Your ${planLabel} plan allows up to ${limit} project${limit === 1 ? '' : 's'}. Upgrade your plan to create more.`,
      );
    }
  }

  async touchLastActive(companyId: string, client?: PoolClient): Promise<void> {
    await (client ?? getPool()).query(
      `update companies set last_active_at = now() where id = $1`,
      [companyId],
    );
  }

  async listSuperadmins() {
    const { rows } = await getPool().query(
      `select id, name, email, is_active, created_at
       from users
       where is_superadmin = true
       order by created_at asc`,
    );
    return rows;
  }

  async createSuperadmin(name: string, email: string) {
    const tempPassword = randomBytes(12).toString('base64url');
    let rows;
    try {
      ({ rows } = await getPool().query(
        `insert into users (name, email, password_hash, system_role, is_superadmin, company_id, must_reset_password)
         values ($1, $2, crypt($3, gen_salt('bf', 10)), 'admin', true, null, true)
         returning id, name, email, is_active, created_at`,
        [name, email, tempPassword],
      ));
    } catch (err) {
      rethrowKnownUniqueViolation(err);
    }
    const user = rows[0];

    const emailSent = await this.email.send(
      email,
      'Your Clinical Investigation Platform superadmin account',
      `Hi ${name},\n\n` +
        `A superadmin account has been created for you on the Clinical Investigation Platform.\n\n` +
        `Email: ${email}\n` +
        `Temporary password: ${tempPassword}\n\n` +
        `Log in and you'll be asked to set a new password before continuing.`,
    );

    return { ...user, accountCreated: true, emailSent };
  }

  async setSuperadminActive(id: string, isActive: boolean) {
    const { rows } = await getPool().query(
      `update users set is_active = $1, updated_at = now()
       where id = $2 and is_superadmin = true
       returning id, name, email, is_active`,
      [isActive, id],
    );
    if (!rows[0]) throw new NotFoundException('Superadmin not found');
    return rows[0];
  }

  async deleteSuperadmin(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const { rows } = await getPool().query(
      `delete from users where id = $1 and is_superadmin = true returning id, name, email`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Superadmin not found');
    return rows[0];
  }
}
