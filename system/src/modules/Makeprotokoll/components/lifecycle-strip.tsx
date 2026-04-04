import React from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Lock } from 'lucide-react';

export type SectionStatus = 'Draft (AI)' | 'In Review' | 'Changes Required' | 'Approved' | 'Locked' | 'Re-opened';

interface LifecycleStripProps {
  cycleNumber: number;
  status: SectionStatus;
  openFindingsCount: number;
  lastAction: {
    description: string;
    timestamp: string;
  };
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}

export function LifecycleStrip({
  cycleNumber,
  status,
  openFindingsCount,
  lastAction,
  onPrimaryAction,
  primaryActionLabel
}: LifecycleStripProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'Draft (AI)':
        return <RefreshCw className="w-4 h-4 text-slate-600" />;
      case 'In Review':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Changes Required':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'Locked':
        return <Lock className="w-4 h-4 text-slate-600" />;
      case 'Re-opened':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'Draft (AI)':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'In Review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Changes Required':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Approved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Locked':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Re-opened':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPrimaryActionStyle = () => {
    if (status === 'Changes Required') {
      return 'bg-amber-600 hover:bg-amber-700 text-white';
    }
    if (status === 'Approved' || status === 'In Review') {
      return 'bg-green-600 hover:bg-green-700 text-white';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  };

  return (
    <div className="px-6 py-3 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between">
        {/* Left side - Lifecycle info */}
        <div className="flex items-center gap-6">
          {/* Cycle Number */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Review Cycle:</span>
            <span className="px-2 py-1 bg-slate-900 text-white text-sm font-bold rounded">
              {cycleNumber}
            </span>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{status}</span>
          </div>

          {/* Open Findings */}
          {openFindingsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {openFindingsCount} Open Finding{openFindingsCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Last Action */}
          <div className="text-xs text-slate-600">
            <span className="text-slate-500">Last action:</span> {lastAction.description}
            <span className="text-slate-400 ml-1">• {lastAction.timestamp}</span>
          </div>
        </div>

        {/* Right side - Primary Action */}
        <button
          onClick={onPrimaryAction}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${getPrimaryActionStyle()}`}
        >
          {primaryActionLabel}
        </button>
      </div>
    </div>
  );
}
