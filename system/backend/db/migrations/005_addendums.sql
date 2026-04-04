-- Addendums (appendices) linked to a locked release artifact
-- Run: psql "$DATABASE_URL" -f db/migrations/005_addendums.sql

create table if not exists document_addendum (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  doc_type text not null check (doc_type in ('protocol','report')),
  release_artifact_id uuid not null references document_artifact(id) on delete restrict,
  letter text not null,
  title text not null,
  description text,
  change_reason text not null,
  status text not null check (status in ('draft','in_review','approved','signed','locked')),
  signed_artifact_id uuid references document_artifact(id) on delete set null,
  created_by_user_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  locked_at timestamptz
);

create unique index if not exists ux_addendum_letter_per_release
  on document_addendum(release_artifact_id, letter);

create index if not exists ix_addendum_project
  on document_addendum(project_id, doc_type, created_at desc);

create table if not exists document_addendum_approval (
  id uuid primary key,
  addendum_id uuid not null references document_addendum(id) on delete cascade,
  role text not null check (role in ('reviewer')),
  status text not null check (status in ('pending','approved','rejected')),
  actor_user_id text,
  acted_at timestamptz,
  comment text
);

create unique index if not exists ux_addendum_approval_role
  on document_addendum_approval(addendum_id, role);

create table if not exists document_addendum_file (
  id uuid primary key,
  addendum_id uuid not null references document_addendum(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  bytes bytea,
  uploaded_by_user_id text,
  uploaded_at timestamptz not null
);

create index if not exists ix_addendum_files
  on document_addendum_file(addendum_id, uploaded_at desc);
