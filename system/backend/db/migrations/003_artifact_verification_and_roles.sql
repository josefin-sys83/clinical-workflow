-- Add verification metadata + creator roles for document artifacts
-- Run: psql "$DATABASE_URL" -f db/migrations/003_artifact_verification_and_roles.sql

alter table document_artifact
  add column if not exists created_by_roles text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id text;

create index if not exists ix_document_artifact_project_type on document_artifact(project_id, doc_type, created_at desc);
