import { useEffect, useState } from 'react';
import {
  parseResultTable,
  previewResultUpload,
  type ResultInput,
  type ResultsWorkspace,
} from '@/shared/api/results';
import { apiErrorMessage } from '@/shared/api/http';
import { ResultContent } from './ResultContent';

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
}: {
  projectId: string;
  initial?: ResultInput;
  sections: ResultsWorkspace['sections'];
  draftKey?: string;
  onDraftChange?: (key: string, input: ResultInput) => void;
  mode: 'manual' | 'paste' | 'upload' | 'edit';
  busy: boolean;
  onSave: (input: ResultInput) => Promise<void>;
  onCancel: () => void;
}) {
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
  const [section, setSection] = useState(initial?.reportSectionId ?? '');
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

  // Keep import previews current so split/merge retains edited metadata.
  useEffect(() => {
    if (draftKey && onDraftChange && content)
      onDraftChange(draftKey, {
        title,
        type,
        description,
        sourceFilename: source,
        sourceLocation: location,
        reportSectionId: section || null,
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
  ]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
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
      await onSave({
        title: title.trim(),
        type,
        description,
        sourceFilename: source.trim(),
        sourceLocation: location,
        reportSectionId: section || null,
        content: nextContent,
      });
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
        <label className="block text-xs text-slate-600">
          Title
          <input
            required
            maxLength={1000}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <label className="block text-xs text-slate-600">
            Report section
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
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
                    if (!title.trim()) setTitle(preview.drafts[0].title);
                    if (source === 'Manual entry') setSource(file.name);
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
        <label className="block text-xs text-slate-600">
          Description — state only what is in the data
          <textarea
            rows={3}
            maxLength={20000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              onChange={(e) => setSource(e.target.value)}
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={buttonClass}>
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
