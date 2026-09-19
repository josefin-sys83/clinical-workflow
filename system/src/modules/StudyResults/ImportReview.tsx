import { useCallback, useState } from 'react';
import type { ResultInput, ResultsWorkspace } from '@/shared/api/results';
import { ResultEditor, buttonClass, inputClass } from './ResultEditor';
import { mergeDrafts, splitDraft, type ImportDraft } from './import-drafts';

export function ImportReview({
  drafts,
  setDrafts,
  projectId,
  sections,
  busy,
  onSave,
}: {
  drafts: ImportDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<ImportDraft[]>>;
  projectId: string;
  sections: ResultsWorkspace['sections'];
  busy: boolean;
  onSave: (input: ResultInput, key: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const updateDraft = useCallback(
    (key: string, input: ResultInput) => {
      setDrafts((previous) =>
        previous.map((d) => (d.key === key ? { ...d, input } : d)),
      );
    },
    [setDrafts],
  );
  const merge = () => {
    try {
      const inputs = drafts
        .filter((d) => selected.includes(d.key))
        .map((d) => d.input);
      const merged = mergeDrafts(inputs);
      const first = drafts.find((d) => selected.includes(d.key))!.key;
      setDrafts((previous) =>
        previous.flatMap((d) =>
          d.key === first
            ? [{ key: crypto.randomUUID(), input: merged }]
            : selected.includes(d.key)
              ? []
              : [d],
        ),
      );
      setSelected([]);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <section className="space-y-3" aria-label="Import preview">
      <h2 className="font-semibold">
        Imported drafts — {drafts.length} awaiting save
      </h2>
      <p className="text-sm text-slate-600">
        Check each detection before saving. Split boundaries or merge selected
        tables if needed. These previews are not saved when you leave this page.
      </p>
      <p className="text-xs text-slate-500">
        Merge stacks tables in preview order, keeping the first title and
        section. Matching headers are combined; different headers remain as rows
        and shorter rows are padded with empty cells.
      </p>
      <button
        className={buttonClass}
        disabled={
          busy ||
          selected.filter((key) => drafts.some((d) => d.key === key)).length < 2
        }
        onClick={merge}
      >
        Merge selected detections
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {drafts.map((draft) => (
        <div key={draft.key} className="space-y-2 rounded-xl border p-3">
          {Array.isArray(draft.input.content.rows) && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(draft.key)}
                  onChange={(e) =>
                    setSelected((previous) =>
                      e.target.checked
                        ? [...previous, draft.key]
                        : previous.filter((key) => key !== draft.key),
                    )
                  }
                />
                Select for merge: {draft.input.title}
              </label>
              <SplitControls
                input={draft.input}
                busy={busy}
                onSplit={(after, header) => {
                  try {
                    const parts = splitDraft(draft.input, after, header);
                    setDrafts((previous) =>
                      previous.flatMap((d) =>
                        d.key === draft.key
                          ? parts.map((input) => ({
                              key: crypto.randomUUID(),
                              input,
                            }))
                          : [d],
                      ),
                    );
                    setError('');
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              />
            </>
          )}
          <ResultEditor
            projectId={projectId}
            initial={draft.input}
            mode="upload"
            sections={sections}
            busy={busy}
            draftKey={draft.key}
            onDraftChange={updateDraft}
            onSave={(input) => onSave(input, draft.key)}
            onCancel={() =>
              setDrafts((previous) =>
                previous.filter((d) => d.key !== draft.key),
              )
            }
          />
        </div>
      ))}
    </section>
  );
}

function SplitControls({
  input,
  busy,
  onSplit,
}: {
  input: ResultInput;
  busy: boolean;
  onSplit: (after: number, header: boolean) => void;
}) {
  const [after, setAfter] = useState(1);
  const [header, setHeader] = useState(false);
  const count = (input.content.rows as unknown[]).length;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label>
        Split after data row{' '}
        <input
          aria-label="Split after data row"
          className={`${inputClass} max-w-24`}
          type="number"
          min={1}
          max={count - 1}
          value={after}
          disabled={busy || count < 2}
          onChange={(e) => setAfter(Number(e.target.value))}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={header}
          disabled={busy || count < 3}
          onChange={(e) => setHeader(e.target.checked)}
        />
        Use next row as the second table’s header
      </label>
      <button
        className={buttonClass}
        disabled={busy || count < 2}
        onClick={() => onSplit(after, header)}
      >
        Split detection
      </button>
      <span className="text-xs text-slate-500">
        Data rows exclude the header. Without this option, both drafts keep the
        original header.
      </span>
    </div>
  );
}
