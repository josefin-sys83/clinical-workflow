BEGIN;

-- Add both columns as NOT NULL (safe because the table is empty)
ALTER TABLE projects 
ADD COLUMN project_number TEXT NOT NULL,
ADD COLUMN risk TEXT NOT NULL;

-- Add the unique constraint for project_number
ALTER TABLE projects 
ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);

-- Add the check constraint for risk values
ALTER TABLE projects 
ADD CONSTRAINT projects_risk_check 
CHECK (risk IN ('I', 'IIa', 'IIb', 'III'));

COMMIT;