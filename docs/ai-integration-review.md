# Synopsis, scope and protocol AI integration review

Scope: align the backend with the Python AI service through the protocol phase only. Report generation, report analysis, report statistics and protocol/report cross-consistency are deferred and retain their existing behavior.

Reviewed against `/home/ahmad/Downloads/readme_schema.md` and the actual Python implementation at `25acde3`, including the strict-schema and active-market protocol changes. At the start of the review, `BackendAdaptationtoAI`, local `sprint5`, and the locally recorded `origin/sprint5` pointed to that commit; `services/ai` matched both Sprint5 references. Production Python files are unchanged.

The active Nest integration is `system/backend/src/modules/ai/ai.service.ts` and the projects/protocols controllers; there is no tracked `backend.ts` monolith in this checkout.

## Retained backend fixes

- Protocol generation serializes only accepted scope requirements as text in `scope.requirements`, for section, full and streamed generation. Mandatory baselines are included through the existing database-backed `withAcceptedBaselineRequirements()` logic. Declined and suggested requirements are excluded.
- Protocol uses `buildProtocolGenerationContext()` to normalize FDA to US, resolve custom intended use, and override stale `projectData.intendedUse`. The shared `buildProjectGenerationContext()` retains its original behavior for reports.
- Protocol generation/analysis no longer substitute an EU market when none is selected. Synopsis analysis also normalizes the saved FDA market code to US.
- Protocol generation, section analysis and synopsis/protocol consistency use actual source synopsis text. Readiness findings, statuses and filenames are not substituted for the source.
- Response validation is enabled explicitly for synopsis, scope and protocol operations, including synopsis/protocol consistency. Malformed successful responses become HTTP 502, and upstream errors remain failures. Report operations keep their original response handling.
- Protocol structured responses preserve all five severities and nullable `source`, `targetSection`, `remediation`, and `textQuote`. Reviewed elements require `evidence`. Stream events and final protocol results are validated.
- Protocol finding metadata survives relational writes and reads. Migration `030_protocol_ai_issue_metadata.sql` adds the three nullable columns; it does not backfill old projects.
- Removed the unused `protocolAttachments` argument from the AI adapter. Python has no such request field; existing local attachment checks and request logging remain.

## Report scope boundary

Report controller and section-definition changes from the initial audit were reverted. Report synopsis handling, market inference/defaults, amendment selection, generation payloads and analysis behavior are unchanged.

The new protocol context adapter is used only by the protocol controller. Report generation/analysis, statistical consistency and protocol/report consistency do not opt into the new response validation. No report-specific schema or database change is included.

Report findings from the broader initial audit are deferred; this document does not claim they were fixed.

## Active request contracts

| Operation | Backend payload / Python consumption |
| --- | --- |
| `analyze-synopsis` | Extracted document `text` and normalized saved `targetMarkets`; both reach the prompt. |
| `derive-scope-from-synopsis` | Source `text`; Python derives device category/intended use. With no source, backend returns empty values and low confidence without calling AI. |
| `analyze-scope` | The browser's scope prompt is forwarded as `clientPrompt`. Python consumes it. The backend does not independently reconstruct this prompt from saved fields. |
| `generate-protocol-section` | Section title, saved project context, source synopsis, accepted-only requirements text and optional `additionalFixes`. The standalone adapter currently has no controller caller. |
| `generate-protocol`, `generate-protocol/stream` | Saved project/synopsis/scope context and roles. Python uses the context for nine sections but ignores roles. The backend consumes streamed progress events. |
| `generate-required-elements` | Section title, markets, device category and intended use; all are used. Python returns the validated array with `status: missing`. |
| `analyze-section` | Saved section title/content, markets, device category/intended use, persisted required elements, amendment context, cross-section context, accepted requirements text and source synopsis. Checklist elements come from the saved section even if the browser omits them. |
| `check-synopsis-consistency` | Source synopsis and saved protocol sections. Python selects relevant sections and compares them. |

## Remaining Python / protocol findings

- Protocol generation requires `roles` in its schema but explicitly ignores them. They remain for compatibility.
- Required-element generation has no accepted-requirements input and sets applicable regulations to `None specified`. Supporting those requirements requires a Python contract/prompt change. Protocol generation and analysis already consume them.
- Generic project/scope objects contain properties Python does not use, including risk class and miscellaneous scope UI metadata.
- Protocol analysis uses only the first 1,500 synopsis characters and 800 characters per cross-section. Backend supplies Study Design and Study Rationale & Objectives, excluding the section being reviewed. Synopsis analysis uses 15,000 source characters; scope derivation 8,000; synopsis consistency 4,000 synopsis characters and 600 per selected protocol section.
- The required-elements review prompt includes names/references but not supplied IDs, previous evidence/status or human-verification metadata. Stable checklist IDs need an AI-team prompt change.
- Python constructs prompt protocol IDs from the project name, while its generation response creates a random identifier.
- Synopsis, scope and consistency Python parsers still contain empty-result fallbacks after LLM parsing errors. Backend validation cannot distinguish these already-valid empty responses from successful empty results.
- Python protocol streaming maps exceptions other than availability/timeouts to HTTP 500 events. Full generation currently uses plain text; if structured operations are added there, Python should preserve their 502 status.
- Existing deterministic backend protocol rules still add regulatory-reference findings independently of accepted-only AI review. Their regulatory policy was not rewritten.
- A missing protocol appendix reference still returns a deterministic result without an AI call; the request log records `aiRequestSent: false`.
- Protocol UI types/counters/labels still need a separate update for the three new severities and new finding fields.
- Normal protocol request construction does not inject demo study content. The existing explicit development draft bypass can create persisted placeholder text, and Python itself has fallback name/identifier values.

## Verification and deployment

For the narrowed scope, all 31 existing report/context tests passed. TypeScript compilation and diff checks passed, with no remaining changes in report files. A fixture-backed runtime check confirmed that report payloads/response handling keep their original behavior while protocol context normalization, accepted requirements and strict response validation remain active. No live AI calls or database writes were made.

The protocol metadata migration has **not** been applied to the application database. Before using the updated protocol backend, configure the intended `DATABASE_URL` and run:

```bash
cd system/backend
node db/migrate.js
```

Without migration 030, writes to the new protocol issue columns will fail. No old-project data backfill is included.
