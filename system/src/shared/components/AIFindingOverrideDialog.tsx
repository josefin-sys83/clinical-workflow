import { useState } from 'react';

type AIFindingOverrideDialogProps = {
  open: boolean;
  findingLabel: string;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (justification: string) => Promise<void> | void;
};

export function AIFindingOverrideDialog({
  open,
  findingLabel,
  submitting = false,
  error,
  onCancel,
  onSubmit,
}: AIFindingOverrideDialogProps) {
  const [justification, setJustification] = useState('');
  if (!open) return null;

  const close = () => {
    if (submitting) return;
    setJustification('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="ai-override-title">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="ai-override-title" className="text-lg font-semibold text-slate-900">Override AI finding</h2>
        <p className="mt-2 text-sm text-slate-600">
          You are overriding “{findingLabel}”. The finding will remain visible, and your decision will be recorded in the audit trail.
        </p>
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="ai-override-justification">Justification</label>
        <textarea
          id="ai-override-justification"
          value={justification}
          onChange={event => setJustification(event.target.value)}
          rows={4}
          disabled={submitting}
          placeholder="Explain why the AI finding should not block progress."
          className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} disabled={submitting} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">Cancel</button>
          <button
            type="button"
            disabled={submitting || !justification.trim()}
            onClick={() => onSubmit(justification.trim())}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Submitting…' : 'Submit override'}
          </button>
        </div>
      </div>
    </div>
  );
}
