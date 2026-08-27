-- Promote the original project-only audit table into an append-only, tenant-aware
-- audit trail. Audit rows deliberately keep snapshot values and do not use foreign
-- keys for company/project/actor: deleting or renaming a related record must never
-- erase or rewrite its historical evidence.

alter table audit_event
  drop constraint if exists audit_event_project_id_fkey;

alter table audit_event
  alter column project_id drop not null,
  add column if not exists company_id uuid,
  add column if not exists scope text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists entity_label text,
  add column if not exists actor_name text,
  add column if not exists actor_email text,
  add column if not exists actor_role text,
  add column if not exists company_name text,
  add column if not exists project_number text,
  add column if not exists project_name text;

-- Backfill tenant and display snapshots for the project events that already exist.
update audit_event ae
set company_id    = p.company_id,
    company_name  = c.name,
    project_number = p.project_number,
    project_name   = p.name
from projects p
left join companies c on c.id = p.company_id
where ae.project_id = p.id
  and (ae.company_id is null or ae.project_name is null);

-- Older events sometimes contain a UUID in actor_user_id. Capture the current user
-- identity as a historical snapshot where that relationship can still be resolved.
update audit_event ae
set actor_name  = u.name,
    actor_email = u.email,
    actor_role  = case when u.is_superadmin then 'superadmin' else u.system_role end
from users u
where ae.actor_user_id = u.id::text
  and ae.actor_name is null;

update audit_event
set scope = case
  when project_id is not null then 'project'
  when company_id is not null then 'company'
  else 'system'
end
where scope is null;

update audit_event
set entity_type = case
  when project_id is not null then 'project'
  when company_id is not null then 'company'
  else 'system'
end
where entity_type is null;

-- Classify historical project events by their stable action prefix so the global UI
-- can filter documents, workflow, scope, users, and other records meaningfully.
update audit_event
set entity_type = case split_part(type, '.', 1)
  when 'auth' then 'user'
  when 'password' then 'user'
  when 'profile' then 'user'
  when 'user' then 'user'
  when 'superadmin' then 'superadmin'
  when 'company' then 'company'
  when 'support' then 'support_ticket'
  when 'workflow' then 'workflow_step'
  when 'document' then 'document'
  when 'addendum' then 'addendum'
  when 'amendment' then 'amendment'
  when 'protocol' then 'protocol'
  when 'report' then 'report'
  when 'section' then 'protocol_section'
  when 'synopsis' then 'synopsis'
  when 'scope' then 'scope'
  else entity_type
end;

update audit_event
set entity_id = coalesce(project_id::text, company_id::text)
where entity_id is null;

update audit_event
set entity_label = coalesce(project_number, project_name, company_name, entity_type)
where entity_label is null;

alter table audit_event
  alter column scope set default 'system',
  alter column scope set not null,
  alter column entity_type set default 'system',
  alter column entity_type set not null,
  alter column metadata set default '{}'::jsonb;

alter table audit_event
  drop constraint if exists audit_event_scope_check;

alter table audit_event
  add constraint audit_event_scope_check
  check (scope in ('system', 'company', 'project'));

create index if not exists ix_audit_event_company_created
  on audit_event(company_id, created_at desc);

create index if not exists ix_audit_event_scope_created
  on audit_event(scope, created_at desc);

create index if not exists ix_audit_event_type_created
  on audit_event(type, created_at desc);

create index if not exists ix_audit_event_entity
  on audit_event(entity_type, entity_id, created_at desc);

create index if not exists ix_audit_event_actor_created
  on audit_event(actor_user_id, created_at desc);

-- The application may insert audit rows, but it may not rewrite or delete history.
create or replace function prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_event is append-only; % is not permitted', tg_op;
end
$$;

drop trigger if exists trg_audit_event_append_only on audit_event;

create trigger trg_audit_event_append_only
before update or delete on audit_event
for each row execute function prevent_audit_event_mutation();