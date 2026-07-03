#!/usr/bin/env ts-node
// Run: DATABASE_URL=... npx ts-node src/db/seed.ts
// Idempotent: uses ON CONFLICT DO NOTHING / ON CONFLICT DO UPDATE so it is safe to re-run.

import { Pool } from 'pg';

const COMPANY_ID = '10000000-0000-0000-0000-000000000000';

const USERS = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    email: 'superadmin@demo.local',
    name: 'Super Admin',
    password: 'admin123',
    system_role: 'admin',
    is_superadmin: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000020',
    email: 'superadmin2@demo.local',
    name: 'Superadmin 2',
    password: 'admin123',
    system_role: 'admin',
    is_superadmin: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000030',
    email: 'member@demo.local',
    name: 'Regular Member',
    password: 'member123',
    system_role: 'author', // DB allows: admin | author | reviewer | approver
    is_superadmin: false,
  },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('begin');

    // Demo company
    await client.query(
      `insert into companies (id, name, domain, status, subscription_plan)
       values ($1, 'Demo Organisation', 'demo.local', 'active', 'enterprise')
       on conflict (id) do update set
         name              = excluded.name,
         status            = excluded.status,
         subscription_plan = excluded.subscription_plan`,
      [COMPANY_ID],
    );
    console.log('  company  Demo Organisation upserted');

    // Users
    for (const u of USERS) {
      await client.query(
        `insert into users
           (id, company_id, email, name, password_hash, system_role, is_superadmin)
         values
           ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), $6, $7)
         on conflict (email) do update set
           name          = excluded.name,
           password_hash = excluded.password_hash,
           system_role   = excluded.system_role,
           is_superadmin = excluded.is_superadmin,
           updated_at    = now()`,
        [u.id, u.is_superadmin ? null : COMPANY_ID, u.email, u.name, u.password, u.system_role, u.is_superadmin],
      );
      console.log(`  user     ${u.email} upserted (role=${u.system_role}, superadmin=${u.is_superadmin})`);
    }

    await client.query('commit');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
