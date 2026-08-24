-- Restores the FK constraints from projects(id) that 001_init.sql / 002_document_artifacts.sql /
-- 005_addendums.sql originally declared with "on delete cascade", but which no longer exist in
-- the live schema (dropped, presumably, when projects.id was changed from uuid to text outside
-- of a tracked migration). Without these, a deleted project's audit/artifact/addendum rows
-- survive the delete as orphans and can be silently inherited by a new project that reuses the
-- same id — this migration closes that gap.
--
-- audit_event has one pre-existing row with project_id='test-project' that matches no real
-- project (leftover dev data). It is left untouched: the constraint is added NOT VALID so it
-- doesn't require rewriting/validating existing rows, while still being fully enforced for every
-- future insert, update, and delete from this point on.

-- alter table audit_event
--   add constraint audit_event_project_id_fkey
--   foreign key (project_id) references projects(id) on delete cascade
--   not valid;

-- alter table workflow_step_state
--   add constraint workflow_step_state_project_id_fkey
--   foreign key (project_id) references projects(id) on delete cascade;

-- alter table document_artifact
--   add constraint document_artifact_project_id_fkey
--   foreign key (project_id) references projects(id) on delete cascade;

-- alter table document_addendum
--   add constraint document_addendum_project_id_fkey
--   foreign key (project_id) references projects(id) on delete cascade;

--this checks if the constaraints where there in the first place then exqts them 

-- Restore the FK constraints from projects(id) if they do not already exist.
-- Safe to run against databases where some or all of these constraints
-- have already been restored.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_event_project_id_fkey'
      AND conrelid = 'audit_event'::regclass
  ) THEN
    ALTER TABLE audit_event
      ADD CONSTRAINT audit_event_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_step_state_project_id_fkey'
      AND conrelid = 'workflow_step_state'::regclass
  ) THEN
    ALTER TABLE workflow_step_state
      ADD CONSTRAINT workflow_step_state_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_artifact_project_id_fkey'
      AND conrelid = 'document_artifact'::regclass
  ) THEN
    ALTER TABLE document_artifact
      ADD CONSTRAINT document_artifact_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_addendum_project_id_fkey'
      AND conrelid = 'document_addendum'::regclass
  ) THEN
    ALTER TABLE document_addendum
      ADD CONSTRAINT document_addendum_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE;
  END IF;
END
$$;
