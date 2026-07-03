import React from 'react';
import { Eye, Edit3, AlertCircle } from 'lucide-react';

interface ReviewModeIndicatorProps {
  isReviewMode: boolean;
  reviewCycle: number;
  onExitReview: () => void;
  openIssuesCount: number;
  blockerCount: number;
}

export function ReviewModeIndicator({ 
  isReviewMode, 
  reviewCycle, 
  onExitReview, 
  openIssuesCount,
  blockerCount 
}: ReviewModeIndicatorProps) {
  if (!isReviewMode) return null;

  return (
    <div className="bg-purple-50 border-b border-purple-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-700" />
            <span className="text-sm font-medium text-purple-900">
              Review Mode Active
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded border border-purple-300">
              Cycle {reviewCycle}
            </span>
          </div>
          
          {blockerCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 border border-rose-200 rounded">
              <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
              <span className="text-xs text-rose-800 font-medium">
                {blockerCount} blocker{blockerCount > 1 ? 's' : ''} open
              </span>
            </div>
          )}
          
          {openIssuesCount > 0 && blockerCount === 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-800">
                {openIssuesCount} issue{openIssuesCount > 1 ? 's' : ''} open
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-purple-700">
            Focus on review, comments, and consistency checks
          </span>
          <button 
            onClick={onExitReview}
            className="px-3 py-1.5 bg-white border border-purple-300 text-purple-800 text-xs rounded hover:bg-purple-50 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Exit Review Mode
          </button>
        </div>
      </div>
    </div>
  );
}
