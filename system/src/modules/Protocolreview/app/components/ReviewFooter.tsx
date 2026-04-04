import { AlertCircle } from 'lucide-react';

interface ReviewFooterProps {
  onApprove: () => void;
  onRequestChanges: () => void;
  canApprove: boolean;
  hasBlockers: boolean;
  isLoadingAction: boolean;
}

export function ReviewFooter({
  onApprove,
  onRequestChanges,
  canApprove,
  hasBlockers,
  isLoadingAction,
}: ReviewFooterProps) {
  return (
    <footer className="border-t border-neutral-200 bg-white px-12 py-4">
      {hasBlockers && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-neutral-50 px-4 py-2 border border-neutral-200">
          <p className="text-sm text-neutral-600">
            Report cannot be approved. Critical blockers must be resolved before approval.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          Review all sections and findings before approving this report.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onRequestChanges}
            className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <AlertCircle className="h-4 w-4" />
            Request Changes
          </button>

          <button
            onClick={onApprove}
            disabled={hasBlockers || isLoadingAction}
            className="flex items-center gap-2 rounded-md bg-blue-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve Protocol
          </button>
        </div>
      </div>
    </footer>
  );
}