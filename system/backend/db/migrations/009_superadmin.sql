-- Add is_superadmin flag for platform owners
alter table users
  add column if not exists is_superadmin boolean not null default false;

-- Grant superadmin to the demo admin user
update users set is_superadmin = true
where email = 'admin@demo.local';
