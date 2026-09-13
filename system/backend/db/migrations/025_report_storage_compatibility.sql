-- Preserve the distinction between a missing JSON field and a deliberately
-- saved empty string. New issues-only patches must leave content unset.
alter table report_section alter column content drop not null;
alter table report_section alter column content drop default;
alter table report_section alter column helper_text drop not null;
alter table report_section alter column helper_text drop default;

create temporary view migration_025_legacy_sections as
select p.id as project_id, e.key, e.value
from projects p cross join lateral jsonb_each(
  case when jsonb_typeof(p.data->'report'->'sections') = 'object'
    then p.data->'report'->'sections' else '{}'::jsonb end) e
union all
select p.id, e.value->>'id', e.value
from projects p cross join lateral jsonb_array_elements(
  case when jsonb_typeof(p.data->'report'->'sections') = 'array'
    then p.data->'report'->'sections' else '[]'::jsonb end) e;

-- 024 introduced empty defaults even when the old section held only findings.
-- Repair only untouched placeholder sections: generated sections have real
-- titles/numbers, and author edits set user_edited. Never replace saved text or
-- an explicit empty value found in the legacy section.
update report_section s set content = null
from report r
where s.report_id=r.id and s.content=''
  and ((s.title=s.section_key and s.section_number is null and not s.user_edited
    and s.ai_draft is null and s.status='draft')
    or (s.updated_at <= (select applied_at from schema_migrations where filename='024_normalize_report.sql')
      and exists (select 1 from migration_025_legacy_sections l
        where l.project_id=r.project_id and l.key=s.section_key)))
  and not exists (select 1 from migration_025_legacy_sections l
    where l.project_id=r.project_id and l.key=s.section_key and l.value ? 'content')
  and not exists (select 1 from report_signature sig where sig.report_id=r.id);

update report_section s set helper_text = null
from report r
where s.report_id=r.id and s.helper_text=''
  and ((s.title=s.section_key and s.section_number is null and not s.user_edited)
    or (s.updated_at <= (select applied_at from schema_migrations where filename='024_normalize_report.sql')
      and exists (select 1 from migration_025_legacy_sections l
        where l.project_id=r.project_id and l.key=s.section_key)))
  and not exists (select 1 from migration_025_legacy_sections l
    where l.project_id=r.project_id and l.key=s.section_key and l.value ? 'helperText')
  and not exists (select 1 from report_signature sig where sig.report_id=r.id);

-- Base section order is semantic, not the order asynchronous analysis finished.
with definitions(section_key, title, position) as (values
  ('section-1','Executive Summary',1),
  ('section-2','Introduction and Background',2),
  ('section-3','Objectives and Endpoints',3),
  ('section-4','Clinical Investigation Design',4),
  ('section-5','Statistical Methods',5),
  ('section-6','Subject Disposition and Baseline',6),
  ('section-7','Clinical Performance Results',7),
  ('section-8','Safety Analysis',8),
  ('section-9','Conclusions and Benefit-Risk Assessment',9)
)
update report_section s set position=d.position, section_number=d.position::text,
  title=case when s.title=s.section_key then d.title else s.title end
from definitions d where s.section_key=d.section_key and s.section_number is null
  and not exists (select 1 from report_signature sig where sig.report_id=s.report_id);

-- Match the existing metadata endpoint's market fallback for optional sections.
with contexts as (
  select p.id, coalesce(
    (select array_agg(m.code) from project_markets pm join markets m on m.id=pm.market_id where pm.project_id=p.id),
    (select array_agg(distinct inferred.code) from (
      select case when e->>'title' like '%FDA%' or e->>'title' like '%US%' then 'FDA'
        when e->>'title' like '%EU%' or e->>'title' like '%MDR%' then 'EU' end code
      from jsonb_array_elements(coalesce(nullif(p.data->'scope'->'requirements','null'::jsonb),'[]'::jsonb)) e
      where e->>'status'='accepted') inferred where inferred.code is not null),
    array['EU']::text[]) markets from projects p
), flags as (
  select id, ('EU'=any(markets))::integer eu,
    ('FDA'=any(markets) or 'US'=any(markets))::integer us from contexts
), definitions as (
  select r.id report_id, d.section_key,d.title,d.position
  from flags f join report r on r.project_id=f.id
  cross join lateral (values
    ('section-eu-compliance','Regulatory Compliance Statement (EU MDR 2017/745)',10),
    ('section-us-ide','Investigational Device Exemption (IDE) Compliance Summary',10+f.eu),
    ('section-appendices','Report Appendices',10+f.eu+f.us)
  ) d(section_key,title,position)
)
update report_section s set position=d.position,section_number=d.position::text,
  title=case when s.title=s.section_key then d.title else s.title end
from definitions d where s.report_id=d.report_id and s.section_key=d.section_key and s.section_number is null
  and not exists (select 1 from report_signature sig where sig.report_id=s.report_id);

-- Upload/asset metadata was not part of 024's relational report model. Preserve
-- it at the existing project-level workspace locations before removing the last
-- runtime fallback to data.report. The old UI preferred report-local arrays.
update projects set data=jsonb_set(data,'{uploadedFiles}',data->'report'->'uploadedFiles')
where jsonb_typeof(data->'report'->'uploadedFiles')='array';
update projects set data=jsonb_set(data,'{dataAssets}',data->'report'->'dataAssets')
where jsonb_typeof(data->'report'->'dataAssets')='array';

drop view migration_025_legacy_sections;
