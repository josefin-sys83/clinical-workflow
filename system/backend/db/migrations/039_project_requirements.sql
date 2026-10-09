-- Reuse the existing catalog and project junction. JSON is read only for this
-- one-time backfill; project-scoped assignment IDs and existing links survive.
alter table standards add column description text not null default '';
alter table standards add column category text;
update standards s set description=case when exists(select 1 from standard_rules sr where sr.standard_id=s.id and sr.always_applies)
  then 'Always required as a mandatory baseline for every project.'
  else 'This standard applies to the project based on its risk class, device category, and target markets.' end;

create table custom_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null check(length(btrim(title))>0),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique(project_id,id)
);

alter table project_standards drop constraint project_standards_pkey;
alter table project_standards alter column standard_id drop not null;
alter table project_standards add column id text;
alter table project_standards add column custom_requirement_id uuid;
alter table project_standards add column status text not null default 'suggested';
alter table project_standards add column justification text;
alter table project_standards add column source text not null default 'mandatory';
alter table project_standards add column is_mandatory boolean not null default false;
alter table project_standards add column is_applicable boolean not null default false;
alter table project_standards add column position integer not null default 0;
alter table project_standards add column updated_at timestamptz not null default now();
update project_standards ps set id='standard-'||standard_id,is_applicable=true,
  is_mandatory=exists(select 1 from standard_rules sr where sr.standard_id=ps.standard_id and sr.always_applies);
update project_standards set status='accepted' where is_mandatory;
alter table project_standards alter column id set not null;
alter table project_standards add primary key(project_id,id);
alter table project_standards add unique(project_id,standard_id);
alter table project_standards add unique(project_id,custom_requirement_id);
alter table project_standards add foreign key(project_id,custom_requirement_id) references custom_requirements(project_id,id) on delete restrict;
alter table project_standards add check(length(btrim(id))>0);
alter table project_standards add check((standard_id is not null)::int+(custom_requirement_id is not null)::int=1);
alter table project_standards add check(status in ('suggested','accepted','not-applicable'));
alter table project_standards add check(source in ('ai-suggested','user-defined','library','mandatory'));
alter table project_standards add check((source in ('user-defined','ai-suggested'))=(custom_requirement_id is not null));
alter table project_standards add check(not is_mandatory or (status='accepted' and source='mandatory'));
alter table project_standards add check(status<>'not-applicable' or coalesce(length(btrim(justification))>0,false));
create index project_standards_accepted on project_standards(project_id,position) where status='accepted';

-- Shared library definitions previously embedded in the Scope UI.
insert into standards(code,title,description,category) values
('lib-clinical-1','Good Clinical Practice (GCP) Compliance','ICH E6(R2) guidelines for clinical trial conduct, ethics, and data integrity','clinical'),
('lib-clinical-2','Informed Consent Process','Documentation and procedures for obtaining informed consent from study participants','clinical'),
('lib-clinical-3','Adverse Event Reporting','Procedures for identifying, documenting, and reporting adverse events and serious adverse events','clinical'),
('lib-clinical-4','Patient Inclusion/Exclusion Criteria','Clearly defined criteria for patient selection and enrollment','clinical'),
('lib-clinical-5','Clinical Endpoints Definition','Primary and secondary endpoints with clear success criteria and measurement protocols','clinical'),
('lib-clinical-6','Data Monitoring Committee (DMC)','Independent safety monitoring committee for high-risk studies','clinical'),
('lib-regulatory-1','21 CFR Part 11 Electronic Records','FDA requirements for electronic records and electronic signatures','regulatory'),
('lib-regulatory-2','EU MDR Clinical Evaluation','Clinical evaluation requirements under EU MDR 2017/745','regulatory'),
('lib-regulatory-3','ISO 13485 QMS Compliance','Quality management system requirements for medical devices','regulatory'),
('lib-regulatory-4','IRB/Ethics Committee Approval','Institutional Review Board or Ethics Committee review and approval requirements','regulatory'),
('lib-regulatory-5','Competent Authority Notifications','Regulatory authority notifications and reporting requirements','regulatory'),
('lib-regulatory-6','Post-Market Surveillance','Post-market clinical follow-up and surveillance requirements','regulatory'),
('lib-software-1','IEC 62304 Software Development','Medical device software lifecycle processes and documentation','software-ai'),
('lib-software-2','Cybersecurity Requirements','Device cybersecurity, data protection, and vulnerability management','software-ai'),
('lib-software-3','AI/ML Algorithm Validation','Validation and performance testing of AI/ML algorithms with clinical data','software-ai'),
('lib-software-4','Data Privacy & GDPR Compliance','Patient data privacy, GDPR compliance, and data handling procedures','software-ai'),
('lib-software-5','Software Version Control','Version management and configuration control for software updates','software-ai'),
('lib-software-6','Interoperability Standards','HL7, FHIR, DICOM, or other interoperability standards compliance','software-ai'),
('lib-risk-1','Usability Engineering (IEC 62366)','Usability validation and human factors engineering documentation','risk-safety'),
('lib-risk-2','Electromagnetic Compatibility (EMC)','IEC 60601-1-2 electromagnetic compatibility testing for medical electrical equipment','risk-safety'),
('lib-risk-3','Electrical Safety Testing','IEC 60601-1 electrical safety standards for medical electrical equipment','risk-safety'),
('lib-risk-4','Packaging & Sterilization Validation','ISO 11607 packaging validation and sterilization procedures','risk-safety'),
('lib-risk-5','Environmental & Durability Testing','Device performance under environmental conditions and durability validation','risk-safety'),
('lib-risk-6','Clinical Risk Benefit Analysis','Comprehensive risk-benefit evaluation for study approval','risk-safety'),
('lib-operational-1','Site Training & Qualification','Clinical site staff training and qualification procedures','operational'),
('lib-operational-2','Supply Chain & Device Management','Device inventory, distribution, and accountability procedures','operational'),
('lib-operational-3','Clinical Trial Insurance','Insurance coverage for clinical trial participants and investigators','operational'),
('lib-operational-4','Data Management Plan','Data collection, storage, backup, and quality assurance procedures','operational'),
('lib-operational-5','Study Monitoring Plan','Clinical site monitoring schedule and procedures','operational'),
('lib-operational-6','Document Retention Policy','Essential document retention and archival requirements','operational');

-- Match existing standard/library identities. Other suggestions are project-owned
-- definitions: identical provider IDs in two projects must remain independent.
create temporary table migrated_project_requirements on commit drop as
select p.id as project_id,entry.value as item,entry.ordinality::int as position,s.id as standard_id,
       case when s.id is null then gen_random_uuid() end as custom_id,
       exists(select 1 from standard_rules sr where sr.standard_id=s.id and sr.always_applies) as is_mandatory
from projects p cross join lateral jsonb_array_elements(
  case when jsonb_typeof(p.data#>'{scope,requirements}')='array' then p.data#>'{scope,requirements}' else '[]'::jsonb end
) with ordinality as entry(value,ordinality)
left join standards s on ('standard-'||s.id=entry.value->>'id' or (s.category is not null and s.code=entry.value->>'id'));
insert into custom_requirements(id,project_id,title,description)
select custom_id,project_id,item->>'title',coalesce(item->>'description','') from migrated_project_requirements where custom_id is not null;
insert into project_standards(project_id,id,standard_id,custom_requirement_id,status,justification,source,is_mandatory,is_applicable,position)
select m.project_id,m.item->>'id',m.standard_id,m.custom_id,
       case when m.is_mandatory then 'accepted' else coalesce(m.item->>'status','suggested') end,
       case when m.is_mandatory then null else m.item->>'justification' end,
       case when m.standard_id is not null then case when s.category is not null then 'library' else 'mandatory' end
            when m.item->>'source'='user-defined' then 'user-defined' else 'ai-suggested' end,
       m.is_mandatory,m.is_mandatory,m.position
from migrated_project_requirements m left join standards s on s.id=m.standard_id
on conflict(project_id,id) do update set status=excluded.status,justification=excluded.justification,
  source=excluded.source,is_mandatory=excluded.is_mandatory,position=excluded.position;

-- Every project receives real baseline assignments; reads never synthesize them.
insert into project_standards(project_id,id,standard_id,status,source,is_mandatory,is_applicable,position)
select p.id,'standard-'||s.id,s.id,'accepted','mandatory',true,true,0 from projects p cross join standards s
where exists(select 1 from standard_rules sr where sr.standard_id=s.id and sr.always_applies)
on conflict(project_id,standard_id) do update set status='accepted',source='mandatory',is_mandatory=true,is_applicable=true,justification=null;

-- Database ownership constraints cover writes from any TypeScript path.
-- NO ACTION checks after cascades complete, so deleting a project still removes
-- its documents/assignments. A direct assignment deletion with live links fails.
alter table protocol_section_issue add column project_id uuid references projects(id) on delete cascade;
update protocol_section_issue i set project_id=pr.project_id from protocol_section s join protocol pr on pr.id=s.protocol_id where i.section_id=s.id;
alter table protocol_section_issue alter column project_id set not null;
alter table protocol_section_issue add foreign key(project_id,requirement_id) references project_standards(project_id,id) on delete no action deferrable initially immediate;
alter table report_section_issue add column project_id uuid references projects(id) on delete cascade;
update report_section_issue i set project_id=r.project_id from report_section s join report r on r.id=s.report_id where i.section_id=s.id;
alter table report_section_issue alter column project_id set not null;
alter table report_section_issue add foreign key(project_id,requirement_id) references project_standards(project_id,id) on delete no action deferrable initially immediate;
create index protocol_issue_requirement on protocol_section_issue(project_id,requirement_id) where requirement_id is not null;
create index report_issue_requirement on report_section_issue(project_id,requirement_id) where requirement_id is not null;

create function set_finding_project() returns trigger language plpgsql as $$
declare owner_id uuid;
begin
  if TG_TABLE_NAME='protocol_section_issue' then
    select pr.project_id into owner_id from protocol_section s join protocol pr on pr.id=s.protocol_id where s.id=NEW.section_id;
  else
    select r.project_id into owner_id from report_section s join report r on r.id=s.report_id where s.id=NEW.section_id;
  end if;
  if NEW.project_id is not null and NEW.project_id<>owner_id then
    raise exception 'Finding belongs to a different project' using errcode='23503';
  end if;
  NEW.project_id=owner_id;
  return NEW;
end $$;
create trigger protocol_finding_project before insert or update of section_id,project_id on protocol_section_issue for each row execute function set_finding_project();
create trigger report_finding_project before insert or update of section_id,project_id on report_section_issue for each row execute function set_finding_project();

-- Attachment IDs remain an array in their existing API/storage contract, with
-- ownership and deletion constraints against the assignment table.
create function validate_attachment_requirements() returns trigger language plpgsql as $$
declare owner_id uuid;
begin
  select project_id into owner_id from protocol where id=NEW.protocol_id;
  perform id from projects where id=owner_id for update;
  if exists(select 1 from unnest(NEW.requirement_ids) as requested(id)
    where not exists(select 1 from project_standards pr where pr.project_id=owner_id and pr.id=requested.id)) then
    raise exception 'Attachment requirement does not belong to this project' using errcode='23503';
  end if;
  return NEW;
end $$;
create trigger attachment_requirement_ownership before insert or update of protocol_id,requirement_ids on protocol_attachment for each row execute function validate_attachment_requirements();
create function protect_attachment_requirement() returns trigger language plpgsql as $$
begin
  if exists(select 1 from projects where id=OLD.project_id) and exists(select 1 from protocol_attachment pa join protocol p on p.id=pa.protocol_id
    where p.project_id=OLD.project_id and OLD.id=any(pa.requirement_ids)) then
    raise exception 'Requirement is linked to a protocol attachment' using errcode='23503';
  end if;
  return OLD;
end $$;
create trigger linked_attachment_requirement before delete on project_standards for each row execute function protect_attachment_requirement();
do $$
begin
  if exists(select 1 from protocol_attachment pa join protocol p on p.id=pa.protocol_id
    cross join lateral unnest(pa.requirement_ids) as requested(id)
    where not exists(select 1 from project_standards pr where pr.project_id=p.project_id and pr.id=requested.id)) then
    raise exception 'Cannot migrate: an attachment references a missing project requirement';
  end if;
end $$;

update projects set data=data #- '{scope,requirements}' where data#>'{scope,requirements}' is not null;
alter table projects add constraint no_embedded_requirements check(not coalesce((data->'scope')?'requirements',false));

