import { findingText, type IssueMetadata } from './issues';

/** The same finding context appears in authoring and review cards. */
export function FindingDetails({ finding, requirements = [] }: {
  finding: IssueMetadata;
  requirements?: readonly { id: string; title: string }[];
}) {
  const requirementId = findingText(finding.requirementId);
  const requirementName = findingText(requirements.find(requirement => requirement.id === requirementId)?.title);
  const source = findingText(finding.source);
  const reference = findingText(finding.reference);
  const remediation = findingText(finding.remediation);
  return (
    <dl className="my-2 space-y-2 text-xs text-slate-700" data-finding-details>
      {requirementId && (
        <div>
          <dt className="font-medium text-slate-900">Requirement</dt>
          <dd className="break-words">{requirementName || 'Linked requirement unavailable'}</dd>
        </div>
      )}
      <div>
        <dt className="font-medium text-slate-900">Source</dt>
        <dd className="whitespace-pre-wrap break-words">{source || reference || 'Not specified'}</dd>
      </div>
      {source && reference && (
        <div>
          <dt className="font-medium text-slate-900">Reference</dt>
          <dd className="whitespace-pre-wrap break-words">{reference}</dd>
        </div>
      )}
      <div>
        <dt className="font-medium text-slate-900">Target section</dt>
        <dd className="whitespace-pre-wrap break-words">{findingText(finding.targetSection) || 'Not specified'}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-900">Suggested remediation</dt>
        <dd className={`whitespace-pre-wrap break-words ${remediation ? '' : 'text-slate-500'}`}>
          {remediation || 'No suggestion available'}
        </dd>
      </div>
    </dl>
  );
}
