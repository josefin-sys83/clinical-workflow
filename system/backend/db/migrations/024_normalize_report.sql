-- Additive report normalization. Apply with db/migrate.js, or:
-- psql -1 -v ON_ERROR_STOP=1 -f db/migrations/024_normalize_report.sql
-- This migration does not change the running application's storage paths and
-- does not delete project JSON. Refresh the backfill with writes stopped during
-- the later application cutover before removing the old project fields.
-- No report lifecycle status is duplicated: workflow_step_state owns it.

create table report (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  version text not null default '1.0' check (btrim(version) <> ''),
  cross_consistency_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id) on delete set null,
  updated_by_user_id uuid references users(id) on delete set null
);

create table report_section (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references report(id) on delete cascade,
  section_key text not null check (btrim(section_key) <> ''),
  section_number text,
  position integer not null check (position > 0),
  title text not null,
  helper_text text not null default '',
  content text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'under-review', 'approved', 'locked')),
  -- Presence of a saved suggestion is determined by ai_draft IS NOT NULL.
  ai_draft text,
  user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id) on delete set null,
  updated_by_user_id uuid references users(id) on delete set null,
  unique (report_id, section_key)
);
create index ix_report_section_order on report_section(report_id, position, section_key);

create table report_section_comment (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references report_section(id) on delete cascade,
  comment_key text not null,
  parent_comment_id uuid,
  position integer not null check (position > 0),
  author_user_id uuid references users(id) on delete set null,
  author_name text,
  author_email text,
  author_role text,
  content text not null,
  comment_type text not null default 'general'
    check (comment_type in ('general', 'issue', 'approval-request')),
  regarding text,
  resolved boolean not null default false,
  created_at timestamptz,
  unique (section_id, comment_key),
  unique (section_id, id),
  foreign key (section_id, parent_comment_id)
    references report_section_comment(section_id, id) on delete cascade
);
create index ix_report_comment_parent on report_section_comment(section_id, parent_comment_id);

create table report_section_issue (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references report_section(id) on delete cascade,
  issue_key text not null,
  position integer not null check (position > 0),
  severity text not null check (severity in ('blocker', 'warning', 'info')),
  title text,
  subsection text,
  description text not null,
  reference text,
  raised_by text,
  raised_date date,
  status text not null default 'open',
  due_date text,
  text_quote text,
  unique (section_id, issue_key)
);

-- The current UI persists section dismissals by description, even when a
-- subsequent analysis no longer contains that issue. Preserve those decisions
-- independently of the current set of AI issue rows.
create table report_section_issue_dismissal (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references report_section(id) on delete cascade,
  description text not null,
  decided_by_user_id uuid references users(id) on delete set null,
  decided_at timestamptz,
  reason text,
  unique (section_id, description)
);

create table report_section_completeness_element (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references report_section(id) on delete cascade,
  element_key text not null,
  position integer not null check (position > 0),
  title text not null,
  -- Analysis returns a clause citation. There is currently no clause-level
  -- requirements table to reference; standards identifies whole standards.
  requirement_reference text,
  status text not null
    check (status in ('verified', 'partially-covered', 'not-yet-verified')),
  verified_by_user_id uuid references users(id) on delete set null,
  verified_by_name text,
  verified_by_email text,
  verified_by_role text,
  verified_at timestamptz,
  ai_suggestion text check (ai_suggestion in ('covered', 'partial', 'missing')),
  unique (section_id, element_key)
);

create table report_cross_consistency_issue (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references report(id) on delete cascade,
  position integer not null check (position > 0),
  -- AI returns section titles, not IDs. These are the exact labels compared;
  -- guessing foreign keys from mutable/non-unique titles would mislink evidence.
  protocol_section_title text not null,
  report_section_title text not null,
  description text not null,
  severity text not null check (severity in ('blocker', 'warning')),
  unique (report_id, position)
);

create table report_cross_consistency_dismissal (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references report(id) on delete cascade,
  -- Existing UI's deterministic fingerprint of the two titles + description.
  finding_key text not null,
  decided_by_user_id uuid references users(id) on delete set null,
  decided_at timestamptz,
  reason text,
  unique (report_id, finding_key)
);

-- Report signatures currently live in projects.data.signatures, outside report.
create table report_signature (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references report(id) on delete cascade,
  role_key text not null check (role_key in ('report-investigator', 'report-sponsor')),
  role_title text,
  -- Identity snapshots are immutable signing evidence. No user FK is used here:
  -- deleting a user must not mutate a historical signature.
  signed_by_user_id uuid,
  signed_by_name text not null,
  signed_by_email text,
  signed_at timestamptz not null,
  timezone text,
  ip_address text,
  document_hash text not null check (btrim(document_hash) <> '')
);
create index ix_report_signature_report on report_signature(report_id, role_key, signed_at desc);

-- Fail rather than silently skip malformed containers or ambiguous section IDs.
do $$
declare p record; s jsonb; defs jsonb;
begin
  for p in select id, data->'report' as r from projects loop
    if p.r is null or p.r = 'null'::jsonb then continue; end if;
    if jsonb_typeof(p.r) <> 'object' then
      raise exception 'Project % has a non-object report', p.id;
    end if;
    s := p.r->'sections';
    defs := p.r->'sectionDefs';
    if s is not null and s <> 'null'::jsonb then
      if jsonb_typeof(s) not in ('object', 'array') then
        raise exception 'Project % has invalid report sections', p.id;
      end if;
      if jsonb_typeof(s) = 'array' then
        if exists (select 1 from jsonb_array_elements(s) e
                   where jsonb_typeof(e) <> 'object' or coalesce(btrim(e->>'id'), '') = '')
          or exists (select 1 from jsonb_array_elements(s) e group by e->>'id' having count(*) > 1) then
          raise exception 'Project % has invalid/duplicate report section IDs', p.id;
        end if;
      else
        if exists (select 1 from jsonb_each(s) e
                   where btrim(e.key) = '' or jsonb_typeof(e.value) <> 'object') then
          raise exception 'Project % has invalid report section entries', p.id;
        end if;
      end if;
    end if;
    if defs is not null and defs <> 'null'::jsonb then
      if jsonb_typeof(defs) <> 'array' then
        raise exception 'Project % has invalid report sectionDefs', p.id;
      end if;
      if exists (select 1 from jsonb_array_elements(defs) e
                 where jsonb_typeof(e) <> 'object' or coalesce(btrim(e->>'id'), '') = '')
        or exists (select 1 from jsonb_array_elements(defs) e group by e->>'id' having count(*) > 1) then
        raise exception 'Project % has invalid/duplicate report definitions', p.id;
      end if;
    end if;
  end loop;
end;
$$;

insert into report (project_id, version, cross_consistency_checked, created_at, updated_at)
select id, coalesce(nullif(data->'report'->>'version', ''), '1.0'),
  coalesce(jsonb_typeof(data->'report'->'crossConsistencyIssues') = 'array', false),
  created_at, updated_at
from projects;

create temporary view migration_024_sections as
with source as (
  select r.id as report_id, p.data->'report' as doc, p.created_at, p.updated_at
  from projects p join report r on r.project_id = p.id
), saved as (
  select s.report_id, e.key, e.value, null::bigint as ordinal
  from source s cross join lateral jsonb_each(
    case when jsonb_typeof(doc->'sections') = 'object' then doc->'sections' else '{}'::jsonb end) e
  union all
  select s.report_id, e.value->>'id', e.value, e.ordinality
  from source s cross join lateral jsonb_array_elements(
    case when jsonb_typeof(doc->'sections') = 'array' then doc->'sections' else '[]'::jsonb end)
    with ordinality e
), defs as (
  select s.report_id, e.value->>'id' as key, e.value, e.ordinality
  from source s cross join lateral jsonb_array_elements(
    case when jsonb_typeof(doc->'sectionDefs') = 'array' then doc->'sectionDefs' else '[]'::jsonb end)
    with ordinality e
), merged as (
  select coalesce(a.report_id, d.report_id) as report_id, coalesce(a.key, d.key) as key,
    coalesce(a.value, '{}'::jsonb) as val, coalesce(d.value, '{}'::jsonb) as def,
    coalesce(d.ordinality, a.ordinal) as ordinal
  from saved a full join defs d on d.report_id = a.report_id and d.key = a.key
)
select m.*, s.created_at, s.updated_at from merged m join source s on s.report_id = m.report_id;

insert into report_section (report_id, section_key, section_number, position, title,
  helper_text, content, status, ai_draft, user_edited, created_at, updated_at)
select report_id, key, coalesce(def->>'number', val->>'number', val->>'order'),
  row_number() over (partition by report_id order by
    case when coalesce(def->>'number', val->>'order', val->>'number') ~ '^[0-9]+([.][0-9]+)?$'
      then coalesce(def->>'number', val->>'order', val->>'number')::numeric end nulls last,
    ordinal nulls last, key)::integer,
  coalesce(nullif(def->>'title', ''), nullif(val->>'title', ''), key),
  coalesce(val->>'helperText', ''),
  case when jsonb_typeof(val->'content') = 'array' then
    (select coalesce(string_agg(e.value, E'\n\n' order by e.ordinality), '')
     from jsonb_array_elements_text(val->'content') with ordinality e)
    else coalesce(val->>'content', '') end,
  coalesce(nullif(val->>'state', ''), 'draft'), val->>'aiDraft',
  coalesce(val->>'userEdited', 'false')::boolean, created_at, updated_at
from migration_024_sections;

-- Missing recorded decision actors/times remain NULL; never invent attribution.
insert into report_section_issue_dismissal (section_id, description)
select distinct s.id, e.value
from migration_024_sections m
join report_section s on s.report_id = m.report_id and s.section_key = m.key
cross join lateral jsonb_array_elements_text(coalesce(nullif(m.val->'wontFixIssues', 'null'::jsonb), '[]'::jsonb)) e;

insert into report_section_issue (section_id, issue_key, position, severity, title,
  subsection, description, reference, raised_by, raised_date, status, due_date, text_quote)
select s.id, coalesce(nullif(e.value->>'id', ''), 'issue-' || e.ordinality),
  e.ordinality::integer, e.value->>'severity', e.value->>'title', e.value->>'subsection',
  coalesce(e.value->>'description', e.value->>'message', ''), e.value->>'reference',
  e.value->>'raisedBy', nullif(e.value->>'raisedDate', '')::date,
  coalesce(e.value->>'status', 'open'), e.value->>'dueDate', e.value->>'textQuote'
from migration_024_sections m
join report_section s on s.report_id = m.report_id and s.section_key = m.key
cross join lateral jsonb_array_elements(coalesce(nullif(m.val->'issues', 'null'::jsonb), '[]'::jsonb)) with ordinality e;

insert into report_section_completeness_element (section_id, element_key, position,
  title, requirement_reference, status, verified_by_user_id, verified_by_name,
  verified_by_email, verified_by_role, verified_at, ai_suggestion)
select s.id, coalesce(nullif(e.value->>'id', ''), 'element-' || e.ordinality),
  e.ordinality::integer, e.value->>'title', e.value->>'isoReference', e.value->>'status',
  u.id, e.value->'verifiedBy'->>'name', e.value->'verifiedBy'->>'email',
  e.value->'verifiedBy'->>'role', nullif(e.value->>'verificationDate', '')::timestamptz,
  e.value->>'aiSuggestion'
from migration_024_sections m
join report_section s on s.report_id = m.report_id and s.section_key = m.key
cross join lateral jsonb_array_elements(coalesce(nullif(m.val->'completenessElements', 'null'::jsonb), '[]'::jsonb)) with ordinality e
left join users u on u.id::text = e.value->'verifiedBy'->>'id';

-- Recursive replies use the same table. A compound FK keeps parents in the same
-- section. Missing UI IDs receive deterministic path keys within that section.
with recursive comments as (
  select s.id as section_id, e.value as item,
    array[e.ordinality::integer] as path, null::integer[] as parent_path
  from migration_024_sections m
  join report_section s on s.report_id = m.report_id and s.section_key = m.key
  cross join lateral jsonb_array_elements(coalesce(nullif(m.val->'comments', 'null'::jsonb), '[]'::jsonb)) with ordinality e
  union all
  select c.section_id, e.value, c.path || e.ordinality::integer, c.path
  from comments c
  cross join lateral jsonb_array_elements(coalesce(nullif(c.item->'replies', 'null'::jsonb), '[]'::jsonb)) with ordinality e
), identified as materialized (
  select gen_random_uuid() as id, * from comments
)
insert into report_section_comment (id, section_id, comment_key, parent_comment_id,
  position, author_user_id, author_name, author_email, author_role, content,
  comment_type, regarding, resolved, created_at)
select c.id, c.section_id, coalesce(nullif(c.item->>'id', ''), 'comment-' || array_to_string(c.path, '.')),
  parent.id, c.path[array_length(c.path, 1)], u.id,
  case when jsonb_typeof(c.item->'author') = 'object' then c.item->'author'->>'name'
    else c.item->>'author' end,
  c.item->'author'->>'email', coalesce(c.item->>'authorRole', c.item->'author'->>'role'),
  coalesce(c.item->>'text', c.item->>'content', ''),
  coalesce(c.item->>'commentType', c.item->>'type', 'general'), c.item->>'regarding',
  coalesce((c.item->>'resolved')::boolean, c.item->>'status' = 'resolved', false),
  nullif(c.item->>'timestamp', '')::timestamptz
from identified c
left join identified parent on parent.section_id = c.section_id and parent.path = c.parent_path
left join users u on u.id::text = c.item->'author'->>'id';

insert into report_cross_consistency_issue (report_id, position, protocol_section_title,
  report_section_title, description, severity)
select r.id, e.ordinality::integer, coalesce(e.value->>'section1', ''),
  coalesce(e.value->>'section2', ''), e.value->>'description', e.value->>'severity'
from projects p join report r on r.project_id = p.id
cross join lateral jsonb_array_elements(coalesce(nullif(p.data->'report'->'crossConsistencyIssues', 'null'::jsonb), '[]'::jsonb)) with ordinality e;

insert into report_cross_consistency_dismissal (report_id, finding_key)
select distinct r.id, e.value
from projects p join report r on r.project_id = p.id
cross join lateral jsonb_array_elements_text(coalesce(nullif(p.data->'report'->'wontFixCrossConsistencyIssues', 'null'::jsonb), '[]'::jsonb)) e;

-- Strict casts intentionally reject invalid signature evidence rather than
-- substituting a fabricated identity, timestamp, or document hash.
insert into report_signature (id, report_id, role_key, role_title, signed_by_user_id,
  signed_by_name, signed_by_email, signed_at, timezone, ip_address, document_hash)
select (e.value->>'id')::uuid, r.id, e.value->>'role', e.value->>'roleTitle',
  nullif(e.value->>'signerUserId', '')::uuid, e.value->>'signerName',
  e.value->>'signerEmail', (e.value->>'signedAt')::timestamptz,
  e.value->>'timezone', e.value->>'ipAddress', e.value->>'documentHash'
from projects p join report r on r.project_id = p.id
cross join lateral jsonb_array_elements(coalesce(nullif(p.data->'signatures', 'null'::jsonb), '[]'::jsonb)) e
where e.value->>'role' like 'report-%';

create function prevent_report_signature_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from report where id = old.report_id) then
    return old;
  end if;
  raise exception 'Report signatures are append-only';
end;
$$;
create trigger trg_report_signature_append_only
before update or delete on report_signature
for each row execute function prevent_report_signature_mutation();

drop view migration_024_sections;

-- Project JSON is deliberately untouched until the application cutover.
-- Uploaded files, data assets and their placements belong to the subsequent
-- supporting-document/results migration, not this report/section schema.
-- UI-only templates/guidance, validation previews, roles derived from project
-- membership, and unsaved mock deviations are not copied into storage tables.
