-- Add project JSON data used by Project Setup.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;