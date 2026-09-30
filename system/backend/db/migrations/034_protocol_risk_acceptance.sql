-- A reviewer's decision to accept the risk of an open finding, with a reason.
-- Findings are recreated each time a section is analysed, so a decision is matched
-- back to its finding by section and description (the rule "won't fix" also uses).
-- Withdrawn decisions are kept with revoked_* set, never deleted.
create table if not exists protocol_risk_acceptance (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references protocol_section(id) on delete cascade,
  finding_description text not null,
  reason text not null check (btrim(reason) <> ''),
  accepted_by_user_id uuid references users(id) on delete set null,
  accepted_by_name text not null,
  accepted_at timestamptz not null default now(),
  revoked_by_user_id uuid references users(id) on delete set null,
  revoked_by_name text,
  revoked_at timestamptz
);

create unique index if not exists ux_protocol_risk_acceptance_active
  on protocol_risk_acceptance(section_id, finding_description) where revoked_at is null;
