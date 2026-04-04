import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ReviewModeEntryProps {
  onEnterReview: () => void;
  hasBlockers: boolean;
  blockerCount: number;
  allSectionsComplete: boolean;
  userRole: string;
}

export function ReviewModeEntry({ 
  onEnterReview, 
  hasBlockers, 
  blockerCount, 
  allSectionsComplete,
  userRole 
}: ReviewModeEntryProps) {
  const canEnter = userRole === 'Project Lead';

  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-900 mb-2">Ready for Review?</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Enter Review Mode to initiate formal review and approval process. 
            Reviewers will assess completeness, consistency, and regulatory compliance. 
            You can return to editing at any time based on feedback.
          </p>
          
          {hasBlockers && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded mb-3">
              <div className="flex-1">
                <p className="text-xs text-red-900 mb-1 font-medium">
                  {blockerCount} open blocker{blockerCount > 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-red-800 leading-relaxed">
                  You can still enter review mode. Reviewers will be notified of outstanding blockers 
                  and may request resolution before approval.
                </p>
              </div>
            </div>
          )}
          
          {!allSectionsComplete && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded mb-3">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-800 leading-relaxed">
                  Some sections are not yet complete. Review can proceed, but incomplete sections 
                  will be flagged for reviewers.
                </p>
              </div>
            </div>
          )}

          {!canEnter && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded mb-3">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only the Project Lead can initiate review mode.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={onEnterReview}
          disabled={!canEnter}
          className={`px-6 py-3 rounded text-sm font-medium transition-colors flex-shrink-0 ${
            canEnter
              ? 'bg-slate-700 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Enter Review Mode
        </button>
      </div>
    </div>
  );
}