create table if not exists support_tickets (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  company_id uuid        references companies(id) on delete set null,
  category   text        not null
               check (category in ('Prenumeration', 'Tekniskt problem', 'Allmän fråga')),
  subject    text        not null,
  message    text        not null,
  status     text        not null default 'open'
               check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists ix_support_tickets_user    on support_tickets(user_id);
create index if not exists ix_support_tickets_company on support_tickets(company_id);
