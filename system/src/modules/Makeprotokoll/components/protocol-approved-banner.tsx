import React from 'react';
import { CheckCircle, X, ArrowRight } from 'lucide-react';

interface ProtocolApprovedBannerProps {
  onDismiss: () => void;
  onGoToSubmission: () => void;
}

export function ProtocolApprovedBanner({ onDismiss, onGoToSubmission }: ProtocolApprovedBannerProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-green-900">
              Protocol locked. Changes require formal amendment.
            </h3>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-0.5 text-green-600 hover:text-green-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-green-800 mb-3 leading-relaxed">
            All sections are now immutable. Any future changes require formal amendment approval per ISO 14155:2020.
          </p>
          <button
            onClick={onGoToSubmission}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <span>Go to Submission Preparation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}