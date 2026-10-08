import { useId, useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';

export interface SatisfiedRequirement {
  name: string;
  status: 'satisfied';
  source: 'section' | 'attachment';
  sourceName: string | null;
  evidence: string;
}

export function SatisfiedRequirements({ requirements, isCurrent, sectionId }: {
  requirements: SatisfiedRequirement[];
  isCurrent: boolean;
  sectionId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const listId = useId();
  if (!requirements.length) return null;

  return (
    <section className="rounded border border-emerald-200 bg-emerald-50/40 p-3"
      aria-label="Satisfied requirements" data-satisfied-requirements={sectionId}>
      <h3>
        <button type="button" aria-expanded={isExpanded} aria-controls={listId}
          data-satisfied-requirements-toggle
          onClick={() => setIsExpanded(expanded => !expanded)}
          className="flex w-full items-center justify-between gap-3 rounded text-left text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Satisfied requirements</span>
            <span className="text-xs">({requirements.length})</span>
          </span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            aria-hidden="true" />
        </button>
      </h3>
      {!isCurrent && (
        <p className="mt-1 text-xs text-slate-600">Results from the last successful analysis.</p>
      )}
      <ul id={listId} hidden={!isExpanded} className="mt-3 space-y-3">
        {requirements.map((requirement, index) => (
          <li key={`${requirement.name}-${index}`} className="rounded border border-emerald-100 bg-white p-3">
            <p className="text-sm font-medium text-slate-900">{requirement.name}</p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-medium">Source: </span>
              {requirement.source === 'section' ? 'This section' : requirement.sourceName || 'Supporting document'}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">Evidence</p>
            <blockquote className="mt-1 whitespace-pre-wrap break-words border-l-2 border-emerald-200 pl-3 text-sm text-slate-700">
              {requirement.evidence}
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  );
}
