-- Persist successful/failed analysis so reloads reuse the saved findings.
alter table protocol_section
  add column analysis_status text not null default 'not-run' check (analysis_status in ('not-run','running','succeeded','failed')),
  add column analysis_error text,
  add column analysis_request_id uuid;
alter table report_section
  add column analysis_status text not null default 'not-run' check (analysis_status in ('not-run','running','succeeded','failed')),
  add column analysis_error text,
  add column analysis_request_id uuid;

-- Remove the superseded anchor persistence if the earlier local migration was applied.
alter table protocol_section_issue
  drop column if exists anchor_status, drop column if exists anchor_start, drop column if exists anchor_end;
alter table report_section_issue
  drop column if exists anchor_status, drop column if exists anchor_start, drop column if exists anchor_end;
