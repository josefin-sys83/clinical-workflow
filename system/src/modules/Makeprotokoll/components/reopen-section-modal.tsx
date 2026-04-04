import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, CheckCircle } from 'lucide-react';

interface ReopenSectionModalProps {
  sectionNumber: string;
  sectionTitle: string;
  currentReviewRound: number;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function ReopenSectionModal({
  sectionNumber,
  sectionTitle,
  currentReviewRound,
  onConfirm,
  onClose
}: ReopenSectionModalProps) {
  const [reason, setReason] = useState('');
  const [impactAcknowledged, setImpactAcknowledged] = useState(false);

  const handleSubmit = () => {
    if (reason.trim() && impactAcknowledged) {
      onConfirm(reason);
      onClose();
    }
  };

  const nextReviewRound = currentReviewRound + 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Reopen Section for Revision
            </h2>
            <p className="text-sm text-slate-600">
              Section {sectionNumber}: {sectionTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Impact Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-900 mb-2">
                  Impact of Reopening Section
                </div>
                <div className="text-xs text-amber-800 space-y-2">
                  <p>
                    Reopening this section will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Return the section to <strong>"Changes Required"</strong> status</li>
                    <li>Allow content editing by the assigned owner</li>
                    <li>Create <strong>Review Round {nextReviewRound}</strong> once changes are complete</li>
                    <li>Require re-approval from all reviewers in the next round</li>
                    <li>Extend the overall review timeline</li>
                    <li>Be logged in the audit trail for regulatory compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Current Review Status */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Current Review Status
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-slate-600 mb-1">Current Round</div>
                <div className="font-semibold text-slate-900">Round {currentReviewRound}</div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Next Round</div>
                <div className="font-semibold text-blue-700">Round {nextReviewRound}</div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Section Status</div>
                <div className="font-semibold text-amber-700">Will be reopened</div>
              </div>
            </div>
          </div>

          {/* Reason for Reopening */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Reason for Reopening <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-slate-600 mb-2">
              Provide a clear explanation for why this section needs to be reopened. This will be visible in the audit trail.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Primary endpoint definition conflicts with Synopsis § 2.3. Need to align cardiovascular mortality terminology across all documents before regulatory review."
              className="w-full h-32 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-500">
                Minimum 20 characters required
              </span>
              <span className={`text-xs ${reason.length >= 20 ? 'text-green-600' : 'text-slate-400'}`}>
                {reason.length} / 20
              </span>
            </div>
          </div>

          {/* Workflow Impact */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide">
              Next Steps After Reopening
            </div>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <strong>Content Owner Notified:</strong> {sectionNumber} owner will be notified to make required revisions
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <strong>Revision Period:</strong> Owner makes changes and marks section as "Ready for Review"
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <strong>New Review Round:</strong> All reviewers re-evaluate the updated content in Round {nextReviewRound}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <strong>Approval Required:</strong> Section must be re-approved before progressing to next phase
                </div>
              </div>
            </div>
          </div>

          {/* Acknowledgment */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-300 rounded-lg">
            <input
              type="checkbox"
              id="impact-acknowledge"
              checked={impactAcknowledged}
              onChange={(e) => setImpactAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="impact-acknowledge" className="text-xs text-slate-700 cursor-pointer">
              I understand that reopening this section will create Review Round {nextReviewRound} and require 
              re-approval from all reviewers. This action will be logged in the audit trail for regulatory compliance.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!reason.trim() || reason.length < 20 || !impactAcknowledged}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 ${
                reason.trim() && reason.length >= 20 && impactAcknowledged
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Reopen Section & Start Round {nextReviewRound}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
