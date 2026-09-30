export type SaveState = 'saved' | 'dirty' | 'saving' | 'failed';

const formatSavedAt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

/** Shows whether the text on screen is the text the server holds. */
export function SaveStatus({ state, updatedAt, revision, error }: {
  state: SaveState;
  updatedAt?: string;
  revision?: number;
  error?: string | null;
}) {
  if (state === 'saving') {
    return <span role="status" className="text-xs text-slate-500">Saving…</span>;
  }
  if (state === 'failed') {
    return (
      <span role="alert" className="text-xs text-rose-700">
        Not saved — {error || 'the server did not confirm the save.'} Your changes are still in the editor.
      </span>
    );
  }
  if (state === 'dirty') {
    return <span className="text-xs text-amber-700">Unsaved changes</span>;
  }
  const savedAt = formatSavedAt(updatedAt);
  if (!savedAt) return null;
  return (
    <span className="text-xs text-slate-500">
      Saved {savedAt}{revision ? ` · Revision ${revision}` : ''}
    </span>
  );
}
