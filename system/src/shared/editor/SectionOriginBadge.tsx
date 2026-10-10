export type SectionProvenance = {
  aiGenerated: boolean;
  generatedAt: string | null;
  inputs: Array<{ label: string; value: string; fingerprint?: string }> | null;
  editedBy: string | null;
  editedAt: string | null;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Display metadata separately from authored section HTML. */
export function SectionOriginBadge({ provenance, aiGenerated = false, displayMode = 'interactive' }: {
  provenance?: SectionProvenance;
  aiGenerated?: boolean;
  displayMode?: 'interactive' | 'document';
}) {
  if (!(provenance?.aiGenerated || aiGenerated)) return null;
  const label = <>AI-generated{provenance?.editedAt && <> · edited by {provenance.editedBy || 'Unknown user'} on{' '}
    <time dateTime={provenance.editedAt}>{dateLabel(provenance.editedAt)}</time>
  </>}</>;
  const inputDetails = <>
    <p className="font-medium">Inputs used for AI generation</p>
    {provenance?.generatedAt && <p className="mt-1">Generated on <time dateTime={provenance.generatedAt}>
      {dateLabel(provenance.generatedAt)}
    </time></p>}
    <p className="mt-1">These are the saved inputs from generation time.</p>
    {provenance?.inputs?.length ? <dl className="mt-2 space-y-2">
      {provenance.inputs.map((input, index) => <div key={index}>
        <dt className="font-medium">{input.label}</dt>
        <dd className="break-words whitespace-pre-wrap">{input.value}</dd>
      </div>)}
    </dl> : <p className="mt-2">Inputs unavailable for this section.</p>}
  </>;
  if (displayMode === 'document') return (
    <div data-section-origin data-document-origin style={{ fontSize: '10px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
      <p>{label}</p>
    </div>
  );
  return (
    <details data-section-origin className="max-w-full text-xs text-slate-600">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 list-none">
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
          {label}
        </span>
        <span className="underline">Inputs used</span>
      </summary>
      <div data-generation-inputs className="mt-2 max-w-xl rounded border border-slate-200 bg-white p-3">
        {inputDetails}
      </div>
    </details>
  );
}
