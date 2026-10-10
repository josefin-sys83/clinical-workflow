-- Protocol sections already have revisions (034). Give report content the same
-- monotonically increasing token for detecting outdated editor saves.
alter table report_section add column revision integer not null default 1 check (revision > 0);
