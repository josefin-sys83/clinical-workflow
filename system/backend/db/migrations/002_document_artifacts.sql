-- Document artifacts (immutable) for finalized exports
-- Run: psql "$DATABASE_URL" -f db/migrations/002_document_artifacts.sql

create table if not exists document_artifact (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  doc_type text not null check (doc_type in ('protocol','report')),
  file_name text not null,
  content_type text not null,
  sha256 text not null,
  bytes bytea,
  created_by_user_id text,
  created_at timestamptz not null
);

create index if not exists ix_document_artifact_project on document_artifact(project_id, created_at desc);
