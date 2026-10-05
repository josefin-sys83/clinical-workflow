# Project Guidance

## Domain and architecture

- This product supports clinical investigation documentation for medical
  devices. A CIP describes the planned investigation; a CIR reports its results.
- The current main workflow covers project setup, synopsis, scope, protocol
  authoring/review/signing, study results, and report authoring/review/signing.
  This is context, not a permanently fixed workflow.
- Section counts, titles, subsections and workflow steps may evolve.
  Inspect current definitions and reuse existing sources of truth. Do not
  introduce fixed counts or duplicate section lists unnecessarily.
  Add or change sections when required by the agreed task, without building
  speculative extension mechanisms.
- Study Results handles tables, figures and listings. SAP means Statistical
  Analysis Plan; TFL means Tables, Figures and Listings specification.
- AI provides drafts and suggestions. Human review and approval remain essential.
  Never invent study data, recalculate results without authorization, or present
  unsupported clinical or regulatory conclusions as facts.
- Frontend: React/TypeScript in system/src.
- Backend: NestJS/PostgreSQL in system/backend.
- AI service: Python/FastAPI in services/ai, called through the backend.
- Preserve existing authorization, audit, versioning and document-lock behavior.

## Working rules

- Inspect repository instructions, the current branch and Git status before work.
  Preserve existing changes and data.
- Respect the team's architecture and parallel work. Follow system/CONTRIBUTING.md
  and applicable local instructions.
- Keep solutions simple. Avoid speculative abstractions, new frameworks and
  unrelated refactoring.
- Change or create only files needed for the agreed task and its verification.
  Avoid unrelated formatting, renaming, dependency updates and cleanup.
- Keep changes reviewable: one task per pull request. Identify shared interfaces
  and potential conflicts with teammates before changing them.
- Distinguish observed code behavior, documented intent and assumptions.
  Verify uncertain claims; state what could not be verified.
- Treat older notes and sprint documents as context, not proof of current behavior.
  Do not assume a feature is complete merely because related code exists.
- Use clinical-agent-lab/experiment-01 only as reference when relevant.
  Do not copy its code or instructions without assessing fit, and do not assume
  either project has better verification.
- Test each task with relevant normal, invalid-input and failure scenarios.
  Preserve human edits and existing data when AI calls or saves fail.
- Report what changed, why, what was tested and remaining limitations.
  Never claim tests passed unless they were run successfully.
- Do not perform database changes, commits, pushes or destructive operations
  without explicit authorization.
- Communicate briefly and clearly in Swedish. Write code, documentation and
  code comments in English.
