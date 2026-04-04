-- Clinical System backend schema (PostgreSQL)
-- Run: psql "$DATABASE_URL" -f db/migrations/001_init.sql

create table if not exists projects (
  id uuid primary key,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','completed')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists workflow_steps (
  step_id text primary key,
  label text not null,
  sort_order int not null
);

-- seed workflow steps (id must match frontend WorkflowStepId)
insert into workflow_steps (step_id, label, sort_order) values
 ('dashboard','Dashboard',10),
 ('project-setup','Project Setup',20),
 ('synopsis','Synopsis',30),
 ('scope','Scope',40),
 ('protocol-make','Make Protocol',50),
 ('protocol-review','Protocol Review',60),
 ('protocol-pdf','PDF Protocol',70),
 ('report-make','Make Report',80),
 ('report-review','Report Review',90),
 ('report-pdf','PDF Report',100)
on conflict (step_id) do nothing;

create table if not exists workflow_step_state (
  project_id uuid not null references projects(id) on delete cascade,
  step_id text not null references workflow_steps(step_id) on delete cascade,
  state text not null,
  updated_at timestamptz not null,
  primary key (project_id, step_id)
);

create table if not exists audit_event (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  step_id text references workflow_steps(step_id) on delete set null,
  type text not null,
  message text not null,
  actor_user_id text,
  metadata jsonb,
  created_at timestamptz not null
);

create index if not exists ix_audit_event_project on audit_event(project_id, created_at desc);
create index if not exists ix_audit_event_step on audit_event(project_id, step_id, created_at desc);
