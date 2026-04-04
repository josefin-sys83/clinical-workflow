import React, { useState } from 'react';
import { X, AlertTriangle, Link2, ChevronRight } from 'lucide-react';

interface UnlockAmendmentModalProps {
  protocolName: string;
  versionId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function UnlockAmendmentModal({
  protocolName,
  versionId,
  onConfirm,
  onCancel
}: UnlockAmendmentModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
    }
  };

  // ESC key handler
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50" 
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Request Protocol Amendment
                </h2>
                <p className="text-sm text-slate-700 mt-1">
                  {protocolName} — Version {versionId}
                </p>
              </div>
            </div>
            <button 
              onClick={onCancel} 
              className="p-1 hover:bg-amber-100 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Warning Notice */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900 mb-1">
                  Regulatory Impact Warning
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  Unlocking the protocol will revert all sections to editable state and initiate a new amendment cycle. 
                  All prior approvals will be marked as superseded and re-approval will be required. 
                  This action is audit-logged per ISO 14155:2020 § 6.3.8 and 21 CFR Part 11.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Amendment Justification <span className="text-red-600">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Provide detailed justification for protocol amendment (e.g., 'Update primary endpoint definition based on regulatory feedback from competent authority'). This will be audit-logged and included in regulatory documentation."
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-600 mt-1">
              Required for regulatory traceability and ethics committee notification
            </p>
          </div>

          {/* Consequence Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-sm font-medium text-slate-900 mb-2">
              Amendment Process:
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">1.</span>
                <span>All sections revert to "Reopened" status and become editable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">2.</span>
                <span>Version increments to amendment (e.g., v2.1 → v2.2)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">3.</span>
                <span>Prior approvals marked as "Superseded by Amendment"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">4.</span>
                <span>All sections require re-review and re-approval</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">5.</span>
                <span>Ethics committee notification required before implementation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">6.</span>
                <span>Audit event logged with user ID, timestamp, and justification</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              reason.trim()
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm Amendment Request
          </button>
        </div>
      </div>
    </div>
  );
}