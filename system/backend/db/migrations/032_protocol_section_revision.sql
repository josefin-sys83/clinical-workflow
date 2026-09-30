-- Incremented whenever a section's content changes, so the UI can show which
-- saved revision the user is looking at.
alter table protocol_section
  add column if not exists revision integer not null default 1;
