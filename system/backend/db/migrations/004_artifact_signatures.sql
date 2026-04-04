-- Adds cryptographic signatures for document artifacts
-- Run: psql "$DATABASE_URL" -f db/migrations/004_artifact_signatures.sql

create table if not exists document_artifact_signature (
  id uuid primary key,
  artifact_id uuid not null references document_artifact(id) on delete cascade,
  signed_at timestamptz not null,
  signed_by_user_id text not null,
  signed_by_roles text[] not null default array[]::text[],
  algorithm text not null,
  key_id text not null,
  public_key_pem text not null,
  signature bytea not null
);

create index if not exists ix_document_artifact_signature_artifact on document_artifact_signature(artifact_id, signed_at desc);
create index if not exists ix_document_artifact_signature_key_id on document_artifact_signature(key_id);
