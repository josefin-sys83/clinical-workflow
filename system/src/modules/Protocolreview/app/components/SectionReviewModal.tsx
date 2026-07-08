import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface SectionReviewModalProps {
  isOpen: boolean;
  sectionTitle: string;
  action: 'approve' | 'reject';
  reviewerName: string;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}

export function SectionReviewModal({
  isOpen,
  sectionTitle,
  action,
  reviewerName,
  onClose,
  onConfirm,
}: SectionReviewModalProps) {
  const [comment, setComment] = useState('');

  const isApprove = action === 'approve';
  const canSubmit = isApprove || !!comment.trim();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setComment('');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {isApprove ? 'Approve Section' : 'Reject Section'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove ? (
              <>
                You are approving <span className="font-semibold text-neutral-900">{sectionTitle}</span>.
                This section will be marked as reviewed and approved by Regulatory Affairs.
              </>
            ) : (
              <>
                You are rejecting <span className="font-semibold text-neutral-900">{sectionTitle}</span>.
                The section authors will need to address the issues before this section can be approved.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            {isApprove ? 'Comment' : 'Reason for rejection'}{' '}
            {!isApprove ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-neutral-400 font-normal">(optional)</span>
            )}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={
              isApprove
                ? 'Optional comment for this approval…'
                : 'Explain what must be revised before this section can be approved…'
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p className="text-xs text-neutral-400">
          Reviewing as <span className="font-medium text-neutral-600">{reviewerName}</span> · Regulatory Affairs
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              onConfirm(comment.trim());
              setComment('');
            }}
            className={isApprove ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
          >
            {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
