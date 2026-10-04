alter table protocol_attachment
  add column requirement_ids text[] not null default '{}',
  add column extracted_text text,
  add column extraction_error text;

-- Links belong to the current finding. Re-analysis replaces findings and their links.
alter table protocol_section_issue
  add column attachment_id uuid references protocol_attachment(id) on delete set null,
  add column verification_status text
    check (verification_status in ('checking','satisfied','warning','blocker','failed')),
  add column verification_request_id uuid,
  add column verification_reason text,
  add column verified_at timestamptz,
  add column document_linked_by_user_id uuid references users(id) on delete set null,
  add column document_linked_at timestamptz;
