import React from 'react';
import { CheckCircle, Circle, AlertCircle, Lock, Sparkles } from 'lucide-react';

interface Section {
  id: string;
  number: string;
  title: string;
  status: 'Draft (AI)' | 'Approved' | 'Locked';
}

interface CompletionChecklistProps {
  sections: Section[];
}

export function CompletionChecklist({ sections }: CompletionChecklistProps) {
  const getChecklistStatus = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Locked':
        return 'complete';
      case 'Draft (AI)':
      default:
        return 'missing';
    }
  };

  const checklistItems = sections.map(s => ({
    id: s.id,
    label: `${s.number} ${s.title}`,
    status: getChecklistStatus(s.status),
    originalStatus: s.status
  }));

  const completedCount = checklistItems.filter(i => i.status === 'complete').length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Protocol Completion</h3>
        <span className="text-sm font-medium text-slate-600">
          {completedCount} / {totalCount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-slate-600 mt-1.5">{progressPercent}% Complete</div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="mt-0.5 flex-shrink-0">
              {item.status === 'complete' && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              {item.status === 'missing' && (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900">{item.label}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.originalStatus === 'Locked' && (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
                {item.originalStatus === 'Draft (AI)' && (
                  <Sparkles className="w-3 h-3 text-purple-500" />
                )}
                <span className={`text-xs ${
                  item.status === 'complete' ? 'text-green-600' :
                  'text-slate-500'
                }`}>
                  {item.originalStatus}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>Locked/Approved:</span>
            <span className="font-medium text-green-700">{checklistItems.filter(i => i.status === 'complete').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Draft (AI):</span>
            <span className="font-medium text-slate-600">{checklistItems.filter(i => i.status === 'missing').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}