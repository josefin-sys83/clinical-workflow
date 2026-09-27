-- Preserve the issue metadata introduced by the structured Protocol AI response.
alter table protocol_section_issue
  add column if not exists source text,
  add column if not exists target_section text,
  add column if not exists remediation text;
