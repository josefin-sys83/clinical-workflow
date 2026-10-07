-- Keep the human decision with the stable finding across edits and reanalysis.
alter table protocol_section_issue
  add column if not exists wont_fix_reason text;
