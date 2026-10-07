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
to an attachment for a separate evidence check. Section analysis and attachment
verification follow the SCRUM-82 protocol AI contract. The examples below describe
the backend-to-AI payloads; they do not establish the outcome of a live AI review.

### Backend changes and storage

Apply [033_protocol_supporting_documents.sql](db/migrations/033_protocol_supporting_documents.sql)
after the existing migrations. Apply
[037_protocol_wont_fix_reason.sql](db/migrations/037_protocol_wont_fix_reason.sql)
before running the updated backend to persist authoring "won't fix" reasons.

| Table | Added fields and purpose |
|---|---|
| `protocol_attachment` | `requirement_ids` stores directly assigned accepted Scope IDs; `extracted_text` and `extraction_error` cache document extraction. |
| `protocol_section_issue` | `attachment_id` links the finding to an attachment. Verification uses `verification_status`, `verification_request_id`, `verification_reason`, and `verified_at`. Link attribution uses `document_linked_by_user_id` and `document_linked_at`. |

Scope requirements live in project JSON. The backend validates requirement IDs
against accepted requirements in that project and validates attachment ownership.
There is no separate finding decision table. A finding can have one attachment link;
an attachment can support several findings.

Finding IDs, quotes, document links, verification results, and human decisions survive
section edits, re-analysis, refresh, and analysis failures. Re-analysis removes an
unanswered finding only after an explicit AI assessment that it is fixed. Full protocol
regeneration still replaces the generated findings. Direct requirement assignments on
attachments remain available independently of those findings.

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
  "projectId": "project-1",
  "sectionTitle": "Study Procedures & Assessments",
  "sectionContent": "The saved protocol section text...",
  "targetMarkets": ["EU", "US"],
  "deviceCategory": "Medical device",
  "intendedUse": "The project's intended use...",
  "requiredElements": [
    {
      "id": "element-1",
      "name": "Assessment procedure",
      "reference": "ISO 14155"
    }
  ],
  "amendmentContext": null,
  "crossSectionContext": [
    {
      "title": "Study Design",
      "content": "The saved content of another protocol section..."
    }
  ],
  "acceptedRequirements": [
    {
      "name": "ISO 14155",
      "description": "Good Clinical Practice requirements"
    }
  ],
  "protocolAttachments": [
    {
      "name": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
      "content": "The text extracted from this particular attachment...",
      "requirement": "ISO 14155"
    }
  ],
  "previousDecisions": [],
  "linkedIssues": []
}
```

Only `id`, `name`, and `reference` from each required element are sent; saved status
and evidence stay in the backend. Amendment context includes `number`, `title`,
`reason`, and `description`, without snapshots or workflow metadata.
`crossSectionContext` includes the title and content of every other populated section.

`acceptedRequirements` is an array of `name`/`description` objects for accepted Scope
requirements. Issue IDs are supplied in the analysis history metadata below;
requirement IDs stay in the backend. `synopsisExcerpt`
is omitted because the AI requirement-analysis prompts do not use it.

Each attachment's requirement links combine direct assignments with accepted
requirement IDs from open findings linked to that attachment. For section analysis,
a readable attachment is sent once per linked requirement, using that requirement's
name in `protocolAttachments[].requirement`. Unlinked or unreadable attachments are
omitted from the AI payload; their metadata and extraction errors remain available
in the backend. Extracted evidence contains names, content, and requirement names;
linked-issue metadata is sent separately even when extraction fails.
Each attachment's content has a 24,000-character AI service limit. HTTP 413 is
propagated rather than silently truncating the evidence.

The AI implementation must review the section, other sections, and readable supporting
documents before raising findings. Information missing everywhere can be a blocker;
information present elsewhere may require a cross-reference; sufficient attachment
evidence should identify the supporting document. The backend also runs deterministic
checks. A reference to a nonexistent appendix returns deterministic findings without
calling the AI, logged as `aiRequestSent: false`.

### Required section analysis response

The backend expects `issues`, `requiredElements`, and `satisfiedRequirements`.
Example AI response:

```json
{
  "issues": [
    {
      "severity": "blocker",
      "subsection": "Assessment procedure",
      "description": "The required procedure is missing from the available evidence.",
      "requirement": "ISO 14155",
      "source": "ISO 14155",
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
  ],
  "satisfiedRequirements": []
}
```

The AI response includes `requirement`: the exact accepted requirement name, or
`null` for a non-requirement finding. The backend maps this name to an internal
`requirementId` only when it exactly matches a unique accepted requirement title;
otherwise the finding remains unlinked. `source` is display context and is not used
to associate requirements.
Legacy explicit IDs are still validated against accepted requirements.
New findings omit `id`; the backend assigns a permanent UUID when saving them.
Updated previous findings include `id` equal to the saved ID provided in the request.
Legacy response-generated IDs on new findings are accepted but ignored.
Allowed issue severities are `blocker`, `warning`, `cross_reference`,
`recommendation`, and `human_decision_required`. Required element statuses are
`complete`, `partial`, and `missing`.

Each satisfied requirement contains `name`, `status: "satisfied"`, `source`
(`section` or `attachment`), nullable `sourceName`, and `evidence`. The response
schema is strict. Nullable issue fields (`requirement`, `source`, `targetSection`, `remediation`,
`textQuote`) must be present; non-null strings must be nonblank. The backend saves
validated findings on the section and records analysis as `succeeded`, or records
`failed` and an error when analysis fails.

### Analysis history contract: handoff to the AI team

The backend sends these two additional arrays to `POST /v1/ai/analyze-section`:

```json
{
  "previousDecisions": [
    {
      "issue_id": "finding-unanswered",
      "requirement": "ISO 14155",
      "severity": "warning",
      "issue": "The assessment schedule is missing.",
      "decision": "UNANSWERED",
      "reason": null,
      "textQuote": "Assessments will be performed."
    },
    {
      "issue_id": "finding-dismissed",
      "requirement": null,
      "severity": "recommendation",
      "issue": "Explain the optional exploratory endpoint.",
      "decision": "WONT_FIX",
      "reason": "This endpoint is outside the agreed study scope.",
      "textQuote": null
    }
  ],
  "linkedIssues": [
    {
      "issue_id": "finding-linked",
      "requirement": "PMCF Plan",
      "issue": "The PMCF plan is missing.",
      "supportingDocuments": ["Appendix 4 - PMCF Plan.docx"]
    }
  ]
}
```

`previousDecisions` contains every saved unlinked finding, including all five severity
types. `issue_id` is the existing finding's stable ID to echo unchanged. `WONT_FIX` means
the human decision must be respected; do not raise that concern again or assess it
as fixed. `UNANSWERED` means reassess that concern against the current evidence.
The backend supplies authoring "won't fix" reasons and persisted review risk-acceptance
reasons. Historical authoring decisions without a stored reason use `null`.

`linkedIssues` is separate from `previousDecisions`. For every entry, exclude its
**entire requirement in this section** from generating new findings or assessing
old findings. This applies regardless of document verification outcome or extraction
availability. The separate document-verification flow owns that requirement's evidence
assessment. Linking alone establishes this exclusion; direct attachment requirement
assignments do not. Removing the issue's document link restores normal analysis of
the requirement. References are metadata, not evidence of document sufficiency.
`supportingDocuments` is a string array of linked document labels. The current storage
supports one attachment link per finding, so the array currently contains that
attachment's label. Attachment IDs stay in the backend and are not sent in this
metadata. The top-level `protocolAttachments` continues to contain readable document
objects with `name`, `content`, and `requirement`.
`requirement` is the accepted
requirement name; the backend excludes linked requirements using their stored IDs.
Findings without document
links are sent in `previousDecisions` instead.

The AI team must extend request models, all relevant analysis prompts/stages, and the
structured response schema. Return one assessment for each eligible `UNANSWERED`
finding in the additional response array:

```json
{
  "issues": [],
  "requiredElements": [],
  "satisfiedRequirements": [],
  "previousIssueAssessments": [
    {
      "issue_id": "finding-unanswered",
      "outcome": "fixed",
      "reason": "The current section now specifies the assessment schedule.",
      "textQuote": null
    }
  ]
}
```

Every assessment field is required. `outcome` is `fixed`, `not_fixed`, or
`not_evaluated`; `reason` must explain the assessment and be nonblank.
For `not_fixed`, either omit the corresponding entry from `issues` to retain the
saved finding, or return its updated details in `issues` with `id` equal to the
previous finding's `issue_id`. Preserve that ID throughout the AI service; do not
replace an existing finding's ID with a response-local number. Each update must be
unique and have the same requirement as the previous finding. `textQuote` may supply
a current exact quote for the highlight; otherwise use `null`. `fixed` and
`not_evaluated` assessments must not have corresponding entries in `issues`.
New, unrelated findings use `issues` without an `id`; the backend assigns their IDs.
Only updates to previous findings echo a saved `id`. The AI team must stop generating
response-local IDs for new findings. Do not repeat a concern marked
fixed, invent previous references, or return duplicate assessments.

The backend reconciles assessments against the current saved findings under the
project lock. Explicitly fixed unanswered findings leave the active list; their full
snapshot and resolution reason are retained in the analysis audit event. Unresolved
matches retain their saved finding ID and original attribution, preserving highlights.
Existing links and human decisions made during the AI call take precedence over its
response. The browser receives the reconciled saved findings, rather than the raw AI
issue list, and keeps existing findings visible during analysis and on failures.

During rollout, `previousIssueAssessments` is optional so existing AI responses still
work. Missing assessments, `not_evaluated`, and failures preserve previous findings;
an absent issue in `issues` alone never deletes it. The backend already filters new
findings for linked requirements, but semantic reassessment and suppression of
reworded "won't fix" concerns require the AI team's changes. No Python files are
changed in this implementation.

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

After committing a document link, `verify(projectId, findingId, requestId, actor)` loads the
finding, its accepted requirement, and the chosen attachment. Both the link and
verification audit events use the authenticated user who initiated the link;
the verification message identifies the assessment as an AI check. The AI adapter sends
only the finding text, requirement name, and selected attachment evidence to:

```http
POST /v1/ai/check-protocol-attachments
```

Example request body:

```json
{
  "issue": "The required assessment procedure is missing.",
  "requirement": "ISO 14155",
  "attachments": [
    {
      "name": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
      "content": "The actual text extracted from this attachment..."
    }
  ]
}
```

Expected AI response:

```json
{
  "outcome": "resolves",
  "explanation": "The attachment provides the procedure required by this finding.",
  "sources": [
    {
      "document": "Appendix 1 - ISO_14155_Supporting_Document_ECG-ACQ-SYN-001.docx",
      "evidence": "The assessment procedure is defined in the attachment."
    }
  ]
}
```

The adapter maps `resolves` to existing verification status `satisfied`,
`partially_resolves` to `warning`, and `does_not_resolve` to the finding's original
severity, so a document never escalates a warning. `explanation`
becomes the stored verification reason. The same 24,000-character content limit
applies. Missing/unreadable evidence, HTTP failures, or invalid responses produce
saved verification status `failed`; the attachment remains linked and the UI offers
retry through the same `document` action.

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
  `request.projectId`, `request.protocolAttachments[].content`,
  `request.previousDecisions`, and `request.linkedIssues`.
- The outer `protocolAttachments` is a metadata summary of the same attachments:
  IDs, labels, filenames, requirements, and extraction errors, without extracted text.
  It is for inspection of the log and is not an additional field sent to the AI.
- `aiRequestSent: false` means the backend returned deterministic appendix-reference
  findings without sending the logged candidate request to the AI.

Generation logs contain the actual generation request, including the accepted
requirement objects and their JSON-encoded representation.
Both files contain outgoing requests, not AI responses. Analysis history is sent
and logged for section analysis; full generation uses its own request contract.

### Protocol AI integration boundaries

Analysis accepts the three response arrays defined by SCRUM-82, without requiring
Python to return internal requirement IDs. The attachment verification endpoint
only evaluates evidence; the backend retains responsibility for link state,
validation, document locks, and audit records.

Section analysis now sends `previousDecisions` and `linkedIssues`; the AI team's
required request, prompt, and response changes are described in the analysis history
handoff above. Full protocol generation uses its separate existing contract; its
`scope.findingRequirements` field is not explicitly consumed by the current Python
generation prompt.

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
