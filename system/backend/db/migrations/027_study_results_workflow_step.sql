-- Study Results is a soft workflow step between the signed protocol and report
-- authoring. Shift the report chain to leave it a stable sort position.
update workflow_steps
set sort_order = case step_id
  when 'report-make' then 90
  when 'report-review' then 100
  when 'report-pdf' then 110
  else sort_order
end
where step_id in ('report-make', 'report-review', 'report-pdf');

insert into workflow_steps(step_id, label, sort_order)
values ('study-results', 'Study Results', 80)
on conflict(step_id) do update
set label = excluded.label, sort_order = excluded.sort_order;

-- Existing projects predate this optional step. Mark the backfilled state done so
-- their derived current step and navigation do not move backwards after deployment.
-- New projects are initialized to draft from workflow_steps by ProjectsService.
insert into workflow_step_state(project_id, step_id, state, updated_at)
select id, 'study-results', 'approved', now()
from projects
on conflict(project_id, step_id) do nothing;
