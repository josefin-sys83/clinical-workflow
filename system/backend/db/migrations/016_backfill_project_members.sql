-- Backfill project_members from the roles already stored in projects.data (the JSON
-- blob Project Setup wrote to before this fix). Without this, every project created
-- before the fix would show empty roles in Settings -> Projects until someone re-saves
-- Project Setup for it. Only rows whose assignedTo email resolves to a real user in the
-- project's own company are inserted — free text that never matched an account (or
-- belongs to a different company) is left out, same as the live sync path in
-- ProjectsService.syncProjectMembers().

with role_people as (
  select
    p.id as project_id,
    p.company_id,
    role_entry->>'title' as role_title,
    trim(person->>'email') as email
  from projects p,
       jsonb_array_elements(coalesce(p.data->'roles', '[]'::jsonb)) as role_entry,
       jsonb_array_elements(coalesce(role_entry->'assignedTo', '[]'::jsonb)) as person
  where coalesce(trim(person->>'email'), '') <> ''
    and coalesce(trim(role_entry->>'title'), '') <> ''
    and p.company_id is not null
)
insert into project_members (project_id, user_id, role_title)
select distinct rp.project_id, u.id, rp.role_title
from role_people rp
join users u on u.company_id = rp.company_id and lower(u.email) = lower(rp.email)
on conflict (project_id, user_id, role_title) do nothing;
