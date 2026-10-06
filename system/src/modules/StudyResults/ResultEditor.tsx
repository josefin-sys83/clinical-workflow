import { useEffect, useId, useRef, useState } from 'react';
import {
  parseResultTable,
  previewResultUpload,
  suggestResult,
  type ResultInput,
  type ResultsWorkspace,
  type ResultSuggestion,
} from '@/shared/api/results';
import { ApiError, apiErrorMessage } from '@/shared/api/http';
import { ResultContent } from './ResultContent';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover';

export function SuggestionOrigin({
  origin,
  field,
}: {
  origin?: 'ai' | 'human';
  field: string;
}) {
  if (!origin) return null;
  if (origin === 'human')
    return <span className="text-xs text-slate-500">Human-edited</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-violet-700 underline decoration-dotted"
          aria-label={`About the AI suggestion for ${field}`}
        >
          AI suggestion ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-white text-sm text-slate-700">
        This {field} was suggested by AI. Review and edit it before saving.
      </PopoverContent>
    </Popover>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50';
export const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function ResultEditor({
  projectId,
  initial,
  sections,
  mode,
  busy,
  onSave,
  onCancel,
  draftKey,
  onDraftChange,
  suggestion: importedSuggestion,
  placementStale = false,
  placementOnly = false,
}: {
  projectId: string;
  initial?: ResultInput;
  sections: ResultsWorkspace['sections'];
  draftKey?: string;
  onDraftChange?: (key: string, input: ResultInput) => void;
  suggestion?: ResultSuggestion;
  placementStale?: boolean;
  placementOnly?: boolean;
  mode: 'manual' | 'paste' | 'upload' | 'edit';
  busy: boolean;
  onSave: (input: ResultInput) => Promise<void>;
  onCancel: () => void;
}) {
  const canSuggest = mode === 'paste' || mode === 'manual';
  const [localSuggestion, setLocalSuggestion] = useState<ResultSuggestion>();
  const suggestion = canSuggest ? localSuggestion : importedSuggestion;
  const [analyzing, setAnalyzing] = useState(false);
  const [aiStale, setAiStale] = useState(false);
  const aiRequest = useRef<AbortController | null>(null);
  const sourceEdited = useRef(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<ResultInput['type']>(
    initial?.type ?? 'table',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [source, setSource] = useState(
    initial?.sourceFilename ??
      (mode === 'paste' ? 'Pasted table' : 'Manual entry'),
  );
  const [location, setLocation] = useState(initial?.sourceLocation ?? '');
  const [section, setSection] = useState(
    initial?.reportSectionKey
      ? `key:${initial.reportSectionKey}`
      : (initial?.reportSectionId ?? ''),
  );
  const [origins, setOrigins] = useState({
    titleOrigin: initial?.titleOrigin,
    sectionOrigin: initial?.sectionOrigin,
    descriptionOrigin: initial?.descriptionOrigin,
  });
  const humanEdits = useRef({
    // Defaults have no human origin. User input, including clearing a field, does.
    title: initial?.titleOrigin === 'human',
    section: initial?.sectionOrigin === 'human',
    description: initial?.descriptionOrigin === 'human',
  });
  const placementHelpId = useId();
  const showPlacementHelp = !placementStale && !section && suggestion?.reportSectionKey === null && !!suggestion.limitation;
  const alternativeTitles = sections
    .filter(s => suggestion?.alternativeSectionKeys?.includes(s.id.replace(/^key:/, '')))
    .map(s => s.title);
  const appliedSuggestion = useRef<ResultSuggestion>();
  useEffect(() => {
    if (!suggestion || appliedSuggestion.current === suggestion) return;
    appliedSuggestion.current = suggestion;
    const next: Partial<typeof origins> = {};
    if (!placementOnly && !humanEdits.current.title &&
        (suggestion.title !== null || (canSuggest && origins.titleOrigin === 'ai'))) {
      setTitle(suggestion.title ?? '');
      next.titleOrigin = suggestion.title === null ? undefined : 'ai';
    }
    if (!placementStale && !humanEdits.current.section &&
        (suggestion.reportSectionKey !== null || placementOnly || (canSuggest && origins.sectionOrigin === 'ai'))) {
      setSection(suggestion.reportSectionKey === null ? '' : `key:${suggestion.reportSectionKey}`);
      next.sectionOrigin = suggestion.reportSectionKey === null ? undefined : 'ai';
    }
    if (!placementOnly && !humanEdits.current.description &&
        (suggestion.description !== null || (canSuggest && origins.descriptionOrigin === 'ai'))) {
      setDescription(suggestion.description ?? '');
      next.descriptionOrigin = suggestion.description === null ? undefined : 'ai';
    }
    setOrigins((previous) => ({ ...previous, ...next }));
  }, [suggestion, placementStale, placementOnly]);
  const [content, setContent] = useState<Record<string, unknown> | null>(
    initial?.content ?? null,
  );
  const [paste, setPaste] = useState('');
  const [grid, setGrid] = useState<string[][]>(() => {
    const data = initial?.content;
    if (
      Array.isArray(data?.headers) &&
      Array.isArray(data?.rows) &&
      data.rows.every(Array.isArray)
    ) {
      return [data.headers, ...data.rows].map((row) =>
        row.map((value) =>
          value == null
            ? ''
            : typeof value === 'string'
              ? value
              : JSON.stringify(value),
        ),
      );
    }
    return [
      ['Column 1', 'Column 2'],
      ['', ''],
    ];
  });
  const [tableEdited, setTableEdited] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const disabled = busy || saving || loadingImage;
  const manual = mode === 'manual';
  const editableTable =
    type === 'table' &&
    (manual ||
      (mode === 'edit' &&
        Array.isArray(content?.headers) &&
        Array.isArray(content?.rows)));
  const changeGrid = (next: string[][]) => {
    setGrid(next);
    setTableEdited(true);
  };

  function stopAnalysis() {
    aiRequest.current?.abort();
    aiRequest.current = null;
    setAnalyzing(false);
  }

  function invalidateAnalysis() {
    if (aiRequest.current || localSuggestion) {
      stopAnalysis();
      setAiStale(true);
    }
  }

  // Only evidence changes invalidate an analysis; metadata edits retain field protection.
  useEffect(() => {
    if (canSuggest) invalidateAnalysis();
  }, [projectId, mode, type, paste, grid, text, content, source, location]);

  useEffect(() => () => {
    aiRequest.current?.abort();
    aiRequest.current = null;
  }, [projectId, mode]);

  // Keep import previews current so split/merge retains edited metadata.
  useEffect(() => {
    if (draftKey && onDraftChange && content)
      onDraftChange(draftKey, {
        title,
        type,
        description,
        sourceFilename: source,
        sourceLocation: location,
        reportSectionId: section.startsWith('key:') ? null : section || null,
        reportSectionKey: section.startsWith('key:')
          ? section.slice(4)
          : undefined,
        originalReference: initial?.originalReference,
        ...origins,
        content,
      });
  }, [
    draftKey,
    onDraftChange,
    title,
    type,
    description,
    source,
    location,
    section,
    content,
    origins,
    initial?.originalReference,
  ]);

  async function prepareInput(): Promise<ResultInput> {
    const nextContent =
      manual || tableEdited
        ? type === 'table'
          ? { ...content, headers: grid[0], rows: grid.slice(1) }
          : { ...content, text }
        : mode === 'paste'
          ? await parseResultTable(projectId, paste)
          : content;
    if (!nextContent) throw new Error('Add content before saving');
    if (
      editableTable &&
      !grid.slice(1).some((row) => row.some((cell) => cell.trim()))
    )
      throw new Error('Enter at least one data row');
    if (
      manual &&
      type !== 'table' &&
      !text.trim() &&
      !(type === 'figure' && content?.image)
    )
      throw new Error('Enter the result content');
    return {
      title: title.trim(),
      type,
      description,
      sourceFilename: source.trim(),
      sourceLocation: location,
      reportSectionId: section.startsWith('key:') ? null : section || null,
      reportSectionKey: section.startsWith('key:')
        ? section.slice(4)
        : undefined,
      originalReference: initial?.originalReference,
      ...origins,
      content: nextContent,
    };
  }

  async function analyze() {
    if (!canSuggest || disabled || aiRequest.current) return;
    const controller = new AbortController();
    aiRequest.current = controller;
    setAnalyzing(true);
    setError('');
    try {
      if (!source.trim()) throw new Error('Enter a source filename or label');
      const input = await prepareInput();
      if (controller.signal.aborted) return;
      const result = await suggestResult(projectId, input, controller.signal);
      if (controller.signal.aborted) return;
      setLocalSuggestion(result);
      setAiStale(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Too many AI requests. Wait a minute and try again. Your input is still available.'
          : apiErrorMessage(err, err instanceof Error
              ? err.message
              : 'AI suggestions are unavailable. Try again or fill in the fields manually.'),
      );
    } finally {
      if (aiRequest.current === controller) {
        aiRequest.current = null;
        setAnalyzing(false);
      }
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    stopAnalysis();
    setSaving(true);
    setError('');
    try {
      await onSave(await prepareInput());
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          err instanceof Error ? err.message : 'Could not save result',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-xl border border-blue-200 bg-white p-5"
    >
      <h3 className="font-semibold">
        {mode === 'edit'
          ? 'Edit result'
          : mode === 'upload'
            ? 'Review imported result'
            : mode === 'paste'
              ? 'Paste a table'
              : 'Build a result'}
      </h3>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <fieldset disabled={disabled} className="space-y-4">
        <SuggestionOrigin origin={origins.titleOrigin} field="title" />
        <label className="block text-xs text-slate-600">
          Title
          <input
            required
            maxLength={1000}
            value={title}
            onChange={(e) => {
              humanEdits.current.title = true;
              setOrigins((previous) => ({ ...previous, titleOrigin: 'human' }));
              setTitle(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-600">
            Type
            <select
              disabled={mode !== 'manual' && mode !== 'paste'}
              value={type}
              onChange={(e) => {
                setType(e.target.value as ResultInput['type']);
                if (manual) setContent(null);
              }}
              className={inputClass}
            >
              <option value="table">Table</option>
              <option value="figure">Figure</option>
              <option value="listing">Listing</option>
            </select>
          </label>
          <div>
            <SuggestionOrigin
              origin={origins.sectionOrigin}
              field="report section"
            />
            {!placementStale && suggestion?.placementBasisLabel && !humanEdits.current.section && (
              <p className="text-xs text-slate-600">{suggestion.placementBasisLabel}</p>
            )}
            <label className="block text-xs text-slate-600">
              Report section
              <select
                value={section}
                aria-describedby={showPlacementHelp ? placementHelpId : undefined}
                onChange={(e) => {
                  humanEdits.current.section = true;
                  setOrigins((previous) => ({
                    ...previous,
                    sectionOrigin: 'human',
                  }));
                  setSection(e.target.value);
                }}
                className={inputClass}
              >
                <option value="">Not assigned yet</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            {!placementStale && placementOnly && suggestion && humanEdits.current.section && (
              <div role="status" className="mt-1 text-xs text-slate-600">
                New AI placement suggestion: {sections.find(s => s.id === `key:${suggestion.reportSectionKey}`)?.title ?? 'Not assigned yet'}.
                {' '}Your manual selection is unchanged.
                {suggestion.limitation && <p>{suggestion.limitation}</p>}
                {alternativeTitles.length > 0 && <p>Suggested alternatives: {alternativeTitles.join('; ')}.</p>}
              </div>
            )}
            {showPlacementHelp && (
              <div id={placementHelpId} className="mt-1 text-xs text-slate-600">
                {alternativeTitles.length >= 2
                  ? `Multiple result topics. Suggested sections for parts of this content: ${alternativeTitles.join('; ')}. Select manually.`
                  : 'AI did not suggest a section. Select manually or review the source.'}
                {' '}
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-violet-700 underline decoration-dotted"
                      aria-label="Why no report section was selected">
                      ⓘ
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white text-sm text-slate-700">
                    {suggestion?.limitation}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
        {!sections.length && (
          <p className="text-xs text-slate-500">
            You can assign a section after saving your first result.
          </p>
        )}
        {mode === 'paste' && (
          <label className="block text-xs text-slate-600">
            Table data — include the header row
            <textarea
              required
              rows={6}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'Group\tN\nTreatment\t42'}
              className={inputClass}
            />
            <span>Paste cells from a spreadsheet, or use CSV.</span>
          </label>
        )}
        {editableTable && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              First row contains column headings.
            </p>
            <div className="overflow-auto">
              <table className="w-full">
                <tbody>
                  {grid.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>
                          <input
                            aria-label={`${i === 0 ? 'Header' : `Row ${i}`} column ${j + 1}`}
                            value={cell}
                            onChange={(e) =>
                              changeGrid(
                                grid.map((r, ri) =>
                                  ri === i
                                    ? r.map((c, ci) =>
                                        ci === j ? e.target.value : c,
                                      )
                                    : r,
                                ),
                              )
                            }
                            className={`${inputClass} min-w-28`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => changeGrid([...grid, grid[0].map(() => '')])}
                className={buttonClass}
              >
                Add row
              </button>
              <button
                type="button"
                onClick={() => changeGrid(grid.map((row) => [...row, '']))}
                className={buttonClass}
              >
                Add column
              </button>
              <button
                type="button"
                disabled={grid.length <= 2}
                onClick={() => changeGrid(grid.slice(0, -1))}
                className={buttonClass}
              >
                Remove last row
              </button>
              <button
                type="button"
                disabled={grid[0].length <= 1}
                onClick={() => changeGrid(grid.map((row) => row.slice(0, -1)))}
                className={buttonClass}
              >
                Remove last column
              </button>
            </div>
          </div>
        )}
        {type === 'figure' && (manual || mode === 'edit') && (
          <div className="space-y-2">
            <label className="block text-xs text-slate-600">
              Figure image — PNG or JPEG, up to 10 MB
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                className={inputClass}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (canSuggest) invalidateAnalysis();
                  setLoadingImage(true);
                  setError('');
                  try {
                    if (file.size > 10 * 1024 * 1024)
                      throw new Error('Maximum figure size is 10 MB');
                    const preview = await previewResultUpload(projectId, file);
                    const image = preview.drafts[0]?.content.image;
                    if (!image)
                      throw new Error('Choose a PNG or JPEG figure image');
                    setContent((previous) => ({ ...previous, image }));
                    if (!title.trim() && !humanEdits.current.title) setTitle(preview.drafts[0].title);
                    if (source === 'Manual entry' && !sourceEdited.current) setSource(file.name);
                  } catch (err) {
                    setError(
                      apiErrorMessage(
                        err,
                        err instanceof Error
                          ? err.message
                          : 'Could not load image',
                      ),
                    );
                  } finally {
                    setLoadingImage(false);
                  }
                }}
              />
            </label>
            {loadingImage && (
              <p role="status" className="text-sm">
                Loading figure preview…
              </p>
            )}
            {manual && content?.image != null && (
              <ResultContent content={content} />
            )}
          </div>
        )}
        {manual && type !== 'table' && (
          <label className="block text-xs text-slate-600">
            {type === 'figure'
              ? 'Figure data / specification'
              : 'Listing content'}
            <textarea
              required={type !== 'figure' || !content?.image}
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={inputClass}
            />
          </label>
        )}
        {(mode === 'upload' || (mode === 'edit' && !editableTable)) &&
          content && (
            <ResultContent
              content={content}
              showRowNumbers={mode === 'upload'}
            />
          )}
        {mode === 'edit' && typeof content?.text === 'string' && (
          <label className="block text-xs text-slate-600">
            Content
            <textarea
              rows={6}
              value={content.text}
              onChange={(e) => setContent({ ...content, text: e.target.value })}
              className={inputClass}
            />
          </label>
        )}
        <SuggestionOrigin
          origin={origins.descriptionOrigin}
          field="description"
        />
        <label className="block text-xs text-slate-600">
          Description — state only what is in the data
          <textarea
            rows={3}
            maxLength={20000}
            value={description}
            onChange={(e) => {
              humanEdits.current.description = true;
              setOrigins((previous) => ({
                ...previous,
                descriptionOrigin: 'human',
              }));
              setDescription(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-600">
            Source filename or label
            <input
              required
              maxLength={1000}
              readOnly={mode === 'upload'}
              value={source}
              onChange={(e) => {
                sourceEdited.current = true;
                setSource(e.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-slate-600">
            Source location
            <input
              maxLength={2000}
              readOnly={mode === 'upload'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sheet, page, or rows"
              className={inputClass}
            />
          </label>
        </div>
        {canSuggest && (
          <div className="space-y-2">
            <button type="button" disabled={analyzing} onClick={analyze} className={buttonClass}>
              Suggest with AI
            </button>
            <p role="status" className="text-sm text-slate-600">
              {analyzing
                ? 'Preparing AI suggestions. You can edit and save meanwhile.'
                : aiStale
                  ? 'Source changed. Review the fields or request new AI suggestions before saving.'
                  : localSuggestion
                    ? localSuggestion.limitation || 'AI suggestions ready. Review all fields before saving.'
                    : 'Add source content, then request suggestions. Your own field edits will be kept.'}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { stopAnalysis(); onCancel(); }} className={buttonClass}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {disabled
              ? 'Saving…'
              : mode === 'edit'
                ? 'Save changes'
                : 'Save draft'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
