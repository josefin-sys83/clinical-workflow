-- Add contact phone and billing address fields to companies
alter table companies
  add column if not exists contact_phone        text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_city          text,
  add column if not exists billing_postal_code   text,
  add column if not exists billing_country       text;
