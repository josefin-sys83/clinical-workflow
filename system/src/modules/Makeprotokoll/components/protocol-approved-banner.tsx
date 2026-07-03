import React from 'react';
import { CheckCircle, X, ArrowRight } from 'lucide-react';

interface ProtocolApprovedBannerProps {
  onDismiss: () => void;
  onGoToSubmission: () => void;
}

export function ProtocolApprovedBanner({ onDismiss, onGoToSubmission }: ProtocolApprovedBannerProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-blue-900">
              Protocol locked. Changes require formal amendment.
            </h3>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-0.5 text-indigo-600 hover:text-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-blue-700 mb-3 leading-relaxed">
            All sections are now immutable. Any future changes require formal amendment approval per ISO 14155:2020.
          </p>
          <button
            onClick={onGoToSubmission}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-800 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <span>Go to Submission Preparation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}