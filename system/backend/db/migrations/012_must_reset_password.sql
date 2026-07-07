-- Force a password change on first login for accounts provisioned with a
-- system-generated temporary password (invited users, superadmin team members).
alter table users
  add column if not exists must_reset_password boolean not null default false;
