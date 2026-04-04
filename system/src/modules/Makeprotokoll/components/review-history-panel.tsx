import React from 'react';
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Clock } from 'lucide-react';

interface ReviewRound {
  roundNumber: number;
  reviewType: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'issues-found';
  reviewers: {
    name: string;
    role: string;
    decision: 'approved' | 'approved-with-comments' | 'changes-required' | 'pending';
    timestamp: string;
    comments?: string;
  }[];
  outcome: string;
  sectionsReturned?: string[];
}

interface ReviewHistoryPanelProps {
  onViewDetails?: (roundNumber: number) => void;
}

export function ReviewHistoryPanel({ onViewDetails }: ReviewHistoryPanelProps) {
  const reviewHistory: ReviewRound[] = [
    {
      roundNumber: 1,
      reviewType: 'Content Review',
      startDate: 'Feb 2, 2026',
      endDate: 'Feb 4, 2026',
      status: 'issues-found',
      reviewers: [
        {
          name: 'Dr. James Patterson',
          role: 'Clinical Lead',
          decision: 'changes-required',
          timestamp: 'Feb 4, 2026 at 10:15 CET',
          comments: 'Section 4.2 endpoint definition conflicts with approved Synopsis. Requires revision before regulatory review.'
        },
        {
          name: 'Dr. Michael Zhang',
          role: 'Biostatistician',
          decision: 'approved-with-comments',
          timestamp: 'Feb 4, 2026 at 14:30 CET',
          comments: 'Statistical sections are sound. Minor comment on sample size justification documentation.'
        },
        {
          name: 'Emma Rodriguez',
          role: 'Medical Writer',
          decision: 'changes-required',
          timestamp: 'Feb 4, 2026 at 16:45 CET',
          comments: 'Will revise section 4.2 to align with Synopsis § 2.3'
        }
      ],
      outcome: 'Issues found – Sections reopened for revision',
      sectionsReturned: ['4.2 Study Rationale & Objectives', '4.8 Statistical Methods']
    }
  ];

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'approved-with-comments':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'changes-required':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved-with-comments':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'changes-required':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'issues-found':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Review Round History</h3>
        <span className="text-xs text-slate-600">
          {reviewHistory.length} round{reviewHistory.length !== 1 ? 's' : ''} completed
        </span>
      </div>

      {reviewHistory.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-sm text-slate-600">No review rounds completed yet</div>
          <div className="text-xs text-slate-500 mt-1">
            Review history will appear here once the first review round is complete
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewHistory.map((round) => (
            <div
              key={round.roundNumber}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white"
            >
              {/* Round Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(round.status)}
                    <div>
                      <div className="font-semibold text-slate-900">
                        Review Round {round.roundNumber} – {round.reviewType}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {round.startDate} → {round.endDate}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewDetails?.(round.roundNumber)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                  >
                    View Details
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Reviewers */}
              <div className="p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Reviewer Decisions
                </div>
                {round.reviewers.map((reviewer, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="mt-0.5">
                      {getDecisionIcon(reviewer.decision)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {reviewer.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {reviewer.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium border rounded ${getDecisionBadge(
                            reviewer.decision
                          )}`}
                        >
                          {reviewer.decision.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mb-1">
                        {reviewer.timestamp}
                      </div>
                      {reviewer.comments && (
                        <p className="text-xs text-slate-700 leading-relaxed mt-2">
                          {reviewer.comments}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Outcome */}
              <div className="px-4 pb-4">
                <div
                  className={`p-3 rounded-lg border ${
                    round.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : round.status === 'issues-found'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Outcome
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      round.status === 'completed'
                        ? 'text-green-900'
                        : round.status === 'issues-found'
                        ? 'text-amber-900'
                        : 'text-blue-900'
                    }`}
                  >
                    {round.outcome}
                  </div>
                  {round.sectionsReturned && round.sectionsReturned.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-700 mb-1">
                        Sections reopened for revision:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {round.sectionsReturned.map((section, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 text-xs bg-white border border-slate-300 text-slate-700 rounded"
                          >
                            {section}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Round Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-700 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-900 mb-1">
              Review Round 2 – Regulatory Review
            </div>
            <div className="text-xs text-blue-800">
              In progress since Feb 5, 2026. Awaiting regulatory team review and approval.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
