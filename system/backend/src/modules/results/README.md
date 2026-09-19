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
| PATCH | `/:resultId/section` | author, reviewer, approver, admin | Assign or clear the section without changing evidence or description |
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
trusted HTML. The create endpoint saves supplied content; file preview is separate.
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

The section endpoint accepts `{ "expectedVersion": 1, "reportSectionId": "section-uuid" }`
(or null to clear). A changed section sets its origin to human, increments the
version and appends `result.section-updated` audit evidence with the authenticated
actor. It preserves the description and its origin. Accepted results move to main
placement (preserving both if already selected); clearing their section unplaces
them. Repeating the current section is a no-op. Version conflicts and signed/final
report restrictions apply as for other writes.

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
migration 022. These files are never passed to the result parser. Upload and removal
use the same signed-report guard and atomic audit transaction as result writes.
Referenced supporting documents cannot be deleted. Downloads are project-scoped
and served as attachments.

The Study Results page is at `/projects/:projectId/workflow/results`, between
Protocol PDF and Report Authoring. It does not impose a new completion gate.
Creating the first result creates the report container and missing empty report
sections using the same definitions as report authoring. Existing section IDs and
content are preserved. Creating the container does not generate or approve a report.

Additional endpoints under the results base path:

| Method | Suffix | Behavior |
| --- | --- | --- |
| GET | `/workspace` | All results, supporting documents, existing section destinations, signed/final lock state |
| POST | `/parse-table` | Parse `{ "text": "..." }` as CSV or spreadsheet paste; does not persist |
| POST | `/preview` | Multipart `file`; returns `{ drafts, issues }` for review; does not persist |
| POST | `/supporting-documents` | Multipart `file`, `type` (`sap`/`tfl`), optional description |
| GET | `/supporting-documents/:documentId` | Download original bytes |
| DELETE | `/supporting-documents/:documentId` | Remove an unreferenced attachment and audit the removal |

Reads are available to authenticated users with project access; new POST/DELETE
endpoints require author/admin roles. Uploads are limited to 10 MB per file.
Result intake supports CSV, TSV, XLSX (candidate tables separated by empty rows or columns), and
PDF/DOCX/TXT text extraction into listings, plus PNG/JPEG figure images. It does not perform OCR, identify every
figure/table in a document, or generate AI suggestions. Imported drafts must be
reviewed and saved individually. Legacy `.xls`/`.doc` files must be converted to
`.xlsx`/`.docx` before result intake; they may still be attached as reference files.

Spreadsheet previews keep filename, sheet, physical row ranges and column ranges.
Structured `content.provenance` stores source ranges for the header and each data
row so splitting and merging retain the exact original references. CSV multiline
records include all occupied physical lines. Source information is read-only during
import review. It is retained in the saved result's JSON content.

The preview supports splitting after a chosen data row, optionally promoting the
next row to the second table's header. Merge stacks selected detections in preview
order, retains the first title/section, combines descriptions, and combines identical
headers. Different headers remain as data rows; shorter rows are padded with blank
cells. No split, merge or preview operation writes results to the database. Each
result is saved only using Save draft. Unsaved previews are lost on navigation.

Detection uses whitespace boundaries, not AI or visual/semantic inspection. Adjacent
tables without blank separators remain a single candidate for manual splitting.
The first row of each region is treated as its header. Single-row notes, formula
cells without cached results, and Excel errors are flagged in `issues`, while valid
regions remain available. A completely unreadable file returns a clear error. The
page retains import issues across refreshes and provides direct paste/manual-entry
buttons. Empty worksheets are ignored. Upload security uses dedicated
`RESULTS_UPLOAD_*` constants with the shared 10 MB limit.

Progress counts are derived from all saved result statuses on the page: accepted,
draft (needing review), in-appendix, and rejected. A result placed in both views is
counted once under its status. Counts update after successful decisions and refresh
on focus, explicit refresh, and every 30 seconds. Empty projects show zero counts.
Failed decisions never advance counts. The general list retains rejected results.

The primary page view reviews one result at a time, with an immediately saved
section dropdown, existing description, decisions, item count and previous/next
navigation. Successful decisions advance; after the final item the flat list opens
with updated counts. Failed saves keep the current result open. A list button is
available throughout review. Existing AI-origin descriptions are visually marked,
but this page does not generate suggestions or descriptions.

Tables, listings and figure images have a full-size dialog. PNG/JPEG images retain
their original bytes as `content.image = { dataUrl, alt, filename }`; the browser
can display them at their original size. Image intake previews before saving.
Authors can attach an image to an existing or manually entered figure. A figure
containing only rows or a text specification displays that content until an image
is attached; no chart is invented or extracted. Image validation permits embedded
PNG/JPEG data only, with a 10 MB limit. Remote URLs and SVG are not rendered.
Result placement records the destination; report text generation and assembly are
separate work and are not implemented by this review page.

Foreign keys enforce project/section/source ownership. Deleting a project removes
its results, report counters and supporting documents, including rejected results.
The existing append-only audit trail deliberately survives project deletion.

## Verification

```bash
npm run build
npm test -- --runInBand
# Apply migrations to a disposable PostgreSQL database first, then:
RESULTS_TEST_DATABASE_URL=postgresql://... npm test -- --runInBand results.integration.spec.ts
# From system/, with Vite running on port 5175:
node tests/check-result-imports.cjs
node tests/check-study-results-browser.cjs
```

The integration suite tests HTTP validation/permissions and real database writes,
foreign keys, cascade deletion, version conflicts, shared placement and atomic
auditing. JWT authentication is stubbed with a trusted test identity; project and
role guards are real. Every test rolls back its fixtures. Without the explicit
test database URL, this suite is skipped and never connects to the app database.
