import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight, FileText, X } from 'lucide-react';

interface ProtocolCompletionModalProps {
  protocolName: string;
  versionId: string;
  onProceedToSubmission: () => void;
  onStayInProtocol: () => void;
  onClose: () => void;
}

export function ProtocolCompletionModal({
  protocolName,
  versionId,
  onProceedToSubmission,
  onStayInProtocol,
  onClose
}: ProtocolCompletionModalProps) {
  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Protocol is Complete
              </h2>
              <p className="text-sm text-slate-600">
                All sections have been reviewed and approved
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="mb-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Protocol Details
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Protocol:</span>
                <span className="font-medium text-slate-900">{protocolName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Version:</span>
                <span className="font-medium text-slate-900">{versionId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Status:</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200">
                  All Sections Approved
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-5">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 mb-1">
                  Next: Submission Preparation
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Prepare eTMF filing package, obtain final sign-offs, and generate authority-specific exports for regulatory submission.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The protocol content is now locked and immutable. Any future changes will require a formal amendment process with regulatory approval.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              onStayInProtocol();
              onClose();
            }}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-md hover:bg-white transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Stay in Protocol (read-only)
          </button>
          <button
            onClick={() => {
              onProceedToSubmission();
              onClose();
            }}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>Go to Submission Preparation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}