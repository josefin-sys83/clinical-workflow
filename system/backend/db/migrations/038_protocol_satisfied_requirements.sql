-- Keep positive requirement coverage with the section's latest successful analysis.
alter table protocol_section
  add column if not exists satisfied_requirements jsonb not null default '[]'::jsonb
  check (jsonb_typeof(satisfied_requirements) = 'array');
