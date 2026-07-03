import { useState } from 'react';
import { X } from 'lucide-react';

interface ReviewFooterProps {
  onApprove: (reason: string) => Promise<void>;
  onRequestChanges: (reason: string) => Promise<void>;
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
  // ── Approve modal ──────────────────────────────────────────────────────────
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveReason, setApproveReason] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  const handleOpenApprove = () => {
    setApproveReason('');
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!approveReason.trim()) return;
    setApproveSubmitting(true);
    try {
      await onApprove(approveReason.trim());
    } finally {
      setApproveSubmitting(false);
      setApproveModalOpen(false);
    }
  };

  // ── Request Changes modal ──────────────────────────────────────────────────
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [changesSubmitting, setChangesSubmitting] = useState(false);

  const handleOpenChanges = () => {
    setChangesReason('');
    setChangesModalOpen(true);
  };

  const handleConfirmChanges = async () => {
    if (!changesReason.trim()) return;
    setChangesSubmitting(true);
    try {
      await onRequestChanges(changesReason.trim());
    } finally {
      setChangesSubmitting(false);
      setChangesModalOpen(false);
    }
  };

  return (
    <>
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
              onClick={handleOpenChanges}
              className="rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Request Changes
            </button>

            <button
              onClick={handleOpenApprove}
              disabled={hasBlockers || isLoadingAction}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Approve Protocol
            </button>
          </div>
        </div>
      </footer>

      {/* ── Approve Protocol modal ─────────────────────────────────────────── */}
      {approveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 flex flex-col">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">Approve Protocol</h2>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-xs font-medium text-neutral-700 mb-2">
                Approval comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="Confirm the protocol has been reviewed and is approved for the next stage…"
                rows={5}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={!approveReason.trim() || approveSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveSubmitting ? 'Approving…' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes modal ──────────────────────────────────────────── */}
      {changesModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 flex flex-col">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">Request Changes</h2>
              <button
                onClick={() => setChangesModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-xs font-medium text-neutral-700 mb-2">
                Reason for requesting changes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={changesReason}
                onChange={(e) => setChangesReason(e.target.value)}
                placeholder="Describe what needs to be changed…"
                rows={5}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setChangesModalOpen(false)}
                className="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChanges}
                disabled={!changesReason.trim() || changesSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changesSubmitting ? 'Submitting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
