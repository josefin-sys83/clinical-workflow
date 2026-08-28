-- Normalize the editable Clinical Investigation Protocol out of projects.data JSONB.
-- Existing API responses can still synthesize data.protocol, but the source of truth
-- after this migration is the relational model below.

create table if not exists protocol (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  protocol_identifier text,
  version text not null default '1.0',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_protocol_project on protocol(project_id);

create table if not exists protocol_amendment (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references protocol(id) on delete cascade,
  amendment_key text not null,
  amendment_number integer not null check (amendment_number > 0),
  title text not null,
  reason text not null,
  description text not null,
  status text not null default 'draft',
  created_by_user_id uuid references users(id) on delete set null,
  created_by_name text,
  protocol_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(protocol_id, amendment_key),
  unique(protocol_id, amendment_number) deferrable initially deferred
);

create index if not exists ix_protocol_amendment_protocol
  on protocol_amendment(protocol_id, amendment_number);

create table if not exists protocol_section (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references protocol(id) on delete cascade,
  section_key text not null,
  section_number text,
  position integer not null,
  title text not null,
  content text not null default '',
  status text not null default 'draft',
  review_status text,
  locked boolean not null default false,
  review_cycle integer not null default 0,
  ai_generated boolean not null default false,
  approval_status text not null default 'draft',
  approved_by_user_id uuid references users(id) on delete set null,
  approved_by_name text,
  approved_at timestamptz,
  amended boolean not null default false,
  amendment_id uuid references protocol_amendment(id) on delete set null,
  amendment_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(protocol_id, section_key)
);

create index if not exists ix_protocol_section_protocol
  on protocol_section(protocol_id, position);

create table if not exists protocol_section_issue (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references protocol_section(id) on delete cascade,
  issue_key text not null,
  severity text not null,
  subsection text,
  description text not null,
  reference text,
  raised_by text,
  raised_date date,
  status text not null default 'open',
  due_date text,
  text_quote text,
  unique(section_id, issue_key)
);

create index if not exists ix_protocol_section_issue_section
  on protocol_section_issue(section_id, status, severity);

create table if not exists protocol_section_required_element (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references protocol_section(id) on delete cascade,
  element_key text not null,
  name text not null,
  status text not null,
  reference text,
  evidence text,
  verified_by text,
  verified_date date,
  unique(section_id, element_key)
);

create index if not exists ix_protocol_required_element_section
  on protocol_section_required_element(section_id, status);

create table if not exists protocol_section_comment (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references protocol_section(id) on delete cascade,
  comment_key text not null,
  author_user_id uuid references users(id) on delete set null,
  author_name text not null,
  author_role text,
  content text not null,
  comment_type text not null default 'general',
  subsection text,
  status text not null default 'open',
  resolved_by_user_id uuid references users(id) on delete set null,
  resolved_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(section_id, comment_key)
);

create index if not exists ix_protocol_comment_section
  on protocol_section_comment(section_id, status, created_at);

create table if not exists protocol_section_comment_reply (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references protocol_section_comment(id) on delete cascade,
  reply_key text not null,
  author_user_id uuid references users(id) on delete set null,
  author_name text not null,
  author_role text,
  content text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique(comment_id, reply_key)
);

create index if not exists ix_protocol_comment_reply_comment
  on protocol_section_comment_reply(comment_id, created_at);

create table if not exists protocol_amendment_section (
  amendment_id uuid not null references protocol_amendment(id) on delete cascade,
  section_id uuid not null references protocol_section(id) on delete cascade,
  snapshot_title text,
  snapshot_content text,
  snapshot_version text,
  primary key(amendment_id, section_id)
);

create table if not exists protocol_amendment_report_section (
  amendment_id uuid not null references protocol_amendment(id) on delete cascade,
  report_section_key text not null,
  primary key(amendment_id, report_section_key)
);

create table if not exists protocol_amendment_approval (
  id uuid primary key default gen_random_uuid(),
  amendment_id uuid not null references protocol_amendment(id) on delete cascade,
  role_key text not null,
  status text not null default 'pending',
  actor_user_id uuid references users(id) on delete set null,
  actor_name text,
  acted_at timestamptz,
  uploaded_document text,
  unique(amendment_id, role_key)
);

create table if not exists protocol_signature (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references protocol(id) on delete cascade,
  role_key text not null,
  role_title text not null,
  signed_by_user_id uuid references users(id) on delete set null,
  signed_by_name text not null,
  signed_by_email text,
  signed_at timestamptz not null,
  timezone text,
  ip_address text,
  document_hash text not null,
  check (btrim(role_key) <> ''),
  check (btrim(document_hash) <> '')
);

create index if not exists ix_protocol_signature_protocol
  on protocol_signature(protocol_id, role_key, signed_at desc);

create or replace function prevent_protocol_signature_mutation()
returns trigger
language plpgsql
as $$
begin
  -- Permit only FK-cascade cleanup when the owning protocol/project is deleted.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'Protocol signatures are append-only';
end;
$$;

drop trigger if exists trg_protocol_signature_append_only on protocol_signature;
create trigger trg_protocol_signature_append_only
before update or delete on protocol_signature
for each row execute function prevent_protocol_signature_mutation();

create or replace function migration_023_try_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then return null; end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function migration_023_jsonb_array(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end;
$$;

create or replace function migration_023_jsonb_object(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end;
$$;

-- Every project owns exactly one working protocol row, even before generation.
insert into protocol (
  project_id, protocol_identifier, version, status, created_at, updated_at
)
select
  p.id,
  p.data#>>'{protocol,protocolId}',
  coalesce(nullif(p.data#>>'{protocol,version}', ''), '1.0'),
  coalesce(nullif(p.data#>>'{protocol,status}', ''), 'draft'),
  coalesce(migration_023_try_timestamptz(p.data#>>'{protocol,createdAt}'), p.created_at),
  coalesce(migration_023_try_timestamptz(p.data#>>'{protocol,updatedAt}'), p.updated_at)
from projects p
on conflict (project_id) do nothing;

-- Amendments are loaded before sections so section.amendmentId can be a real FK.
insert into protocol_amendment (
  protocol_id, amendment_key, amendment_number, title, reason, description,
  status, created_by_name, protocol_version, created_at, updated_at
)
select
  pr.id,
  coalesce(nullif(a.item->>'id', ''), 'legacy-amendment-' || a.ordinality),
  -- The legacy UI always appended amendments in numeric order. Ordinality gives
  -- every migrated row a valid, collision-free number even if old JSON was edited
  -- manually and contains a missing or duplicate `number` value.
  a.ordinality::integer,
  coalesce(nullif(a.item->>'title', ''), 'Untitled amendment'),
  coalesce(a.item->>'reason', ''),
  coalesce(a.item->>'description', ''),
  coalesce(nullif(a.item->>'status', ''), 'draft'),
  a.item->>'createdBy',
  coalesce(nullif(a.item->>'protocolVersion', ''), pr.version),
  coalesce(migration_023_try_timestamptz(a.item->>'createdAt'), pr.created_at),
  coalesce(migration_023_try_timestamptz(a.item->>'updatedAt'), pr.updated_at)
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,amendments}'))
  with ordinality as a(item, ordinality)
on conflict (protocol_id, amendment_key) do nothing;

insert into protocol_section (
  protocol_id, section_key, section_number, position, title, content, status,
  review_status, locked, review_cycle, ai_generated, approval_status,
  approved_by_name, approved_at, amended, amendment_id, amendment_number,
  created_at, updated_at
)
select
  pr.id,
  coalesce(nullif(s.item->>'id', ''), s.ordinality::text),
  coalesce(nullif(s.item->>'number', ''), nullif(s.item->>'id', ''), s.ordinality::text),
  s.ordinality::integer,
  coalesce(nullif(s.item->>'title', ''), 'Section ' || s.ordinality),
  coalesce(s.item->>'content', ''),
  coalesce(nullif(s.item->>'status', ''), 'draft'),
  nullif(s.item->>'reviewStatus', ''),
  coalesce(s.item->>'locked' = 'true', false),
  case when s.item->>'reviewCycle' ~ '^[0-9]+$' then (s.item->>'reviewCycle')::integer else 0 end,
  case when s.item ? 'aiGenerated' then s.item->>'aiGenerated' = 'true' else true end,
  coalesce(nullif(s.item->>'approvalStatus', ''), 'draft'),
  nullif(s.item->>'approvedBy', ''),
  migration_023_try_timestamptz(s.item->>'approvedAt'),
  coalesce(s.item->>'amended' = 'true', false),
  pa.id,
  case when s.item->>'amendmentNumber' ~ '^[1-9][0-9]*$' then (s.item->>'amendmentNumber')::integer end,
  coalesce(migration_023_try_timestamptz(s.item->>'createdAt'), pr.created_at),
  coalesce(migration_023_try_timestamptz(s.item->>'updatedAt'), pr.updated_at)
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,sections}'))
  with ordinality as s(item, ordinality)
left join protocol_amendment pa
  on pa.protocol_id = pr.id and pa.amendment_key = s.item->>'amendmentId'
on conflict (protocol_id, section_key) do nothing;

insert into protocol_section_issue (
  section_id, issue_key, severity, subsection, description, reference,
  raised_by, raised_date, status, due_date, text_quote
)
select
  ps.id,
  coalesce(nullif(i.item->>'id', ''), 'legacy-issue-' || i.ordinality),
  coalesce(nullif(i.item->>'severity', ''), 'warning'),
  nullif(i.item->>'subsection', ''),
  coalesce(i.item->>'description', ''),
  nullif(i.item->>'reference', ''),
  nullif(i.item->>'raisedBy', ''),
  case when i.item->>'raisedDate' ~ '^\d{4}-\d{2}-\d{2}$' then (i.item->>'raisedDate')::date end,
  coalesce(nullif(i.item->>'status', ''), 'open'),
  nullif(i.item->>'dueDate', ''),
  nullif(i.item->>'textQuote', '')
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,sections}'))
  with ordinality as s(item, ordinality)
join protocol_section ps
  on ps.protocol_id = pr.id
 and ps.section_key = coalesce(nullif(s.item->>'id', ''), s.ordinality::text)
cross join lateral jsonb_array_elements(migration_023_jsonb_array(s.item->'issues'))
  with ordinality as i(item, ordinality)
on conflict (section_id, issue_key) do nothing;

insert into protocol_section_required_element (
  section_id, element_key, name, status, reference, evidence,
  verified_by, verified_date
)
select
  ps.id,
  coalesce(nullif(e.item->>'id', ''), 'legacy-element-' || e.ordinality),
  coalesce(nullif(e.item->>'name', ''), 'Required element'),
  coalesce(nullif(e.item->>'status', ''), 'missing'),
  nullif(e.item->>'reference', ''),
  nullif(e.item->>'evidence', ''),
  nullif(e.item->>'verifiedBy', ''),
  case when e.item->>'verifiedDate' ~ '^\d{4}-\d{2}-\d{2}$' then (e.item->>'verifiedDate')::date end
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,sections}'))
  with ordinality as s(item, ordinality)
join protocol_section ps
  on ps.protocol_id = pr.id
 and ps.section_key = coalesce(nullif(s.item->>'id', ''), s.ordinality::text)
cross join lateral jsonb_array_elements(migration_023_jsonb_array(s.item->'requiredElements'))
  with ordinality as e(item, ordinality)
on conflict (section_id, element_key) do nothing;

insert into protocol_section_comment (
  section_id, comment_key, author_name, author_role, content, comment_type,
  subsection, status, resolved_by_name, resolved_at, created_at
)
select
  ps.id,
  coalesce(nullif(c.item->>'id', ''), 'legacy-comment-' || c.ordinality),
  coalesce(nullif(c.item->>'author', ''), 'Unknown user'),
  nullif(c.item->>'authorRole', ''),
  coalesce(c.item->>'content', ''),
  coalesce(nullif(c.item->>'type', ''), 'general'),
  nullif(c.item->>'subsection', ''),
  coalesce(nullif(c.item->>'status', ''), 'open'),
  nullif(c.item->>'resolvedBy', ''),
  migration_023_try_timestamptz(c.item->>'resolvedDate'),
  coalesce(migration_023_try_timestamptz(c.item->>'timestamp'), pr.created_at)
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,sections}'))
  with ordinality as s(item, ordinality)
join protocol_section ps
  on ps.protocol_id = pr.id
 and ps.section_key = coalesce(nullif(s.item->>'id', ''), s.ordinality::text)
cross join lateral jsonb_array_elements(migration_023_jsonb_array(s.item->'comments'))
  with ordinality as c(item, ordinality)
on conflict (section_id, comment_key) do nothing;

insert into protocol_section_comment_reply (
  comment_id, reply_key, author_name, author_role, content, status, created_at
)
select
  pc.id,
  coalesce(nullif(r.item->>'id', ''), 'legacy-reply-' || r.ordinality),
  coalesce(nullif(r.item->>'author', ''), 'Unknown user'),
  coalesce(nullif(r.item->>'authorRole', ''), nullif(r.item->>'role', '')),
  coalesce(r.item->>'content', ''),
  coalesce(nullif(r.item->>'status', ''), 'open'),
  coalesce(migration_023_try_timestamptz(r.item->>'timestamp'), pc.created_at)
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,sections}'))
  with ordinality as s(item, ordinality)
join protocol_section ps
  on ps.protocol_id = pr.id
 and ps.section_key = coalesce(nullif(s.item->>'id', ''), s.ordinality::text)
cross join lateral jsonb_array_elements(migration_023_jsonb_array(s.item->'comments'))
  with ordinality as c(item, ordinality)
join protocol_section_comment pc
  on pc.section_id = ps.id
 and pc.comment_key = coalesce(nullif(c.item->>'id', ''), 'legacy-comment-' || c.ordinality)
cross join lateral jsonb_array_elements(migration_023_jsonb_array(c.item->'replies'))
  with ordinality as r(item, ordinality)
on conflict (comment_id, reply_key) do nothing;

insert into protocol_amendment_section (
  amendment_id, section_id, snapshot_title, snapshot_content, snapshot_version
)
select
  pa.id,
  ps.id,
  coalesce(a.item#>>array['protocolSnapshot', affected.section_key, 'title'], ps.title),
  coalesce(a.item#>>array['protocolSnapshot', affected.section_key, 'content'], ps.content),
  coalesce(a.item#>>array['protocolSnapshot', affected.section_key, 'version'], pa.protocol_version)
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,amendments}'))
  with ordinality as a(item, ordinality)
join protocol_amendment pa
  on pa.protocol_id = pr.id
 and pa.amendment_key = coalesce(nullif(a.item->>'id', ''), 'legacy-amendment-' || a.ordinality)
cross join lateral jsonb_array_elements_text(migration_023_jsonb_array(a.item->'affectedProtocolSections'))
  as affected(section_key)
join protocol_section ps
  on ps.protocol_id = pr.id and ps.section_key = affected.section_key
on conflict (amendment_id, section_id) do nothing;

insert into protocol_amendment_report_section (amendment_id, report_section_key)
select pa.id, affected.report_section_key
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,amendments}'))
  with ordinality as a(item, ordinality)
join protocol_amendment pa
  on pa.protocol_id = pr.id
 and pa.amendment_key = coalesce(nullif(a.item->>'id', ''), 'legacy-amendment-' || a.ordinality)
cross join lateral jsonb_array_elements_text(migration_023_jsonb_array(a.item->'affectedReportSections'))
  as affected(report_section_key)
on conflict (amendment_id, report_section_key) do nothing;

insert into protocol_amendment_approval (
  amendment_id, role_key, status, actor_name, acted_at, uploaded_document
)
select
  pa.id,
  approval.role_key,
  case
    when approval.value->>'approved' = 'true' then 'approved'
    when nullif(approval.value->>'status', '') is not null then approval.value->>'status'
    else 'pending'
  end,
  nullif(approval.value->>'by', ''),
  coalesce(
    migration_023_try_timestamptz(approval.value->>'at'),
    migration_023_try_timestamptz(approval.value->>'confirmedAt')
  ),
  nullif(approval.value->>'uploadedDoc', '')
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data#>'{protocol,amendments}'))
  with ordinality as a(item, ordinality)
join protocol_amendment pa
  on pa.protocol_id = pr.id
 and pa.amendment_key = coalesce(nullif(a.item->>'id', ''), 'legacy-amendment-' || a.ordinality)
cross join lateral jsonb_each(migration_023_jsonb_object(a.item->'approvals'))
  as approval(role_key, value)
on conflict (amendment_id, role_key) do nothing;

insert into protocol_signature (
  id, protocol_id, role_key, role_title, signed_by_user_id, signed_by_name,
  signed_by_email, signed_at, timezone, ip_address, document_hash
)
select
  case
    when sig.item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (sig.item->>'id')::uuid
    else gen_random_uuid()
  end,
  pr.id,
  sig.item->>'role',
  coalesce(nullif(sig.item->>'roleTitle', ''), sig.item->>'role'),
  u.id,
  coalesce(nullif(sig.item->>'signerName', ''), nullif(sig.item->>'signedBy', ''), u.name, 'Unknown user'),
  coalesce(nullif(sig.item->>'signerEmail', ''), u.email),
  coalesce(
    migration_023_try_timestamptz(sig.item->>'signedAt'),
    migration_023_try_timestamptz(sig.item->>'timestamp'),
    pr.updated_at
  ),
  nullif(sig.item->>'timezone', ''),
  nullif(sig.item->>'ipAddress', ''),
  coalesce(nullif(sig.item->>'documentHash', ''), 'legacy-unknown-hash')
from projects p
join protocol pr on pr.project_id = p.id
cross join lateral jsonb_array_elements(migration_023_jsonb_array(p.data->'signatures')) as sig(item)
left join users u on u.id::text = coalesce(sig.item->>'signerUserId', sig.item->>'userId')
where coalesce(sig.item->>'role', '') not like 'report-%'
  and nullif(sig.item->>'role', '') is not null
on conflict (id) do nothing;

-- Report signatures remain in JSON until the report domain is normalized. Only
-- protocol signatures move now.
update projects p
set data = jsonb_set(
  p.data,
  '{signatures}',
  coalesce((
    select jsonb_agg(sig.item order by sig.ordinality)
    from jsonb_array_elements(migration_023_jsonb_array(p.data->'signatures'))
      with ordinality as sig(item, ordinality)
    where coalesce(sig.item->>'role', '') like 'report-%'
  ), '[]'::jsonb),
  true
)
where p.data ? 'signatures';

-- Protocol document artifacts can now point at the protocol they snapshot.
alter table document_artifact add column if not exists protocol_id uuid;

update document_artifact da
set protocol_id = pr.id
from protocol pr
where da.project_id = pr.project_id
  and da.doc_type = 'protocol'
  and da.protocol_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_document_artifact_protocol'
  ) then
    alter table document_artifact
      add constraint fk_document_artifact_protocol
      foreign key (protocol_id) references protocol(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ck_document_artifact_protocol_owner'
  ) then
    alter table document_artifact
      add constraint ck_document_artifact_protocol_owner
      check (doc_type <> 'protocol' or protocol_id is not null);
  end if;
end;
$$;

create index if not exists ix_document_artifact_protocol
  on document_artifact(protocol_id, created_at desc)
  where protocol_id is not null;

-- A protocol addendum is still anchored to an immutable release artifact, but
-- it also belongs directly to the protocol aggregate for ownership and cleanup.
alter table document_addendum add column if not exists protocol_id uuid;

update document_addendum dda
set protocol_id = coalesce(da.protocol_id, pr.id)
from document_artifact da
left join protocol pr on pr.project_id = da.project_id
where dda.release_artifact_id = da.id
  and dda.doc_type = 'protocol'
  and dda.protocol_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_document_addendum_protocol'
  ) then
    alter table document_addendum
      add constraint fk_document_addendum_protocol
      foreign key (protocol_id) references protocol(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ck_document_addendum_protocol_owner'
  ) then
    alter table document_addendum
      add constraint ck_document_addendum_protocol_owner
      check (doc_type <> 'protocol' or protocol_id is not null);
  end if;
end;
$$;

create index if not exists ix_document_addendum_protocol
  on document_addendum(protocol_id, created_at desc)
  where protocol_id is not null;

-- Move the attachment ownership from project to the actual protocol entity.
alter table protocol_attachment add column if not exists protocol_id uuid;

update protocol_attachment pa
set protocol_id = pr.id
from protocol pr
where pa.project_id = pr.project_id and pa.protocol_id is null;

alter table protocol_attachment alter column protocol_id set not null;
alter table protocol_attachment drop constraint if exists protocol_attachment_project_id_appendix_number_key;
drop index if exists ix_protocol_attachment_project;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_protocol_attachment_protocol'
  ) then
    alter table protocol_attachment
      add constraint fk_protocol_attachment_protocol
      foreign key (protocol_id) references protocol(id) on delete cascade;
  end if;
end;
$$;

-- The original attachment migration used text for the uploader. Normalize it to
-- the real users PK while retaining name/email snapshots for deleted users.
alter table protocol_attachment add column if not exists uploaded_by_user_uuid uuid;

update protocol_attachment pa
set uploaded_by_user_uuid = u.id
from users u
where u.id::text = pa.uploaded_by_user_id
  and pa.uploaded_by_user_uuid is null;

alter table protocol_attachment drop column uploaded_by_user_id;
alter table protocol_attachment rename column uploaded_by_user_uuid to uploaded_by_user_id;

alter table protocol_attachment
  add constraint fk_protocol_attachment_uploader
  foreign key (uploaded_by_user_id) references users(id) on delete set null;

create unique index if not exists ux_protocol_attachment_number
  on protocol_attachment(protocol_id, appendix_number);
create index if not exists ix_protocol_attachment_protocol
  on protocol_attachment(protocol_id, appendix_number);

create table if not exists protocol_attachment_sequence_v2 (
  protocol_id uuid primary key references protocol(id) on delete cascade,
  next_appendix_number integer not null check (next_appendix_number > 0)
);

insert into protocol_attachment_sequence_v2 (protocol_id, next_appendix_number)
select pr.id, old.next_appendix_number
from protocol_attachment_sequence old
join protocol pr on pr.project_id = old.project_id
on conflict (protocol_id) do update
  set next_appendix_number = greatest(
    protocol_attachment_sequence_v2.next_appendix_number,
    excluded.next_appendix_number
  );

drop table protocol_attachment_sequence;
alter table protocol_attachment_sequence_v2 rename to protocol_attachment_sequence;
alter table protocol_attachment drop column project_id;

-- The relational rows are now authoritative. Remove the duplicated document blob.
update projects
set data = data - 'protocol'
where data ? 'protocol';

drop function migration_023_try_timestamptz(text);
drop function migration_023_jsonb_array(jsonb);
drop function migration_023_jsonb_object(jsonb);
