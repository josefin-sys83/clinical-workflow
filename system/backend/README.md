# Clinical System Backend (NestJS + Postgres)

Production-oriented backend starter that matches the frontend API.

## Quick start

### 1) Configure Postgres

Set `DATABASE_URL` in `backend/.env` (see `.env.example`).

### 2) Run migrations

```bash
psql "$DATABASE_URL" -f db/migrations/001_init.sql
psql "$DATABASE_URL" -f db/migrations/002_document_artifacts.sql
psql "$DATABASE_URL" -f db/migrations/003_artifact_verification_and_roles.sql
psql "$DATABASE_URL" -f db/migrations/004_artifact_signatures.sql
- db/migrations/005_addendums.sql
```

### 3) Install + run

```bash
npm install
cp .env.example .env
npm run dev
```

API runs on `http://localhost:3001` and Swagger docs on `http://localhost:3001/docs`.

## Auth (JWT) + demo users

Login:

- `POST /api/auth/login`

Demo users (username/password):

- `admin/admin`
- `author/author`
- `reviewer/reviewer`
- `approver/approver`

Most endpoints require a Bearer token. Signing endpoints require `admin` or `approver`.

## Documents (artifacts)

Results CRUD, decisions, permissions and migration details are documented in
[Results API](src/modules/results/README.md).

- Finalize export: `POST /api/projects/:projectId/documents/:docType/finalize`
- Download: `GET /api/projects/:projectId/documents/artifacts/:artifactId`
- Verify hash: `GET /api/projects/:projectId/documents/artifacts/:artifactId/verify`

## APTIO 3.6 supporting protocol documents

The backend now supplies supporting document text to section analysis, associates
attachments with accepted Scope requirements, and lets a user link a current finding
to an attachment for a separate evidence check. The NestJS changes are implemented;
the corresponding Python AI changes are pending. The contracts below describe what
the backend sends and expects, not functionality already implemented in Python.

### Backend changes and storage

Apply [033_protocol_supporting_documents.sql](db/migrations/033_protocol_supporting_documents.sql)
after the existing migrations.

| Table | Added fields and purpose |
|---|---|
| `protocol_attachment` | `requirement_ids` stores directly assigned accepted Scope IDs; `extracted_text` and `extraction_error` cache document extraction. |
| `protocol_section_issue` | `attachment_id` links the finding to an attachment. Verification uses `verification_status`, `verification_request_id`, `verification_reason`, and `verified_at`. Link attribution uses `document_linked_by_user_id` and `document_linked_at`. |

Scope requirements live in project JSON. The backend validates requirement IDs
against accepted requirements in that project and validates attachment ownership.
There is no separate finding decision table. A finding can have one attachment link;
an attachment can support several findings.

Document links survive refresh and leaving the page while the current finding exists.
Editing/re-analysis and regeneration replace findings and discard their links; there
is no matching against previous findings. Direct requirement assignments on the
attachment remain available independently of those findings.

PDF/DOCX/TXT extraction uses the shared document text helper and existing extraction
engines. Extraction runs when text is requested and neither cached text nor an error
exists. Unreadable or unsupported files remain attached with an extraction error.
Their filenames alone are not evidence that a requirement is satisfied.

### Section analysis: browser request and backend-to-AI request

The browser calls the existing endpoint:

```http
POST /api/projects/:projectId/analyze-section
```

Example browser request:

```json
{
  "sectionId": "6",
  "sectionTitle": "Study Procedures & Assessments",
  "sectionContent": "The saved protocol section text..."
}
```

`sectionId` is required. The backend verifies that the submitted content matches the
saved section after sanitization, records analysis as `running`, and uses the saved
section title, content, and required elements. It enriches the request from project
data and calls `POST /v1/ai/analyze-section` with this shape:

```json
{
  "sectionTitle": "Study Procedures & Assessments",
  "sectionContent": "The saved protocol section text...",
  "targetMarkets": ["EU", "US"],
  "deviceCategory": "Medical device",
  "intendedUse": "The project's intended use...",
  "requiredElements": [
    {
      "id": "element-1",
      "name": "Assessment procedure",
      "reference": "ISO 14155",
      "status": "missing"
    }
  ],
  "amendmentContext": null,
  "crossSectionContext": [
    {
      "title": "Study Design",
      "content": "The saved content of another protocol section..."
    }
  ],
  "acceptedRequirements": "[{\"id\":\"standard-3\",\"title\":\"ISO 14155\",\"description\":\"Good Clinical Practice requirements\"}]",
  "synopsisExcerpt": "The project's source synopsis text...",
  "protocolDocuments": [
    {
      "id": "d6fba0cb-902a-4b85-b239-02e733caa195",
      "label": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
      "appendixNumber": 1,
      "filename": "ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
      "description": null,
      "requirementIds": ["standard-3"],
      "requirements": [
        {
          "id": "standard-3",
          "title": "ISO 14155",
          "description": "Good Clinical Practice requirements"
        }
      ],
      "extractedText": "The text extracted from this particular attachment...",
      "extractionError": null
    }
  ]
}
```

The changes to this request are:

- `protocolDocuments` now carries the attachments, their associated requirements,
  and actual extracted text. Each attachment's text stays inside its own object,
  alongside its ID and filename; the AI can identify which document supplied it.
- `crossSectionContext` now includes all other populated protocol sections rather
  than only Study Design and Study Rationale & Objectives.
- `acceptedRequirements` remains a JSON-encoded **string** of accepted requirement
  objects with `id`, `title`, and `description`; it is not a nested array in this field.

Each document's `requirementIds` combines direct assignments from
`protocol_attachment.requirement_ids` with requirement IDs from open findings linked
to that attachment. The backend removes duplicates and IDs that are no longer
accepted. `requirements` contains the matching full requirement objects.
`extractionError` is `null` on successful extraction; otherwise `extractedText` is
empty when no text is available and the error explains why.

The AI implementation must review the section, other sections, and readable supporting
documents before raising findings. Information missing everywhere can be a blocker;
information present elsewhere may require a cross-reference; sufficient attachment
evidence should identify the supporting document. The backend also runs deterministic
checks. A reference to a nonexistent appendix returns deterministic findings without
calling the AI, logged as `aiRequestSent: false`.

### Required section analysis response

The backend expects `issues` and `requiredElements`. Example AI response:

```json
{
  "issues": [
    {
      "id": "issue-1",
      "severity": "blocker",
      "subsection": "Assessment procedure",
      "description": "The required procedure is missing from the available evidence.",
      "source": "ISO 14155",
      "requirementId": "standard-3",
      "targetSection": "Study Procedures & Assessments",
      "remediation": "Provide the required procedure or supporting evidence.",
      "raisedBy": "AI Regulatory Review",
      "raisedDate": "2026-10-04",
      "status": "open",
      "dueDate": "7 days",
      "textQuote": null
    }
  ],
  "requiredElements": [
    {
      "id": "element-1",
      "name": "Assessment procedure",
      "reference": "ISO 14155",
      "status": "missing",
      "evidence": "No supporting procedure was identified in the supplied evidence."
    }
  ]
}
```

Every issue must include `requirementId`: an accepted requirement ID from this
project, or explicit `null` when no accepted requirement applies. Omitting the field
fails response validation. Allowed issue severities are `blocker`, `warning`,
`cross_reference`, `recommendation`, and `human_decision_required`. Required element
statuses are `complete`, `partial`, and `missing`.

The response schema is strict: use the fields shown above. Nullable issue fields
(`source`, `requirementId`, `targetSection`, `remediation`, `textQuote`) must still
be present. String fields other than `requirementId` must be nonblank when not null;
a non-null `requirementId` must match an accepted ID. The backend saves validated
findings on the section and records analysis as `succeeded`, or records `failed`
and an error when analysis fails.

### New attachment-to-requirement endpoint

```http
PATCH /api/projects/:projectId/documents/protocol/attachments/:attachmentId/requirements
```

```json
{
  "requirementIds": ["standard-3"]
}
```

This replaces the attachment's directly assigned requirement IDs and returns the
updated attachment list. An empty array clears direct assignments. The UI's
"Accepted requirements covered" checkboxes call this endpoint. Assignment describes
intended coverage; it does not itself verify the document's evidence.

The service requires project membership as Protocol Lead or Regulatory Affairs and
accepted IDs belonging to the project. Requirement associations derived from linked
open findings are still collected separately during analysis.

### New finding-to-attachment decision endpoint

```http
POST /api/projects/:projectId/protocol/sections/:sectionId/findings/:issueId/decision
```

`sectionId` is the section's API ID (`section_key` in the database). `issueId` is
the finding's API ID (`issue_key`), not the finding row's database UUID.
`attachmentId` is the attachment's UUID. The endpoint returns the saved **protocol**.

| Action | Request body | Backend behavior |
|---|---|---|
| Link or retry a document | `{ "action": "document", "attachmentId": "d6fba0cb-902a-4b85-b239-02e733caa195" }` | Validates an accepted requirement, original blocker/warning severity, and attachment ownership; saves the link as `checking` and starts verification after commit. |
| Remove a document link | `{ "action": "unlink" }` | Requires an existing link and clears its attachment and verification fields; leaves the finding's stored status unchanged. |
| Won't fix | `{ "action": "risk_accepted", "reason": "Decision rationale..." }` | Requires a nonblank reason, clears any document link, marks the finding `resolved`, and records the reason in the audit trail. |

**"Won't fix" in the UI calls `risk_accepted`; these are the same operation.**
Linking an attachment does not immediately resolve the finding. The committed response
has verification status `checking`; read `GET /api/projects/:projectId` again to obtain
the later result under `data.protocol.sections[].issues[].documentLink`.

The route allows `admin`, `author`, `reviewer`, and `approver` with project access.
Linking, unlinking, verification, and requirement assignment are audited. Attachment
and link mutations are locked while the protocol PDF is out for review/signature or
finalized. These writes share a project lock with workflow transitions.

### New backend-to-AI attachment verification request

After committing a document link, `verify(projectId, findingId, requestId)` loads the
finding, its accepted requirement, the containing section, and the chosen attachment.
It sends **objects containing the data**, not just IDs, to:

```http
POST /v1/ai/check-finding-document
```

Example request body:

```json
{
  "issue": {
    "id": "issue-1",
    "requirementId": "standard-3",
    "severity": "blocker",
    "description": "The required assessment procedure is missing.",
    "subsection": "Assessment procedure",
    "reference": "ISO 14155",
    "source": "ISO 14155",
    "targetSection": "Study Procedures & Assessments",
    "remediation": "Provide the required procedure or supporting evidence.",
    "textQuote": null
  },
  "requirement": {
    "id": "standard-3",
    "title": "ISO 14155",
    "description": "Good Clinical Practice requirements"
  },
  "section": {
    "id": "6",
    "title": "Study Procedures & Assessments",
    "content": "The saved section text..."
  },
  "document": {
    "id": "d6fba0cb-902a-4b85-b239-02e733caa195",
    "label": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
    "appendixNumber": 1,
    "filename": "ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
    "description": null,
    "requirementIds": ["standard-3"],
    "requirements": [
      {
        "id": "standard-3",
        "title": "ISO 14155",
        "description": "Good Clinical Practice requirements"
      }
    ],
    "extractedText": "The actual text extracted from this attachment...",
    "extractionError": null
  }
}
```

The top-level `requirement` is the specific requirement being checked for this
finding. `document.requirements` lists all accepted requirements associated with the
attachment. The check must assess whether that document addresses this finding in
the context of the requirement and section. Expected response:

```json
{
  "status": "satisfied",
  "reason": "The attachment provides the procedure required by this finding."
}
```

Allowed response statuses are `satisfied`, `warning`, and `blocker`, with a nonblank
`reason`. Insufficient evidence must return the appropriate severity and explanation.
Missing/unreadable evidence, HTTP failures, a missing endpoint, or an invalid response
produce saved verification status `failed`; the attachment remains linked and the UI
offers retry through the same `document` action.

Verification only updates `verification_status`, `verification_reason`, and
`verified_at`; it does not overwrite the original finding severity or its stored
`status`. The update requires the same finding row, request ID, and attachment ID,
so a late response cannot overwrite a newer link or restore a removed link.
A check already started may record its outcome after the document becomes locked;
a returned blocker prevents subsequent completion/signing transitions.

### Protocol section response: original severity and document assessment

When building the protocol response, `withFindingDocumentLink()` attaches the saved
link details to each finding. Example section excerpt after a blocker's supporting
document receives a `warning` assessment:

```json
{
  "id": "6",
  "title": "Study Procedures & Assessments",
  "content": "The saved section text...",
  "analysisStatus": "succeeded",
  "analysisError": null,
  "issues": [
    {
      "id": "issue-1",
      "requirementId": "standard-3",
      "description": "The required assessment procedure is missing.",
      "status": "open",
      "severity": "warning",
      "originalSeverity": "blocker",
      "documentLink": {
        "id": "c980a1f8-31a7-4d0f-a044-26c2760c9207",
        "attachmentId": "d6fba0cb-902a-4b85-b239-02e733caa195",
        "label": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
        "status": "warning",
        "reason": "The attachment provides partial evidence; a clarification remains.",
        "decidedByUserId": null,
        "decidedAt": "2026-10-04T10:00:00.000Z"
      }
    }
  ]
}
```

This is an excerpt of the protocol section response, not the strict AI analysis
response. `documentLink.id` is the finding row's database UUID; the issue's outer
`id` remains its API issue key. `decidedAt` is the time the document was linked.

The original severity stays in `protocol_section_issue.severity`. The document
assessment is separately stored in `verification_status`. When that assessment is
`warning` or `blocker`, the response's `severity` uses it, while `originalSeverity`
preserves the original assessment. Other verification states retain the original
severity in the response. These fields let the UI show the current assessment
without losing the baseline needed if evidence is removed.

| Link verification state | Returned severity | Counted as an open finding when stored status is `open`? | Blocks completion as a blocker? |
|---|---|---|---|
| No link | Original severity | Yes | If original severity is `blocker` |
| `checking` | Original severity | No | No |
| `satisfied` | Original severity | No | No |
| `warning` | `warning` | Yes | No |
| `blocker` | `blocker` | Yes | Yes |
| `failed` | Original severity | No | No |

These are the current UI/workflow rules. `checking` and `failed` are not successful
evidence checks even though they are currently excluded from open counts and blocker
gates. Unlinking or removing the attachment restores the original severity and open
finding behavior for a finding whose stored status is still `open`.

### Protocol generation: what changed

Full generation still calls `/v1/ai/generate-protocol` or its `/stream` variant with
`projectData`, `roles`, `synopsis`, and `scope`. It receives no attachment metadata or
extracted text. However, **the full generation request did change**:

- `scope.requirements` now contains an array of accepted `{ id, title, description }`
  objects instead of the previous formatted text string.
- `scope.findingRequirements` was added as a JSON-encoded string of those objects.
- Full and streamed generation requests are now logged.

Example of the relevant Scope fields:

```json
{
  "requirements": [
    {
      "id": "standard-3",
      "title": "ISO 14155",
      "description": "Good Clinical Practice requirements"
    }
  ],
  "findingRequirements": "[{\"id\":\"standard-3\",\"title\":\"ISO 14155\",\"description\":\"Good Clinical Practice requirements\"}]"
}
```

### Individual protocol section generation

`generateProtocolSection()` calls `POST /v1/ai/generate-protocol-section`. Its request
shape is unchanged by these supporting document changes. Example:

```json
{
  "sectionTitle": "Study Procedures & Assessments",
  "projectData": {
    "projectName": "Example investigation",
    "deviceCategory": "Medical device",
    "targetMarkets": ["EU", "US"]
  },
  "synopsis": "The project's source synopsis text...",
  "scope": {
    "intendedUse": "The project's intended use...",
    "requirements": "ISO 14155: Good Clinical Practice requirements"
  },
  "additionalFixes": "Clarify the assessment procedure."
}
```

The actual `projectData` and `scope` objects retain their other supplied fields.
`scope.requirements` is still formatted as text using `acceptedRequirementsText()`.
`additionalFixes` is optional and omitted from JSON when undefined. The response is
a JSON string containing the generated section content. This request contains no
attachment metadata or extracted text.

The full generation response shape (`protocolId` and generated sections) is also
unchanged by these supporting document changes.

### Request logs: full payload versus metadata

Requests are appended as timestamped JSON lines to `logs/generate-protocol.log` and
`logs/analyze-section.log`, relative to the backend process working directory.
Override paths with `GENERATE_PROTOCOL_LOG_FILE` and `ANALYZE_SECTION_LOG_FILE`.

In an analysis log entry:

- `request` is the backend-to-AI request, including
  `request.protocolDocuments[].extractedText`.
- The outer `protocolAttachments` is a metadata summary of the same attachments:
  IDs, labels, filenames, requirements, and extraction errors, without extracted text.
  It is for inspection of the log and is not an additional field sent to the AI.
- `aiRequestSent: false` means the backend returned deterministic appendix-reference
  findings without sending the logged candidate request to the AI.

Generation logs contain the actual generation request, including the accepted
requirement objects and their JSON-encoded representation.

### Python AI implementation still required

| Area | Current Python code | Required integration |
|---|---|---|
| Section analysis input | `AnalyzeSectionRequest` and the route/service chain do not consume `protocolDocuments`. | Add the document field and carry it through the route, AI service, protocol service, and analysis prompt, including extracted text and associations. |
| Section analysis output | `ProtocolReviewIssue` does not define `requirementId`; its strict model forbids extra fields. | Add required nullable `requirementId` and prompt instructions to use an accepted ID or `null`. |
| Attachment verification | `/v1/ai/check-finding-document` has no Python route. | Implement its request model, route, evidence comparison, and validated `status`/`reason` response. |
| Full generation context | Python receives the updated `scope` object, but the extra `findingRequirements` field is not explicitly consumed by its generation prompt. | Review the requirement array handling and consume the stable IDs where needed. |

Until the analysis output model is updated, responses containing findings omit
`requirementId` and fail backend validation with HTTP 502. The frontend displays
"The AI returned a response that could not be analyzed. Please retry." Other schema
failures can produce the same message. Until document input is wired through Python,
the backend sending extracted text does not mean the model receives it. Until the
verification endpoint exists, document links receive a `failed` check when that
endpoint is called.

## Signing (RSA-SHA256)

- Sign: `POST /api/projects/:projectId/documents/artifacts/:artifactId/sign`
- Signatures: `GET /api/projects/:projectId/documents/artifacts/:artifactId/signatures`
- Verify chain: `GET /api/projects/:projectId/documents/artifacts/:artifactId/verify-chain`

### Key management

For development, the backend can generate an ephemeral RSA keypair.

For stable signing keys, set:

- `SIGNING_PRIVATE_KEY_PEM`
- `SIGNING_PUBLIC_KEY_PEM`

in `backend/.env`.
