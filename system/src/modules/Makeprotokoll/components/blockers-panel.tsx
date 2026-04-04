import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface Blocker {
  id: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  owner: string;
  daysOpen: number;
}

const blockers: Blocker[] = [
  {
    id: 'B1',
    priority: 'High',
    description: 'Sample size justification pending biostatistician approval',
    owner: 'Medical Writer',
    daysOpen: 5
  },
  {
    id: 'B2',
    priority: 'Medium',
    description: 'FDA IDE submission requirements need clarification from Regulatory Affairs',
    owner: 'Project Manager',
    daysOpen: 3
  },
  {
    id: 'B3',
    priority: 'Low',
    description: 'Visit schedule conflicts with endpoint assessment timeline',
    owner: 'Clinical Operations',
    daysOpen: 1
  }
];

export function BlockersPanel() {
  const getPriorityStyles = (priority: Blocker['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Active Blockers</h3>
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
          {blockers.length}
        </span>
      </div>

      <div className="space-y-3">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getPriorityStyles(blocker.priority)}`}>
                    {blocker.priority}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{blocker.daysOpen}d open</span>
                  </div>
                </div>
                <p className="text-sm text-slate-900 mb-2">{blocker.description}</p>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Owner:</span> {blocker.owner}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-3 w-full px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
        + Add Blocker
      </button>
    </div>
  );
}
