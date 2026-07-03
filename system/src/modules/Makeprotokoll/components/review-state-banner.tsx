import React from 'react';
import { Eye, Lock, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ReviewStateBannerProps {
  mode: 'Draft' | 'Review' | 'Locked';
  reviewCycle?: number;
  startedBy?: string;
  startedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  versionId?: string;
}

export function ReviewStateBanner({
  mode,
  reviewCycle,
  startedBy,
  startedAt,
  approvedBy,
  approvedAt,
  lockedBy,
  lockedAt,
  versionId
}: ReviewStateBannerProps) {
  
  if (mode === 'Draft') {
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">Edit Mode</span>
            </div>
            <span className="text-xs text-slate-500">
              Protocol is open for editing. All changes are logged and tracked.
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Audit trail active
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'Review') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-700" />
              <span className="text-sm font-semibold text-blue-900">
                Review Round #{reviewCycle} in Progress
              </span>
            </div>
            <div className="text-xs text-blue-800">
              Started by {startedBy} on {startedAt}. Protocol is read-only during review.
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 border border-blue-300 rounded-md">
            <Eye className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-xs font-medium text-blue-900">Review Mode</span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'Locked') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-blue-700" />
              <span className="text-sm font-semibold text-blue-900">
                Protocol Approved & Locked
              </span>
            </div>
            <div className="text-xs text-blue-700 space-x-3">
              <span>Approved by {approvedBy} on {approvedAt}</span>
              <span>•</span>
              <span>Locked by {lockedBy} on {lockedAt}</span>
              {versionId && (
                <>
                  <span>•</span>
                  <span>Version {versionId}</span>
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-blue-700 font-medium">
              This protocol is locked. Further changes require a formal amendment.
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-xs font-medium text-blue-900">Locked</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
