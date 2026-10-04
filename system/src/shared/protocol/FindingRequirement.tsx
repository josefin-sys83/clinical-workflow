import { findingText } from './issues';

export function FindingRequirement({ requirementId }: { requirementId?: string | null }) {
  const id = findingText(requirementId);
  if (!id) return null;
  return (
    <div className="my-2 text-xs text-slate-700" data-finding-requirement={id}>
      <span className="font-medium text-slate-900">Requirement: </span>
      <span className="break-words">{id}</span>
    </div>
  );
}
