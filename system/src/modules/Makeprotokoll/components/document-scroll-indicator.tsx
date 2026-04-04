import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface IssuePosition {
  id: string;
  type: 'missing' | 'conflict' | 'regulatory';
  percentage: number; // 0-100, position in document
  sectionNumber: string;
}

interface DocumentScrollIndicatorProps {
  issues: IssuePosition[];
  onIssueClick: (issueId: string) => void;
}

export function DocumentScrollIndicator({ issues, onIssueClick }: DocumentScrollIndicatorProps) {
  const getIssueColor = (type: string) => {
    switch (type) {
      case 'missing':
        return 'bg-amber-500';
      case 'conflict':
        return 'bg-amber-600';
      case 'regulatory':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="fixed right-8 top-32 bottom-8 w-1.5 bg-slate-200 rounded-full overflow-visible group">
      {/* Issue markers */}
      {issues.map((issue) => (
        <button
          key={issue.id}
          className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${getIssueColor(issue.type)} hover:scale-150 transition-transform cursor-pointer z-10`}
          style={{ top: `${issue.percentage}%` }}
          onClick={() => onIssueClick(issue.id)}
          title={`${issue.type} issue in ${issue.sectionNumber}`}
        />
      ))}

      {/* Hover tooltip */}
      <div className="absolute left-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} in document
        </div>
      </div>
    </div>
  );
}
