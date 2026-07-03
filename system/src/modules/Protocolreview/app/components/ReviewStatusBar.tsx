import { CheckCircle2, XCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import type { SectionReview, RegulatoryFinding } from '../types/review';

interface ReviewStatusBarProps {
  totalSections: number;
  sectionReviews: Record<string, SectionReview>;
  findings: RegulatoryFinding[];
}

export function ReviewStatusBar({ totalSections, sectionReviews, findings }: ReviewStatusBarProps) {
  const reviews = Object.values(sectionReviews);
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length;
  const pendingCount = totalSections - reviews.length;

  const unacceptedBlockers = findings.filter((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const acceptedBlockers = findings.filter((f) => f.severity === 'blocker' && f.acceptedRisk);
  const unacceptedWarnings = findings.filter((f) => f.severity === 'warning' && !f.acceptedRisk);

  const allReviewed = pendingCount === 0 && rejectedCount === 0;
  const noUnacceptedBlockers = unacceptedBlockers.length === 0;

  return (
    <div className="bg-slate-50 border-b border-neutral-200 px-6 py-2.5">
      <div className="flex items-center gap-6 text-xs">
        {/* Section progress */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium uppercase tracking-wide text-[10px]">
            Sections
          </span>
          {approvedCount > 0 && (
            <span className="flex items-center gap-1 text-blue-700 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {approvedCount} approved
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="flex items-center gap-1 text-rose-700 font-medium">
              <XCircle className="h-3 w-3" />
              {rejectedCount} rejected
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              <Clock className="h-3 w-3" />
              {pendingCount} pending
            </span>
          )}
          {totalSections === 0 && (
            <span className="text-neutral-400">No sections</span>
          )}
        </div>

        <div className="h-3 w-px bg-neutral-300" />

        {/* Findings */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium uppercase tracking-wide text-[10px]">
            Findings
          </span>
          {unacceptedBlockers.length > 0 && (
            <span className="flex items-center gap-1 text-rose-700 font-medium">
              <AlertCircle className="h-3 w-3" />
              {unacceptedBlockers.length} blocker{unacceptedBlockers.length !== 1 ? 's' : ''}
            </span>
          )}
          {acceptedBlockers.length > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              <Shield className="h-3 w-3" />
              {acceptedBlockers.length} risk{acceptedBlockers.length !== 1 ? 's' : ''} accepted
            </span>
          )}
          {unacceptedWarnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              {unacceptedWarnings.length} warning{unacceptedWarnings.length !== 1 ? 's' : ''}
            </span>
          )}
          {findings.length === 0 && (
            <span className="text-neutral-400">No findings</span>
          )}
        </div>

        {/* Overall readiness pill */}
        <div className="ml-auto">
          {allReviewed && noUnacceptedBlockers ? (
            <span className="flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <CheckCircle2 className="h-3 w-3" />
              Ready for final approval
            </span>
          ) : allReviewed && !noUnacceptedBlockers ? (
            <span className="flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <AlertCircle className="h-3 w-3" />
              {unacceptedBlockers.length} blocker{unacceptedBlockers.length !== 1 ? 's' : ''} need acceptance
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-500 bg-white px-2.5 py-1 rounded-full border border-neutral-200">
              <Clock className="h-3 w-3" />
              Review in progress
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
