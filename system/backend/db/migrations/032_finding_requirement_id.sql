-- Requirements live in projects.data.scope.requirements; the application validates
-- project ownership and accepted status while holding the project write lock.
alter table protocol_section_issue add column if not exists requirement_id text;
alter table report_section_issue add column if not exists requirement_id text;
