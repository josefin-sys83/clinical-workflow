create table if not exists protocol_attachment (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  appendix_number integer not null check (appendix_number > 0),
  filename text not null,
  mime_type text not null,
  bytes bytea not null,
  description text,
  uploaded_by_user_id text,
  uploaded_by_name text not null,
  uploaded_by_email text,
  uploaded_at timestamptz not null,
  unique (project_id, appendix_number)
);

create index if not exists ix_protocol_attachment_project
  on protocol_attachment(project_id, appendix_number);

-- Keep numbering monotonic even when the highest-numbered attachment is removed;
-- otherwise a saved "see Appendix 3" reference could later point to a different file.
create table if not exists protocol_attachment_sequence (
  project_id uuid primary key references projects(id) on delete cascade,
  next_appendix_number integer not null check (next_appendix_number > 0)
);
