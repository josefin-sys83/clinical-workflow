import { Link } from 'react-router-dom';
import type { LatestAmendment } from '../hooks/useProtocolStatus';

interface Props {
  projectId: string;
  latestAmendment?: LatestAmendment | null;
}

export function ProtocolFinalizedBanner({ projectId, latestAmendment }: Props) {
  if (latestAmendment?.state === 'pending') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800">
          Amendment #{latestAmendment.number} pending approval
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          "{latestAmendment.title}" is awaiting approval from Protocol Lead or Clinical Affairs VP.
        </p>
      </div>
    );
  }

  if (latestAmendment?.state === 'approved') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800">
          Amendment #{latestAmendment.number} approved — action required
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          "{latestAmendment.title}" has been approved. Update the affected protocol sections and complete the{' '}
          <Link
            to={`/projects/${projectId}/workflow/protocol/amendment`}
            className="underline font-medium hover:text-amber-900"
          >
            Amendment Form
          </Link>
          .
        </p>
      </div>
    );
  }

  if (latestAmendment?.state === 'finalized') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800">
          Amendment #{latestAmendment.number} finalized
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          "{latestAmendment.title}" has been finalized. All changes are documented and signed.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm font-medium text-amber-800">Protocol finalized</p>
      <p className="text-sm text-amber-700 mt-0.5">
        The protocol has been finalized. Your changes require a formal{' '}
        <Link to={`/projects/${projectId}/workflow/protocol/amendment`} className="underline font-medium hover:text-amber-900">
          protocol amendment
        </Link>
        .
      </p>
    </div>
  );
}
