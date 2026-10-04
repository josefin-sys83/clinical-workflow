import { useState } from 'react';
import type { ProtocolAttachment } from '@/shared/api/documents';
import type { IssueMetadata } from './issues';

export function FindingDocumentControl({ finding, attachments, disabled, onDecide }: {
  finding: IssueMetadata & { id: string; severity: string };
  attachments: ProtocolAttachment[];
  disabled?: boolean;
  onDecide?: (issueId: string, attachmentId: string | null) => Promise<void>;
}) {
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = finding.documentLink;
  const decide = async (id: string | null) => {
    setBusy(true); setError(null);
    try { await onDecide?.(finding.id, id); setChoosing(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update document link.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-2 text-xs" onClick={event => event.stopPropagation()} data-finding-document-control>
      {link && (
        <div className={`rounded border p-2 ${['warning','blocker'].includes(link.status) ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-teal-200 bg-teal-50 text-teal-900'}`}>
          <p className="font-medium">
            {link.status === 'satisfied' ? `Satisfied by ${link.label}`
              : link.status === 'checking' ? `Linked to ${link.label} — checking…`
              : link.status === 'failed' ? `Linked to ${link.label} — check unavailable`
              : `Linked to ${link.label} — requirement not satisfied`}
          </p>
          {link.reason && <p className="mt-1 whitespace-pre-wrap">{link.reason}</p>}
          {link.status === 'failed' && <p className="mt-1">The link is saved and this finding does not block completion.</p>}
          {onDecide && <div className="mt-2 flex gap-3">
            <button type="button" disabled={disabled || busy} onClick={() => void decide(null)} className="underline disabled:opacity-50">Remove link</button>
            {link.status === 'failed' && <button type="button" disabled={disabled || busy} onClick={() => void decide(link.attachmentId)} className="underline disabled:opacity-50">Retry check</button>}
          </div>}
        </div>
      )}
      {!link && onDecide && finding.requirementId && ['blocker','warning'].includes(finding.severity) && (
        <button type="button" disabled={disabled || busy || !attachments.length} onClick={() => setChoosing(true)}
          className="text-blue-700 underline disabled:opacity-50">Satisfied by document</button>
      )}
      {choosing && <div className="mt-2 flex flex-wrap gap-2">
        <select aria-label="Supporting document" value={selected} onChange={event => setSelected(event.target.value)} disabled={busy || disabled}
          className="min-w-0 max-w-full rounded border border-slate-300 bg-white p-2 text-slate-900">
          <option value="">Choose a protocol attachment</option>
          {attachments.map(document => <option key={document.id} value={document.id}>Appendix {document.appendixNumber} - {document.filename}</option>)}
        </select>
        <button type="button" disabled={!selected || busy || disabled} onClick={() => void decide(selected)} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50">{busy ? 'Linking…' : 'Link document'}</button>
        <button type="button" disabled={busy} onClick={() => setChoosing(false)} className="text-slate-600">Cancel</button>
      </div>}
      {error && <p className="mt-1 text-red-700" role="alert">{error}</p>}
    </div>
  );
}
