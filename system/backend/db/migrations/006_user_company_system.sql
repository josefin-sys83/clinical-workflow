-- User/company (multi-tenant) foundation
-- Run: node db/migrate.js

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists companies (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  domain     text        unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users  (company_id FK added separately below so tables exist first)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid,
  email         text        not null unique,
  name          text        not null,
  password_hash text        not null,
  system_role   text        not null default 'author'
                            check (system_role in ('admin', 'author', 'reviewer', 'approver')),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ix_users_company on users(company_id);
create index if not exists ix_users_email   on users(email);

-- ---------------------------------------------------------------------------
-- project_members  (replaces projects.data.roles JSON blob)
-- FK constraints added separately below.
-- ---------------------------------------------------------------------------
-- project_id is text to match the existing projects.id text column.
-- user_id is uuid to match the new users.id uuid column.
create table if not exists project_members (
  id           uuid        primary key default gen_random_uuid(),
  project_id   text        not null,
  user_id      uuid        not null,
  role_title   text        not null,
  created_at   timestamptz not null default now(),
  unique (project_id, user_id, role_title)
);

create index if not exists ix_project_members_project on project_members(project_id);
create index if not exists ix_project_members_user    on project_members(user_id);

-- ---------------------------------------------------------------------------
-- FK constraints (all tables now exist)
-- Named constraints; PostgreSQL allows duplicate FK definitions if names differ,
-- so this is safe even if a prior partial run left an implicit-named FK behind.
-- ---------------------------------------------------------------------------
alter table users
  add constraint fk_users_company
  foreign key (company_id) references companies(id) on delete set null;

alter table project_members
  add constraint fk_pm_project
  foreign key (project_id) references projects(id) on delete cascade;

alter table project_members
  add constraint fk_pm_user
  foreign key (user_id) references users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Extend projects with company ownership (nullable; backward-compatible)
-- ---------------------------------------------------------------------------
alter table projects
  add column if not exists company_id    uuid,
  add column if not exists owner_user_id uuid;

create index if not exists ix_projects_company on projects(company_id);

alter table projects
  add constraint fk_projects_company
  foreign key (company_id) references companies(id) on delete set null;

alter table projects
  add constraint fk_projects_owner
  foreign key (owner_user_id) references users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Seed: demo company + users mirroring auth.service.ts hardcoded accounts
-- ---------------------------------------------------------------------------
insert into companies (id, name, domain) values
  ('10000000-0000-0000-0000-000000000000', 'Demo Organisation', 'demo.local')
on conflict do nothing;

insert into users (id, company_id, email, name, password_hash, system_role) values
  (
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000000',
    'admin@demo.local', 'Admin User',
    crypt('admin', gen_salt('bf', 10)),
    'admin'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000000',
    'author@demo.local', 'Author User',
    crypt('author', gen_salt('bf', 10)),
    'author'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000000',
    'reviewer@demo.local', 'Reviewer User',
    crypt('reviewer', gen_salt('bf', 10)),
    'reviewer'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000000',
    'approver@demo.local', 'Approver User',
    crypt('approver', gen_salt('bf', 10)),
    'approver'
  )
on conflict do nothing;
