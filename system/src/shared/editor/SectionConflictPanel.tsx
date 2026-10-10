import DOMPurify from 'dompurify';
import type { SectionConflict } from './section-draft';

export function SectionConflictPanel({ conflict, draft, onContinue }: {
  conflict: SectionConflict;
  draft: string;
  onContinue: () => void;
}) {
  const downloadDraft = () => {
    const url = URL.createObjectURL(new Blob([draft], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-section-draft.html';
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div role="alert" data-section-conflict className="my-3 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-medium">This section has changed since you opened it. Your changes have been kept.</p>
      <p className="mt-1">Compare the newer saved text with your draft. Combine the changes in the editor before saving again.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 font-medium">Newer saved text{conflict.current ? ` · Revision ${conflict.current.revision}` : ''}</p>
          <div data-conflict-current className="max-h-64 overflow-auto rounded border bg-white p-3 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(conflict.current
              ? conflict.current.content || '<p>This section is empty.</p>' : 'This section no longer exists.') }} />
        </div>
        <div>
          <p className="mb-1 font-medium">Your draft</p>
          <div data-conflict-draft className="max-h-64 overflow-auto rounded border bg-white p-3 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draft) }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="rounded border bg-white px-3 py-2" onClick={downloadDraft}>Download my draft</button>
        {conflict.current && <button type="button" className="rounded border bg-white px-3 py-2" onClick={onContinue}>
          I’ve compared both — continue editing
        </button>}
      </div>
      <p className="mt-2 text-xs">Continuing keeps your draft and uses the newer revision for your next save. Another change will be checked again.</p>
    </div>
  );
}
