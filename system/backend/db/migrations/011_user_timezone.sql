-- Add timezone preference to users
alter table users
  add column if not exists timezone text not null default 'Europe/Stockholm';

-- Update support_tickets category constraint to English values
alter table support_tickets
  drop constraint if exists support_tickets_category_check;

alter table support_tickets
  add constraint support_tickets_category_check
  check (category in ('Subscription', 'Technical issue', 'General question'));
