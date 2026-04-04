import React from 'react';
import { Users, Clock, AlertCircle } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review1' | 'Review2' | 'Review3' | 'Review4' | 'Locked';

interface ProjectTopBarProps {
  protocolId: string;
  protocolTitle: string;
  version: string;
  lastModified: string;
  protocolLead: string;
  reviewMode: ReviewMode;
  setReviewMode: (mode: ReviewMode) => void;
}

export function ProjectTopBar({ protocolId, protocolTitle, version, lastModified, protocolLead, reviewMode, setReviewMode }: ProjectTopBarProps) {
  const getStatusBadge = (mode: ReviewMode) => {
    switch (mode) {
      case 'Draft':
        return { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'Review1':
        return { label: 'Content Review', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'Review2':
        return { label: 'Regulatory Review', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'Review3':
        return { label: 'QA Review', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'Review4':
        return { label: 'Final Approval', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'Locked':
        return { label: 'Locked', color: 'bg-slate-200 text-slate-700 border-slate-300' };
      default:
        return { label: 'Unknown', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const status = getStatusBadge(reviewMode);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Project Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              TAVR-EVOLVE-EU Clinical Investigation Protocol
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
              <span>Protocol v4.0.1</span>
              <span className="text-slate-300">•</span>
              <span>EU MDR 2017/745</span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Last modified: Feb 5, 2026 at 14:23 CET</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Status & Reviewers */}
        <div className="flex items-center gap-4">
          {/* Active Reviewers */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Users className="w-4 h-4 text-slate-600" />
            <div className="text-xs">
              <span className="text-slate-600">Active reviewers:</span>{' '}
              <span className="font-medium text-slate-900">3</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-3 py-1.5 text-xs font-medium border rounded-lg ${status.color}`}>
            {status.label}
          </div>

          {/* Issues Alert */}
          {(reviewMode === 'Review1' || reviewMode === 'Review2' || reviewMode === 'Review3') && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-900">4 open issues</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}