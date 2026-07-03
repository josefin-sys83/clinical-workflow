import { useState } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';

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

  if (!isOpen) return null;

  const isApprove = action === 'approve';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApprove && !comment.trim()) return;
    onConfirm(comment.trim());
    setComment('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <h2 className="text-base font-semibold text-neutral-900">
              {isApprove ? 'Approve Section' : 'Reject Section'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            {isApprove ? (
              <>
                You are approving{' '}
                <span className="font-semibold text-neutral-900">{sectionTitle}</span>. This
                section will be marked as reviewed and approved by Regulatory Affairs.
              </>
            ) : (
              <>
                You are rejecting{' '}
                <span className="font-semibold text-neutral-900">{sectionTitle}</span>. The
                section authors will need to address the issues before this section can be
                approved.
              </>
            )}
          </p>

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
              required={!isApprove}
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
            Reviewing as{' '}
            <span className="font-medium text-neutral-600">{reviewerName}</span> · Regulatory Affairs
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md border border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isApprove && !comment.trim()}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isApprove ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
