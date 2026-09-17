# Results API

Apply `db/migrations/026_results.sql` with the existing `node db/migrate.js` runner.
The public API and audit labels use **results**. `result_object` is an internal table name.

All routes require a JWT and the existing project/company access guard. Reads are
available to authenticated users with project access. Signed/final reports cannot
be mutated, following the existing report write policy.

Base path: `/api/projects/:projectId/results`

| Method | Suffix | Allowed roles | Behavior |
| --- | --- | --- | --- |
| GET | — | All authenticated roles | List results, including rejected results |
| POST | — | author, admin | Create a draft, version 1 |
| PATCH | `/:resultId` | author, admin | Edit fields and increment version |
| DELETE | `/:resultId` | author, admin | Delete a result, return 204; rejected results are retained (409) |
| POST | `/:resultId/decisions` | reviewer, approver, admin | Record accept/appendix/reject and increment version |

Create example:

```json
{
  "type": "table",
  "title": "Baseline demographics",
  "content": { "headers": ["Group", "N"], "rows": [["Treatment", 42]] },
  "description": "Number of participants in each treatment group.",
  "sourceFilename": "statistical-output.xlsx",
  "sourceLocation": "Sheet 2, rows 4-9",
  "originalReference": "Table 14.2.1",
  "titleOrigin": "ai",
  "descriptionOrigin": "human"
}
```

Required fields are `type`, `title`, `content` (a JSON object), and `sourceFilename`.
Content holds structured table/listing rows or figure data. Strings are data, not
trusted HTML. This endpoint does not parse uploaded files or generate descriptions.
The three provenance fields (`titleOrigin`, `sectionOrigin`, `descriptionOrigin`)
accept `ai` or `human` and default to `human`. Editing their corresponding values
without supplying provenance resets that field's origin to `human`.

`reportSectionId` is the section's relational UUID (`databaseId` in the report
response), not the UI section key such as `section-7`. It is nullable until the
result is placed in the main body. `sourceDocumentId` optionally links to an
SAP/TFL supporting document in the same project. `originalReference` retains the
source label independently of the assigned `reportNumber`.

Updates require `expectedVersion` plus the changed fields. Omitting a field keeps
its value; null clears only `reportSectionId`, `sourceDocumentId`, and
`originalReference`. Type, number, status, version and actor identity cannot be
overwritten through PATCH. Version mismatches return 409, so callers should reload.
The version is a revision counter, not a table of historical content snapshots.

To accept directly into the main body, assign a report section with PATCH. Then:

```json
{ "decision": "accept", "placement": "both", "expectedVersion": 2, "reason": "Reviewed against source" }
```

An accept decision uses `main` by default if a section is assigned, or leaves the
result `unplaced` so review can precede placement. Explicit `main`/`both` placement
requires a section. An author can place an accepted result later with PATCH.
An appendix decision sets
status `in-appendix` and placement `appendix`. A reject decision sets status
`rejected` and placement `unplaced`, preserving the content, source and last
decision. All decisions, including repeated ones, append audit evidence in the
same transaction using the JWT user and database identity. Audit failure rolls
back the change. Subsequent edits preserve the decision; their higher version
and audit entry identify the later revision.

Placement is one of `unplaced`, `main`, `appendix`, or `both`. A result is stored
once even when it belongs to both views. `GET ?view=main` and `GET ?view=appendix`
each include accepted results with placement `both`, using the same ID and
content. Drafts and rejected results are excluded from these publication views.
Optional `type` and `status` filters can be combined with a view filter.

Numbers are allocated separately per report and type (Table 1, Figure 1, Listing
1) on creation, using a transactional counter like migration 022. Deleting or
rejecting a result does not renumber other results or reuse its number, so gaps
are possible. Display order does not automatically change reference numbers.

`supporting_document` stores project-owned SAP/TFL files with filename, MIME type,
bytes, description and uploader snapshots, following `protocol_attachment` in
migration 022. Supporting-document upload/download endpoints are outside this
task's table-only scope. Results store their source filename/location and can
optionally reference this table; file ingestion remains separate from result CRUD.

Foreign keys enforce project/section/source ownership. Deleting a project removes
its results, report counters and supporting documents, including rejected results.
The existing append-only audit trail deliberately survives project deletion.

## Verification

```bash
npm run build
npm test -- --runInBand
# Apply migrations to a disposable PostgreSQL database first, then:
RESULTS_TEST_DATABASE_URL=postgresql://... npm test -- --runInBand results.integration.spec.ts
```

The integration suite tests HTTP validation/permissions and real database writes,
foreign keys, cascade deletion, version conflicts, shared placement and atomic
auditing. JWT authentication is stubbed with a trusted test identity; project and
role guards are real. Every test rolls back its fixtures. Without the explicit
test database URL, this suite is skipped and never connects to the app database.
