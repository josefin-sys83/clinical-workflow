-- Extend companies with subscription, contact, and lifecycle fields
-- Run: node db/migrate.js

alter table companies
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended')),
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists subscription_plan text not null default 'starter'
    check (subscription_plan in ('starter', 'professional', 'enterprise')),
  add column if not exists subscription_start date,
  add column if not exists subscription_renewal date,
  add column if not exists last_active_at timestamptz;

-- Back-fill last_active_at for existing companies from their most recent project
update companies c
set last_active_at = (
  select max(updated_at) from projects p where p.company_id = c.id
)
where last_active_at is null;
