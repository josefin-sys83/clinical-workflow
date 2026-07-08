import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { getPool } from '../../db/pg';
import { EmailService } from '../email/email.service';

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
  constructor(private readonly email: EmailService) {}

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

  async updateProfile(userId: string, name: string, timezone: string) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    const { rows } = await getPool().query(
      `update users set name = $1, timezone = $2, updated_at = now()
       where id = $3 returning id, name, timezone`,
      [name.trim(), timezone, userId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    const { rows } = await getPool().query(
      `select id from users where id = $1 and password_hash = crypt($2, password_hash)`,
      [userId, currentPassword],
    );
    if (!rows[0]) throw new UnauthorizedException('Current password is incorrect');
    await getPool().query(
      `update users set password_hash = crypt($1, gen_salt('bf', 10)), must_reset_password = false, updated_at = now()
       where id = $2`,
      [newPassword, userId],
    );
    return { ok: true };
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

  async inviteUser(companyId: string, name: string, email: string, systemRole: string) {
    if (systemRole !== 'admin' && systemRole !== 'member') throw new BadRequestException('Invalid role');
    const dbRole = systemRole === 'admin' ? 'admin' : 'author';
    const tempPassword = randomBytes(12).toString('base64url');
    const { rows } = await getPool().query(
      `insert into users (company_id, name, email, password_hash, system_role, must_reset_password)
       values ($1, $2, $3, crypt($4, gen_salt('bf', 10)), $5, true)
       returning id, name, email, system_role, is_active, created_at`,
      [companyId, name, email, tempPassword, dbRole],
    );
    const user = rows[0];

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

  async setUserRole(companyId: string, userId: string, systemRole: string) {
    if (systemRole !== 'admin' && systemRole !== 'member') throw new BadRequestException('Invalid role');
    const dbRole = systemRole === 'admin' ? 'admin' : 'author';
    const { rows } = await getPool().query(
      `update users set system_role = $1, updated_at = now()
       where id = $2 and company_id = $3
       returning id, name, email, system_role, is_active`,
      [dbRole, userId, companyId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async setUserActive(companyId: string, userId: string, isActive: boolean, requesterId: string) {
    if (!isActive && userId === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const { rows } = await getPool().query(
      `update users set is_active = $1, updated_at = now()
       where id = $2 and company_id = $3
       returning id, name, email, system_role, is_active`,
      [isActive, userId, companyId],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async createSupportTicket(
    userId: string,
    companyId: string | null,
    category: string,
    subject: string,
    message: string,
  ) {
    const valid = ['Subscription', 'Technical issue', 'General question'];
    if (!valid.includes(category)) throw new BadRequestException('Invalid category');
    if (!subject?.trim()) throw new BadRequestException('Subject is required');
    if (!message?.trim()) throw new BadRequestException('Message is required');
    const { rows } = await getPool().query(
      `insert into support_tickets (user_id, company_id, category, subject, message)
       values ($1, $2, $3, $4, $5)
       returning id, category, subject, status, created_at`,
      [userId, companyId ?? null, category, subject.trim(), message.trim()],
    );
    return rows[0];
  }
}
