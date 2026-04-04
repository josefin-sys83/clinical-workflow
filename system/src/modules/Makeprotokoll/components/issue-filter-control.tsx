import React from 'react';

interface IssueFilterControlProps {
  filter: 'my-issues' | 'all-issues';
  onFilterChange: (filter: 'my-issues' | 'all-issues') => void;
  myIssuesCount: number;
  allIssuesCount: number;
}

export function IssueFilterControl({ 
  filter, 
  onFilterChange, 
  myIssuesCount, 
  allIssuesCount 
}: IssueFilterControlProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
      <button
        onClick={() => onFilterChange('my-issues')}
        className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
          filter === 'my-issues'
            ? 'bg-white text-slate-900 font-medium shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        My issues
        {myIssuesCount > 0 && (
          <span className={`ml-1.5 ${
            filter === 'my-issues' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            ({myIssuesCount})
          </span>
        )}
      </button>
      <button
        onClick={() => onFilterChange('all-issues')}
        className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
          filter === 'all-issues'
            ? 'bg-white text-slate-900 font-medium shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        All issues
        {allIssuesCount > 0 && (
          <span className={`ml-1.5 ${
            filter === 'all-issues' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            ({allIssuesCount})
          </span>
        )}
      </button>
    </div>
  );
}
