import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

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

      {/* ── Approve Protocol dialog ─────────────────────────────────────────── */}
      <AlertDialog
        open={approveModalOpen}
        onOpenChange={(open) => { if (!approveSubmitting) setApproveModalOpen(open); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Protocol</AlertDialogTitle>
          </AlertDialogHeader>
          <div>
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!approveReason.trim() || approveSubmitting}
              onClick={(e) => { e.preventDefault(); handleConfirmApprove(); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {approveSubmitting ? 'Approving…' : 'Confirm Approval'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Request Changes dialog ──────────────────────────────────────────── */}
      <AlertDialog
        open={changesModalOpen}
        onOpenChange={(open) => { if (!changesSubmitting) setChangesModalOpen(open); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Changes</AlertDialogTitle>
          </AlertDialogHeader>
          <div>
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changesSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!changesReason.trim() || changesSubmitting}
              onClick={(e) => { e.preventDefault(); handleConfirmChanges(); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {changesSubmitting ? 'Submitting…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
