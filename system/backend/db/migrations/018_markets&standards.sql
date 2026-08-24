BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS device_category text
  CHECK (device_category IN (
    'samd','ai-ml','simd','ivd','aimd','implantable',
    'non-implantable','active','combination','accessory'
  ));

CREATE TABLE markets (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  framework text not null,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE standards (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_markets (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  market_id smallint NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_project_markets_market_id ON project_markets(market_id);

-- One row per trigger condition, evaluated against a project's stored risk/device_category/
-- markets (see ProjectsService.getRequirements()). NULL/empty array on a condition column
-- means "no constraint on that axis". always_applies = baseline standards required regardless.
CREATE TABLE IF NOT EXISTS standard_rules (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  standard_id integer NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  requires_market boolean NOT NULL DEFAULT false,
  market_codes text[],
  risk_classes text[],
  device_categories text[],
  always_applies boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_standard_rules_standard_id ON standard_rules(standard_id);

INSERT INTO markets (code, name,framework) VALUES
  ('EU', 'European Union (EU MDR)','EU MDR 2017/745'),
  ('US', 'United States (FDA)','FDA IDE / 21 CFR 812'),
  ('UK', 'United Kingdom (MHRA)','UK MDR / MHRA'),
  ('Canada', 'Canada (Health Canada)','Health Canada - SOR/98-282'),
  ('Australia', 'Australia (TGA)','TGA - Therapeutic Goods Regulations'),
  ('Japan', 'Japan (PMDA)','PMDA - Pharmaceutical and Medical Device Act'),
  ('China', 'China (NMPA)','NMPA - Medical Device Regulations')
ON CONFLICT (code) DO NOTHING;

INSERT INTO standards (code, title) VALUES
  ('ISO-14971', 'ISO 14971 (Risk Management)'),
  ('ISO-13485', 'ISO 13485 (QMS)'),
  ('ISO-14155', 'ISO 14155 (Good Clinical Practice (GCP))'),
  ('FDA-IDE-21CFR812', 'FDA IDE (21 CFR 812)'),
  ('ISO-10993', 'ISO 10993 (Biocompatibility)'),
  ('IEC-62304', 'IEC 62304 (Software Lifecycle)'),
  ('IEC-60601-1', 'IEC 60601-1 (General Safety)'),
  ('IEC-62366-1', 'IEC 62366-1 (Usability)')
ON CONFLICT (code) DO NOTHING;

-- Always — mandatory baseline for every project.
INSERT INTO standard_rules (standard_id, always_applies)
SELECT id, true FROM standards WHERE code IN ('ISO-14971', 'ISO-13485');

-- Target market includes the US + Risk Class IIb or III.
INSERT INTO standard_rules (standard_id, requires_market, market_codes, risk_classes)
SELECT id, true, ARRAY['US'], ARRAY['IIb','III']
FROM standards WHERE code = 'FDA-IDE-21CFR812';

-- Device Category is implantable (AIMD / Implantable).
INSERT INTO standard_rules (standard_id, device_categories)
SELECT id, ARRAY['aimd','implantable']
FROM standards WHERE code = 'ISO-10993';

-- Device Category is software-driven (AIMD / SaMD / SiMD / AI-ML).
INSERT INTO standard_rules (standard_id, device_categories)
SELECT id, ARRAY['aimd','samd','simd','ai-ml']
FROM standards WHERE code = 'IEC-62304';

-- Device Category is Active or AIMD.
INSERT INTO standard_rules (standard_id, device_categories)
SELECT id, ARRAY['active','aimd']
FROM standards WHERE code = 'IEC-60601-1';

-- Device Category is Active / AIMD / SaMD / SiMD / AI-ML / Implantable.
INSERT INTO standard_rules (standard_id, device_categories)
SELECT id, ARRAY['active','aimd','samd','simd','ai-ml','implantable']
FROM standards WHERE code = 'IEC-62366-1';


INSERT INTO standard_rules (standard_id,requires_market, market_codes )
SELECT id, true, ARRAY['EU']
FROM standards WHERE code = 'ISO-14155';

COMMIT;