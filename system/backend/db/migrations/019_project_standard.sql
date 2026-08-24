CREATE TABLE IF NOT EXISTS project_standards (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  standard_id integer NOT NULL REFERENCES standards(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, standard_id)
);
CREATE INDEX IF NOT EXISTS idx_project_standards_standard_id ON project_standards(standard_id);