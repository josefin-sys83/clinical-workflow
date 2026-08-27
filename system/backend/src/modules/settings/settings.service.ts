import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { getPool } from '../../db/pg';
import { EmailService } from '../email/email.service';
import { AuditService, type AuditActor } from '../audit/audit.service';

const STEP_ORDER = [
  'project-setup', 'synopsis', 'scope',
  'protocol-make', 'protocol-review', 'protocol-pdf',
  'report-make', 'report-review', 'report-pdf',
];
const DONE = new Set(['approved', 'signed', 'finalized', 'final']);

function deriveCurrentStep(data: any): string {
  const steps = data?.steps ?? {};
  for (const id of STEP_ORDER) {
    const state = steps[id]?.state;
    if (!state || !DONE.has(state)) return id;
  }
  return STEP_ORDER[STEP_ORDER.length - 1];
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string) {
    const { rows } = await getPool().query(
      `select u.id, u.name, u.email, u.system_role, u.timezone, u.created_at,
              c.name as company_name, c.id as company_id
       from users u
       left join companies c on c.id = u.company_id
       where u.id = $1`,
      [userId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async updateProfile(userId: string, name: string, timezone: string, actor: AuditActor) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `update users set name = $1, timezone = $2, updated_at = now()
       where id = $3 returning id, name, timezone`,
      [name.trim(), timezone, userId],
    );
      if (!rows[0]) throw new NotFoundException('User not found');
      const profile = rows[0];
      await this.audit.record({
        companyId: actor.companyId ?? null,
        type: 'profile.updated',
        message: `${profile.name} updated their profile`,
        entityType: 'user',
        entityId: userId,
        entityLabel: profile.name,
        actor,
        metadata: { timezone: profile.timezone },
      }, client);
      await client.query('COMMIT');
      return profile;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, actor: AuditActor) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `select id from users where id = $1 and password_hash = crypt($2, password_hash)`,
      [userId, currentPassword],
    );
      if (!rows[0]) throw new UnauthorizedException('Current password is incorrect');
      await client.query(
      `update users set password_hash = crypt($1, gen_salt('bf', 10)), must_reset_password = false, updated_at = now()
       where id = $2`,
      [newPassword, userId],
    );
      await this.audit.record({
        companyId: actor.companyId ?? null,
        type: 'password.changed',
        message: `${actor.name ?? 'User'} changed their password`,
        entityType: 'user',
        entityId: userId,
        entityLabel: actor.name ?? 'User',
        actor,
        metadata: {},
      }, client);
      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getCompanyUserDirectory(companyId: string) {
    const { rows } = await getPool().query(
      `select id, name, email
       from users
       where company_id = $1 and is_superadmin = false and is_active = true
       order by name asc`,
      [companyId],
    );
    return rows;
  }

  async getCompanyData(companyId: string) {
    const pool = getPool();
    const [ur, pr, mr] = await Promise.all([
      pool.query(
        `select id, name, email, system_role, is_active, created_at
         from users
         where company_id = $1 and is_superadmin = false
         order by created_at asc`,
        [companyId],
      ),
      pool.query(
        `select id, name, status, data, created_at
         from projects
         where company_id = $1
         order by created_at desc`,
        [companyId],
      ),
      pool.query(
        `select project_id, role_title
         from project_members pm
         join users u on u.id = pm.user_id
         where u.company_id = $1`,
        [companyId],
      ),
    ]);

    const rolesByProject: Record<string, string[]> = {};
    for (const row of mr.rows) {
      if (!rolesByProject[row.project_id]) rolesByProject[row.project_id] = [];
      rolesByProject[row.project_id].push(row.role_title);
    }

    const projects = pr.rows.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      created_at: p.created_at,
      current_step: deriveCurrentStep(p.data),
      roles: rolesByProject[p.id] ?? [],
    }));

    return { users: ur.rows, projects };
  }

  async inviteUser(companyId: string, name: string, email: string, systemRole: string, actor: AuditActor) {
    if (systemRole !== 'admin' && systemRole !== 'member') throw new BadRequestException('Invalid role');
    const dbRole = systemRole === 'admin' ? 'admin' : 'author';
    const tempPassword = randomBytes(12).toString('base64url');
    const client = await getPool().connect();
    let user: any;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `insert into users (company_id, name, email, password_hash, system_role, must_reset_password)
         values ($1, $2, $3, crypt($4, gen_salt('bf', 10)), $5, true)
         returning id, name, email, system_role, is_active, created_at`,
        [companyId, name, email, tempPassword, dbRole],
      );
      user = rows[0];
      await this.audit.record({
        companyId,
        type: 'user.invited',
        message: `Invited ${user.name} to the company`,
        entityType: 'user',
        entityId: user.id,
        entityLabel: user.name,
        actor,
        metadata: { email: user.email, role: user.system_role },
      }, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    const emailSent = await this.email.send(
      email,
      'Your Clinical Investigation Platform account',
      `Hi ${name},\n\n` +
        `An account has been created for you on the Clinical Investigation Platform.\n\n` +
        `Email: ${email}\n` +
        `Temporary password: ${tempPassword}\n\n` +
        `Log in and you'll be asked to set a new password before continuing.`,
    );

    return { ...user, accountCreated: true, emailSent };
  }

  async setUserRole(companyId: string, userId: string, systemRole: string, actor: AuditActor) {
    if (systemRole !== 'admin' && systemRole !== 'member') throw new BadRequestException('Invalid role');
    const dbRole = systemRole === 'admin' ? 'admin' : 'author';
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `update users set system_role = $1, updated_at = now()
       where id = $2 and company_id = $3
       returning id, name, email, system_role, is_active`,
      [dbRole, userId, companyId],
    );
      if (!rows[0]) throw new NotFoundException('User not found');
      const user = rows[0];
      await this.audit.record({
        companyId,
        type: 'user.role.changed',
        message: `Changed ${user.name}'s role to ${user.system_role}`,
        entityType: 'user',
        entityId: user.id,
        entityLabel: user.name,
        actor,
        metadata: { role: user.system_role },
      }, client);
      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async setUserActive(companyId: string, userId: string, isActive: boolean, requesterId: string, actor: AuditActor) {
    if (!isActive && userId === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `update users set is_active = $1, updated_at = now()
       where id = $2 and company_id = $3
       returning id, name, email, system_role, is_active`,
      [isActive, userId, companyId],
    );
      if (!rows[0]) throw new NotFoundException('User not found');
      const user = rows[0];
      await this.audit.record({
        companyId,
        type: 'user.status.changed',
        message: `${user.name}'s account was ${user.is_active ? 'activated' : 'deactivated'}`,
        entityType: 'user',
        entityId: user.id,
        entityLabel: user.name,
        actor,
        metadata: { active: user.is_active },
      }, client);
      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async createSupportTicket(
    userId: string,
    companyId: string | null,
    category: string,
    subject: string,
    message: string,
    actor: AuditActor,
  ) {
    const valid = ['Subscription', 'Technical issue', 'General question'];
    if (!valid.includes(category)) throw new BadRequestException('Invalid category');
    if (!subject?.trim()) throw new BadRequestException('Subject is required');
    if (!message?.trim()) throw new BadRequestException('Message is required');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `insert into support_tickets (user_id, company_id, category, subject, message)
       values ($1, $2, $3, $4, $5)
       returning id, category, subject, status, created_at`,
      [userId, companyId ?? null, category, subject.trim(), message.trim()],
    );
      const ticket = rows[0];
      await this.audit.record({
        companyId,
        type: 'support.ticket.created',
        message: `Created support ticket: ${ticket.subject}`,
        entityType: 'support_ticket',
        entityId: ticket.id,
        entityLabel: ticket.subject,
        actor,
        metadata: { category: ticket.category, status: ticket.status },
      }, client);
      await client.query('COMMIT');
      return ticket;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
