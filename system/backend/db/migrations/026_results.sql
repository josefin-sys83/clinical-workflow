-- Results are project-owned evidence. Content is stored once, including when
-- placement is 'both'. SAP/TFL attachments are separate file-bearing records.
create table supporting_document (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('sap', 'tfl')),
  filename text not null check (btrim(filename) <> ''),
  mime_type text not null check (btrim(mime_type) <> ''),
  bytes bytea not null,
  description text,
  uploaded_by_user_id uuid references users(id) on delete set null,
  uploaded_by_name text not null,
  uploaded_by_email text,
  uploaded_at timestamptz not null default now(),
  unique (project_id, id)
);
create index ix_supporting_document_project on supporting_document(project_id, uploaded_at);

-- Composite keys enforce project/report ownership even for direct SQL writes.
alter table report add constraint uq_report_project_id unique (project_id, id);
alter table report_section add constraint uq_report_section_report_id unique (report_id, id);

create table result_object (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_id uuid not null,
  version integer not null default 1 check (version > 0),
  type text not null check (type in ('table', 'figure', 'listing')),
  title text not null check (btrim(title) <> ''),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  description text not null default '',
  source_filename text not null check (btrim(source_filename) <> ''),
  source_location text not null default '',
  source_document_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'accepted', 'in-appendix', 'rejected')),
  placement text not null default 'unplaced'
    check (placement in ('unplaced', 'main', 'appendix', 'both')),
  report_section_id uuid,
  title_origin text not null default 'human' check (title_origin in ('ai', 'human')),
  section_origin text not null default 'human' check (section_origin in ('ai', 'human')),
  description_origin text not null default 'human' check (description_origin in ('ai', 'human')),
  original_reference text,
  report_number integer not null check (report_number > 0),
  last_decision text check (last_decision in ('accept', 'appendix', 'reject')),
  decision_reason text,
  -- Snapshot ID, like audit_event: removing a user must not erase attribution.
  decided_by_user_id uuid,
  decided_at timestamptz,
  created_by_user_id uuid references users(id) on delete set null,
  updated_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, report_id) references report(project_id, id) on delete cascade,
  foreign key (report_id, report_section_id) references report_section(report_id, id),
  foreign key (project_id, source_document_id) references supporting_document(project_id, id),
  unique (report_id, type, report_number),
  check ((status = 'draft')
    or (status = 'accepted' and placement in ('unplaced', 'main', 'both'))
    or (status = 'in-appendix' and placement = 'appendix')
    or (status = 'rejected' and placement = 'unplaced')),
  check (placement not in ('main', 'both') or report_section_id is not null)
);
create index ix_result_object_project on result_object(project_id, type, report_number);
create index ix_result_object_section on result_object(report_id, report_section_id);
create index ix_result_object_source on result_object(project_id, source_document_id);

-- Follow 022: deleting a result never causes a reference number to be reused.
create table result_object_sequence (
  report_id uuid not null references report(id) on delete cascade,
  type text not null check (type in ('table', 'figure', 'listing')),
  next_number integer not null check (next_number > 0),
  primary key (report_id, type)
);
