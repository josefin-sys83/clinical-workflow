import React from 'react';
import { CheckCircle, AlertTriangle, Play, RotateCcw, Lock } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review1' | 'Review2' | 'Review3' | 'Review4' | 'Locked';

interface SectionCompletionStatus {
  total: number;
  complete: number;
  draft: number;
  underReview: number;
  approved: number;
  locked: number;
}

interface ReviewModeControlPanelProps {
  reviewMode: ReviewMode;
  sectionStatus: SectionCompletionStatus;
  canStartReview: boolean;
  onStartReview: () => void;
  onProgressReview: () => void;
  onFinalLock: () => void;
  currentReviewers?: string[];
}

export function ReviewModeControlPanel({
  reviewMode,
  sectionStatus,
  canStartReview,
  onStartReview,
  onProgressReview,
  onFinalLock,
  currentReviewers = []
}: ReviewModeControlPanelProps) {
  
  const getReviewModeInfo = (mode: ReviewMode) => {
    switch (mode) {
      case 'Draft':
        return {
          title: 'Draft Mode',
          description: 'Content development in progress',
          color: 'slate',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
      case 'Review1':
        return {
          title: 'Review Round 1',
          description: 'Content Review',
          color: 'blue',
          bgColor: 'bg-white',
          borderColor: 'border-blue-200',
          textColor: 'text-slate-900'
        };
      case 'Review2':
        return {
          title: 'Review Round 2',
          description: 'Regulatory Review',
          color: 'amber',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
      case 'Review3':
        return {
          title: 'Review Round 3',
          description: 'QA/Compliance Review',
          color: 'purple',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
      case 'Review4':
        return {
          title: 'Review Round 4',
          description: 'Final Approval',
          color: 'green',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
      case 'Locked':
        return {
          title: 'Protocol Locked',
          description: 'Document locked for regulatory submission',
          color: 'slate',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
      default:
        return {
          title: 'Unknown',
          description: '',
          color: 'slate',
          bgColor: 'bg-white',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900'
        };
    }
  };

  const modeInfo = getReviewModeInfo(reviewMode);
  const completionPercentage = Math.round((sectionStatus.complete / sectionStatus.total) * 100);

  return (
    <div className={`px-8 py-6 border-b ${modeInfo.borderColor} ${modeInfo.bgColor}`}>
      <div className="max-w-6xl mx-auto">
        {/* Unified Status Header - Single calm area */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-medium text-slate-900">
                {modeInfo.title}
              </h2>
              <span className="text-sm text-slate-500">
                {modeInfo.description}
              </span>
            </div>
            
            {/* Compact progress info */}
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <span>{sectionStatus.complete} of {sectionStatus.total} sections complete</span>
              {currentReviewers.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{currentReviewers.join(', ')}</span>
                </>
              )}
            </div>
          </div>

          {/* Single Primary Action */}
          <div>
            {reviewMode === 'Draft' && canStartReview && (
              <button
                onClick={onStartReview}
                className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Start Review
              </button>
            )}

            {(reviewMode === 'Review1' || reviewMode === 'Review2' || reviewMode === 'Review3') && (
              <button
                onClick={onProgressReview}
                className="px-5 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Complete Round
              </button>
            )}

            {reviewMode === 'Review4' && (
              <button
                onClick={onFinalLock}
                className="px-5 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Lock Protocol
              </button>
            )}
          </div>
        </div>

        {/* Minimal progress bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 bg-slate-900"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Blocker warning - only if cannot progress */}
        {reviewMode === 'Draft' && !canStartReview && (
          <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
            All sections must be marked complete before starting review
          </div>
        )}
      </div>
    </div>
  );
}