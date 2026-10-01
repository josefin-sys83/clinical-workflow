import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Clipboard,
  Grid2X2,
  Upload,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useCurrentUser } from '@/shared/auth/CurrentUserContext';
import { ApiError, apiErrorMessage } from '@/shared/api/http';
import {
  createResult,
  assignResultSection,
  decideResult,
  downloadSupportingDocument,
  getResultsWorkspace,
  previewResultUpload,
  removeSupportingDocument,
  updateResult,
  uploadSupportingDocument,
  type ResultInput,
  type ResultsWorkspace,
  type StudyResult,
  type SupportingDocument,
} from '@/shared/api/results';
import { ProtocolAttachmentsSection } from '@/modules/Makeprotokoll/components/protocol-attachments-section';
import { AuditTrailModal } from '@/shared/components/AuditTrailModal';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { ResultEditor, buttonClass, inputClass } from './ResultEditor';
import { ResultViewer } from './ResultViewer';
import { ImportReview } from './ImportReview';
import type { ImportDraft } from './import-drafts';
import { statusLabels, summarizeResults } from './model';

const statusStyles = {
  draft: 'bg-amber-50 text-amber-800',
  accepted: 'bg-emerald-50 text-emerald-800',
  'in-appendix': 'bg-blue-50 text-blue-800',
  rejected: 'bg-red-50 text-red-800',
};
type Draft = ImportDraft;

export default function StudyResultsPage() {
  const { projectId = '' } = useParams();
  const { user } = useCurrentUser();
  const [workspace, setWorkspace] = useState<ResultsWorkspace | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<'review' | 'list'>('review');
  const [focusDestination, setFocusDestination] = useState<
    'review' | 'list' | null
  >(null);
  const reviewRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<'manual' | 'paste' | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<StudyResult | null>(null);
  const [reason, setReason] = useState('');
  const [both, setBoth] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestNumber = useRef(0);
  const mutationBusy = useRef(false);
  const results = workspace?.results ?? [];
  const selected =
    results.find((result) => result.id === selectedId) ?? results[0];
  const index = selected
    ? results.findIndex((result) => result.id === selected.id)
    : -1;
  const summary = summarizeResults(results);
  const canEdit =
    !!workspace &&
    !workspace.locked &&
    !!user?.roles.some((role) => ['author', 'admin'].includes(role));
  const canDecide =
    !!workspace &&
    !workspace.locked &&
    !!user?.roles.some((role) =>
      ['reviewer', 'approver', 'admin'].includes(role),
    );

  const refresh = useCallback(async () => {
    const request = ++requestNumber.current;
    setRefreshing(true);
    try {
      const next = await getResultsWorkspace(projectId);
      if (request === requestNumber.current) {
        setWorkspace(next);
        setError('');
      }
    } catch (err) {
      if (request === requestNumber.current)
        setError(
          apiErrorMessage(err, 'Could not refresh study results. Try again.'),
        );
    } finally {
      if (request === requestNumber.current) setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
    const reload = () => {
      if (!mutationBusy.current) void refresh();
    };
    const interval = window.setInterval(reload, 30000);
    window.addEventListener('results:refresh', reload);
    window.addEventListener('focus', reload);
    return () => {
      requestNumber.current++;
      window.clearInterval(interval);
      window.removeEventListener('results:refresh', reload);
      window.removeEventListener('focus', reload);
    };
  }, [refresh]);

  useEffect(() => {
    setReason('');
  }, [selected?.id]);

  useEffect(() => {
    setBoth(selected?.placement === 'both');
  }, [selected?.id, selected?.placement]);

  useEffect(() => {
    if (!focusDestination) return;
    const target =
      focusDestination === 'review' ? reviewRef.current : listRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start' });
    setFocusDestination(null);
  }, [focusDestination, view, selected?.id]);

  function openReview(id: string) {
    setEditing(null);
    setSelectedId(id);
    setView('review');
    setFocusDestination('review');
  }

  function openList() {
    setEditing(null);
    setView('list');
    setFocusDestination('list');
  }

  async function mutate(action: () => Promise<void>) {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    requestNumber.current++;
    setRefreshing(false);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiError && [403, 409].includes(err.status))
        await refresh();
      setError(
        apiErrorMessage(
          err,
          'The change could not be saved. Please try again.',
        ),
      );
      throw err;
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }

  async function saveDraft(input: ResultInput, draftKey?: string) {
    await mutate(async () => {
      const saved = await createResult(projectId, input);
      setWorkspace(
        (previous) =>
          previous && { ...previous, results: [...previous.results, saved] },
      );
      setSelectedId(saved.id);
      setView('review');
      if (draftKey)
        setDrafts((previous) =>
          previous.filter((draft) => draft.key !== draftKey),
        );
      else setMode(null);
      setNotice('Draft saved. It is ready for review.');
      await refresh();
    });
  }

  async function importFiles(files: File[]) {
    await mutate(async () => {
      const failures: string[] = [];
      let imported = 0;
      for (const file of files) {
        try {
          if (file.size > 10 * 1024 * 1024)
            throw new Error('Maximum file size is 10 MB');
          const { drafts: inputs, issues } = await previewResultUpload(
            projectId,
            file,
          );
          failures.push(...issues.map((issue) => `${file.name}: ${issue}`));
          setDrafts((previous) => [
            ...previous,
            ...inputs.map((input) => ({ key: crypto.randomUUID(), input })),
          ]);
          imported += inputs.length;
        } catch (err) {
          failures.push(
            `${file.name}: ${apiErrorMessage(err, err instanceof Error ? err.message : 'Could not import')}`,
          );
        }
      }
      setImportIssues(failures);
      if (imported)
        setNotice(
          `${imported} draft${imported === 1 ? '' : 's'} imported. Review each draft below and save it to add it to the project.`,
        );
    }).catch(() => {});
  }

  async function decide(decision: 'accept' | 'appendix' | 'reject') {
    if (!selected) return;
    const nextId = results[index + 1]?.id;
    await mutate(async () => {
      const saved = await decideResult(
        projectId,
        selected,
        decision,
        reason,
        both,
      );
      setWorkspace(
        (previous) =>
          previous && {
            ...previous,
            results: previous.results.map((result) =>
              result.id === saved.id ? saved : result,
            ),
          },
      );
      setNotice(
        `${saved.title}: ${statusLabels[saved.status]}. Decision recorded in the audit trail.`,
      );
      await refresh();
      if (nextId) openReview(nextId);
      else openList();
    }).catch(() => {});
  }

  async function changeSection(sectionId: string) {
    if (!selected) return;
    await mutate(async () => {
      const saved = await assignResultSection(
        projectId,
        selected,
        sectionId || null,
      );
      setWorkspace(
        (previous) =>
          previous && {
            ...previous,
            results: previous.results.map((result) =>
              result.id === saved.id ? saved : result,
            ),
          },
      );
      setNotice('Report section saved.');
    }).catch(() => {});
  }

  async function uploadSupport(
    type: 'sap' | 'tfl',
    file: File,
    description: string,
  ) {
    try {
      await mutate(async () => {
        await uploadSupportingDocument(projectId, type, file, description);
        setNotice(`${type.toUpperCase()} attached as a supporting document.`);
        await refresh();
      });
      return true;
    } catch {
      return false;
    }
  }

  async function removeSupport(document: SupportingDocument) {
    if (!window.confirm(`Remove supporting document “${document.filename}”?`))
      return;
    await mutate(async () => {
      await removeSupportingDocument(projectId, document.id);
      await refresh();
    }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Study Results</h1>
        <div className="flex gap-2">
          <button
            disabled={busy || refreshing}
            onClick={() => void refresh()}
            className={buttonClass}
          >
            {refreshing ? 'Refreshing…' : 'Refresh results'}
          </button>
          <button onClick={() => setHistoryOpen(true)} className={buttonClass}>
            Decision history
          </button>
        </div>
      </div>
      <MilestoneBanner projectId={projectId} currentStepId="study-results" />
      <section className="rounded-lg bg-stone-100 p-4">
        <h2 className="text-sm font-semibold">Purpose of this step</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Add the statistical results for this study. Give each item a clear
          title, report section, and a neutral description for review. You can
          work on the report before all results are in, and return here any time
          until the report is locked for approval.
        </p>
        <Link
          to={`/projects/${projectId}/workflow/report/make`}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700"
        >
          Continue to report authoring <ArrowRight size={14} />
        </Link>
      </section>
      {error && (
        <div
          role="alert"
          className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}
      {!workspace && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          {refreshing
            ? 'Loading study results…'
            : 'Results could not be loaded. Use Refresh results to retry.'}
        </p>
      )}
      {workspace && (
        <>
          {workspace.locked && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              The report is signed or final. Results and supporting documents
              are available to read; changes are locked.
            </p>
          )}
          <section
            aria-labelledby="supporting-heading"
            className="rounded-xl border border-slate-200 p-4"
          >
            <h2 id="supporting-heading" className="text-sm font-semibold">
              Supporting documents{' '}
              <span className="font-normal text-slate-500">— optional</span>
            </h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Attach the Statistical Analysis Plan (SAP) and table, figure and
              listing specifications (TFL) here. These reference files are kept
              separately and are never imported as results.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {(['sap', 'tfl'] as const).map((type) => (
                <ProtocolAttachmentsSection
                  key={type}
                  title={type.toUpperCase()}
                  help={
                    type === 'sap'
                      ? 'Statistical Analysis Plan'
                      : 'Table, figure and listing specifications'
                  }
                  emptyMessage={`No ${type.toUpperCase()} attached.`}
                  uploadLabel={`Attach ${type.toUpperCase()}`}
                  inputId={`${type}-description`}
                  attachments={workspace.supportingDocuments.filter(
                    (document) => document.type === type,
                  )}
                  labelFor={(document) => document.filename}
                  canManage={canEdit}
                  busy={busy}
                  error={null}
                  onUpload={(file, description) =>
                    uploadSupport(type, file, description)
                  }
                  onRemove={removeSupport}
                  onDownload={async (document) => {
                    try {
                      await downloadSupportingDocument(projectId, document);
                    } catch {
                      setError(
                        'Could not download the supporting document. Try again.',
                      );
                    }
                  }}
                />
              ))}
            </div>
          </section>
          <section
            aria-labelledby="intake-heading"
            className="rounded-xl border border-slate-200 p-4"
          >
            <h2 id="intake-heading" className="mb-3 text-sm font-semibold">
              Add results
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                disabled={!canEdit || busy}
                onClick={() => fileInput.current?.click()}
                className={`${buttonClass} flex items-center justify-center gap-2`}
              >
                <Upload size={15} />
                Upload file
              </button>
              <button
                disabled={!canEdit || busy}
                onClick={() => setMode('paste')}
                className={`${buttonClass} flex items-center justify-center gap-2`}
              >
                <Clipboard size={15} />
                Paste table
              </button>
              <button
                disabled={!canEdit || busy}
                onClick={() => setMode('manual')}
                className={`${buttonClass} flex items-center justify-center gap-2`}
              >
                <Grid2X2 size={15} />
                Build manually
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".csv,.tsv,.xlsx,.pdf,.docx,.txt,.png,.jpg,.jpeg"
              className="hidden"
              aria-label="Upload result files"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                if (files.length) void importFiles(files);
              }}
            />
            <p className="mt-2 text-xs text-slate-500">
              CSV, TSV, Excel (.xlsx), PDF, Word (.docx), text, PNG, or JPEG. Up
              to 10 MB per file. Excel regions separated by empty rows or
              columns become table drafts. You can split or merge them before
              saving. PDF and Word text becomes a listing draft. PNG/JPEG files
              become figure drafts displaying the original image. Review imports
              before saving.
            </p>
            {!canEdit && !workspace.locked && (
              <p className="mt-2 text-xs text-slate-500">
                Authors and administrators can add or edit results.
              </p>
            )}
          </section>
          {mode && canEdit && (
            <ResultEditor
              key={mode}
              projectId={projectId}
              mode={mode}
              sections={workspace.sections}
              busy={busy}
              onCancel={() => setMode(null)}
              onSave={(input) => saveDraft(input)}
            />
          )}
          {!!importIssues.length && (
            <section
              role="alert"
              className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
            >
              <h2 className="font-semibold">Some content needs manual entry</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {importIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <p className="text-sm">
                Other detected tables remain available below. Use the source
                locations above when entering the missing content.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={!canEdit || busy}
                  className={buttonClass}
                  onClick={() => setMode('paste')}
                >
                  Paste missing table
                </button>
                <button
                  disabled={!canEdit || busy}
                  className={buttonClass}
                  onClick={() => setMode('manual')}
                >
                  Enter missing result manually
                </button>
                <button
                  className={buttonClass}
                  onClick={() => setImportIssues([])}
                >
                  Dismiss import issues
                </button>
              </div>
            </section>
          )}
          {!!drafts.length && canEdit && (
            <ImportReview
              drafts={drafts}
              setDrafts={setDrafts}
              projectId={projectId}
              sections={workspace.sections}
              busy={busy}
              onSave={saveDraft}
            />
          )}
          <section aria-labelledby="progress-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="progress-heading" className="text-sm font-semibold">
                Review progress
              </h2>
              <span className="text-xs text-slate-500">
                {summary.reviewed} of {summary.total} reviewed
              </span>
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              aria-live="polite"
            >
              {(Object.keys(statusLabels) as StudyResult['status'][]).map(
                (status) => (
                  <div
                    key={status}
                    className={`rounded-lg px-3 py-2 ${statusStyles[status]}`}
                  >
                    <span className="text-lg font-semibold">
                      {summary.counts[status]}
                    </span>
                    <span className="ml-2 text-xs">{statusLabels[status]}</span>
                  </div>
                ),
              )}
            </div>
            <div
              role="progressbar"
              aria-label="Results reviewed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.percent}
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                style={{ width: `${summary.percent}%` }}
                className="h-full bg-blue-500 transition-all"
              />
            </div>
          </section>
          {!results.length && (
            <section className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <FileText className="mx-auto mb-3 text-slate-400" />
              <h2 className="font-semibold">No results yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Upload a results file, paste a table, or build your first result
                manually. Supporting documents are optional.
              </p>
            </section>
          )}
          {selected && view === 'review' && (
            <section
              ref={reviewRef}
              tabIndex={-1}
              id="result-review"
              className="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
              aria-label="Result review"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${statusStyles[selected.status]}`}
                >
                  {statusLabels[selected.status]}
                </span>
                <span className="text-xs text-slate-500">
                  Item {index + 1} of {results.length} · {selected.type}{' '}
                  {selected.reportNumber}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">
                  Title{' '}
                  {selected.titleOrigin === 'ai' ? '(AI suggested)' : '(human)'}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{selected.title}</h2>
              </div>
              <div
                className={`rounded-lg border p-3 ${selected.sectionOrigin === 'ai' ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <label
                  htmlFor="review-report-section"
                  className="text-xs text-slate-500"
                >
                  Report section{' '}
                  {selected.sectionOrigin === 'ai' ? '— AI suggested' : ''}
                </label>
                <select
                  id="review-report-section"
                  className={`${inputClass} mt-1`}
                  value={selected.reportSectionId ?? ''}
                  disabled={busy || !!editing || !(canEdit || canDecide)}
                  onChange={(event) => void changeSection(event.target.value)}
                >
                  <option value="">Not assigned yet</option>
                  {workspace.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
                {(canEdit || canDecide) && (
                  <p className="mt-1 text-xs text-slate-500">
                    Section changes save immediately. The description stays the
                    same.
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Placement:{' '}
                  {selected.placement === 'both'
                    ? 'Main report and appendix'
                    : selected.placement}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                v{selected.version} · {selected.sourceFilename}
                {selected.sourceLocation ? ` · ${selected.sourceLocation}` : ''}
              </p>
              <ResultViewer key={selected.id} result={selected} />
              <div>
                <p className="mb-1 text-xs text-slate-500">
                  {selected.descriptionOrigin === 'ai'
                    ? 'AI description'
                    : 'Description'}{' '}
                  — states only what is in the data
                </p>
                <p
                  className={`whitespace-pre-wrap rounded-lg border p-3 text-sm ${selected.descriptionOrigin === 'ai' ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-stone-50'}`}
                >
                  {selected.description || 'No description provided.'}
                </p>
              </div>
              {selected.lastDecision && (
                <p className="text-xs text-slate-600">
                  Last decision: {selected.lastDecision.decision} ·{' '}
                  {new Date(selected.lastDecision.decidedAt).toLocaleString()}
                  {selected.lastDecision.reason
                    ? ` — ${selected.lastDecision.reason}`
                    : ''}
                </p>
              )}
              {canEdit && (
                <button
                  disabled={busy}
                  onClick={() => setEditing(selected)}
                  className={buttonClass}
                >
                  Edit result
                </button>
              )}
              {editing && editing.id === selected.id && canEdit && (
                <ResultEditor
                  key={`${editing.id}:${editing.version}`}
                  projectId={projectId}
                  initial={editing}
                  mode="edit"
                  sections={workspace.sections}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={async (input) => {
                    await mutate(async () => {
                      // Send only changed fields so an untouched AI suggestion keeps its origin.
                      const changes: Partial<Omit<ResultInput, 'type'>> & {
                        placement?: StudyResult['placement'];
                      } = {};
                      for (const key of [
                        'title',
                        'description',
                        'sourceFilename',
                        'sourceLocation',
                        'reportSectionId',
                      ] as const) {
                        if ((input[key] ?? '') !== (editing[key] ?? ''))
                          Object.assign(changes, { [key]: input[key] });
                      }
                      if (
                        JSON.stringify(input.content) !==
                        JSON.stringify(editing.content)
                      )
                        changes.content = input.content;
                      if (
                        'reportSectionId' in changes &&
                        editing.status === 'accepted'
                      )
                        changes.placement = changes.reportSectionId
                          ? editing.placement === 'both'
                            ? 'both'
                            : 'main'
                          : 'unplaced';
                      if (!Object.keys(changes).length) {
                        setEditing(null);
                        return;
                      }
                      const saved = await updateResult(
                        projectId,
                        editing,
                        changes,
                      );
                      setWorkspace(
                        (previous) =>
                          previous && {
                            ...previous,
                            results: previous.results.map((result) =>
                              result.id === saved.id ? saved : result,
                            ),
                          },
                      );
                      setEditing(null);
                      setNotice('Result updated.');
                      await refresh();
                    });
                  }}
                />
              )}
              {canDecide && (
                <fieldset disabled={busy || !!editing} className="space-y-3">
                  <label className="block text-xs text-slate-600">
                    Decision reason (optional)
                    <textarea
                      rows={2}
                      maxLength={10000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={both}
                      disabled={!selected.reportSectionId}
                      onChange={(event) => setBoth(event.target.checked)}
                    />
                    Include in both main report and appendix when accepting
                  </label>
                  {!selected.reportSectionId && (
                    <p className="text-xs text-slate-500">
                      Accepting now approves the result without placement.
                      Choose a section above to include it in the main report.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => void decide('accept')}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => void decide('appendix')}
                      className={buttonClass}
                    >
                      Appendix
                    </button>
                    <button
                      onClick={() => void decide('reject')}
                      className={`${buttonClass} text-red-700`}
                    >
                      Reject
                    </button>
                  </div>
                </fieldset>
              )}
              {!canDecide && !workspace.locked && (
                <p className="text-xs text-slate-500">
                  Reviewers, approvers and administrators can record decisions.
                </p>
              )}
              <div className="flex items-center justify-between border-t pt-4">
                <button
                  aria-label="Previous result"
                  disabled={busy || !!editing || index <= 0}
                  onClick={() => {
                    openReview(results[index - 1].id);
                  }}
                  className={buttonClass}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  disabled={busy || !!editing}
                  onClick={openList}
                  className="text-xs text-blue-700 disabled:opacity-50"
                >
                  View all {results.length} as a list
                </button>
                <button
                  aria-label={
                    index >= results.length - 1
                      ? 'Finish review and view list'
                      : 'Next result'
                  }
                  disabled={busy || !!editing}
                  onClick={() => {
                    if (index >= results.length - 1) openList();
                    else openReview(results[index + 1].id);
                  }}
                  className={buttonClass}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
              {canDecide && (
                <p className="text-xs text-slate-500">
                  Each decision advances to the next result. After the last
                  item, you return to the list.
                </p>
              )}
            </section>
          )}
          {(view === 'list' || !results.length) && (
            <section
              id="all-results"
              ref={listRef}
              tabIndex={-1}
              className="space-y-3"
            >
              <h2 className="text-sm font-semibold">
                All results ({results.length})
              </h2>
              {!!results.length && (
                <button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() =>
                    openReview(
                      results.find((result) => result.status === 'draft')?.id ??
                        selected.id,
                    )
                  }
                >
                  {summary.counts.draft
                    ? `Review remaining results (${summary.counts.draft})`
                    : 'Review results again'}
                </button>
              )}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs text-slate-500">
                    <tr>
                      {[
                        'Title',
                        'Type',
                        'Report section',
                        'Status',
                        'Source',
                      ].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <button
                            disabled={busy}
                            onClick={() => {
                              openReview(result.id);
                            }}
                            className="text-left font-medium text-blue-700 hover:underline"
                          >
                            {result.title}
                          </button>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {result.type} {result.reportNumber}
                        </td>
                        <td className="px-4 py-3">
                          {workspace.sections.find(
                            (section) => section.id === result.reportSectionId,
                          )?.title ?? 'Not assigned'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${statusStyles[result.status]}`}
                          >
                            {statusLabels[result.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span>{result.sourceFilename}</span>
                          <span className="block text-xs text-slate-500">
                            {result.sourceLocation}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!results.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-5 text-center text-slate-500"
                        >
                          No saved results.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      {historyOpen && (
        <AuditTrailModal open={historyOpen} onOpenChange={setHistoryOpen} />
      )}
    </div>
  );
}
