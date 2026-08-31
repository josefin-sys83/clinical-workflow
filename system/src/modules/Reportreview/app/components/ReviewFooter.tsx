import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ReviewFooterProps {
  onApproveReport: () => void;
  onRequestChanges: () => void;
  canApprove: boolean;
  hasBlockers: boolean;
  hasSections: boolean;
  totalFindings?: number;
  acceptedFindings?: number;
}

export function ReviewFooter({
  onApproveReport,
  onRequestChanges,
  canApprove,
  hasBlockers,
  hasSections,
  totalFindings = 0,
  acceptedFindings = 0,
}: ReviewFooterProps) {
  return (
    <footer className="border-t border-neutral-200 bg-white px-12 py-4">
      {!canApprove && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-neutral-50 px-4 py-2 border border-neutral-200">
          <p className="text-sm text-neutral-600 flex-1">
            {!hasSections
              ? 'Report cannot be approved because no persisted report sections were loaded. Return to Report Authoring and generate or save the report sections.'
              : hasBlockers
              ? `Report cannot be approved. All findings must be accepted before approval. (${acceptedFindings}/${totalFindings} accepted)`
              : 'Report approval is temporarily unavailable.'}
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
            onClick={onApproveReport}
            disabled={!canApprove}
            className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve Report
          </button>
        </div>
      </div>
    </footer>
  );
}
