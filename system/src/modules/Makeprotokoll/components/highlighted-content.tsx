import React from 'react';
import { InlineIssueMarker } from './inline-issue-marker';

interface ContentIssue {
  id: string;
  type: 'conflict' | 'missing' | 'regulatory' | 'warning';
  startIndex: number;
  endIndex: number;
  tooltipText: string;
  issueId: string;
}

interface HighlightedContentProps {
  content: string;
  issues: ContentIssue[];
  fieldName: string;
  isEditable: boolean;
  isLocked: boolean;
  onIssueClick: (issueId: string) => void;
}

export function HighlightedContent({
  content,
  issues,
  fieldName,
  isEditable,
  isLocked,
  onIssueClick
}: HighlightedContentProps) {
  
  // If no issues, show plain content
  if (!issues || issues.length === 0) {
    return (
      <div className="relative">
        {isEditable ? (
          <textarea
            className="w-full min-h-[120px] px-4 py-3 text-sm text-slate-900 leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={content}
            disabled={isLocked}
          />
        ) : (
          <div className="px-4 py-3 text-sm text-slate-900 leading-relaxed bg-slate-50 border border-slate-200 rounded-md">
            {content}
          </div>
        )}
      </div>
    );
  }

  // Sort issues by start index
  const sortedIssues = [...issues].sort((a, b) => a.startIndex - b.startIndex);

  // Build segments
  const segments: React.ReactNode[] = [];
  let currentIndex = 0;

  sortedIssues.forEach((issue, idx) => {
    // Add text before issue
    if (currentIndex < issue.startIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {content.substring(currentIndex, issue.startIndex)}
        </span>
      );
    }

    // Determine severity based on issue type
    const severity = issue.type === 'conflict' || issue.type === 'regulatory' ? 'blocker' : 
                     issue.type === 'missing' ? 'high' : 'medium';

    // Add highlighted issue
    segments.push(
      <InlineIssueMarker
        key={`issue-${issue.id}`}
        text={content.substring(issue.startIndex, issue.endIndex)}
        issueType={issue.type}
        severity={severity}
        explanation={issue.tooltipText}
        source={issue.type === 'conflict' ? 'Synopsis § 2.3' : undefined}
        issueId={issue.issueId}
      />
    );

    currentIndex = issue.endIndex;
  });

  // Add remaining text
  if (currentIndex < content.length) {
    segments.push(
      <span key="text-final">
        {content.substring(currentIndex)}
      </span>
    );
  }

  return (
    <div className="relative">
      {isEditable ? (
        // Editable mode - show overlay with highlights
        <div className="relative">
          <textarea
            className="w-full min-h-[120px] px-4 py-3 text-sm text-transparent caret-slate-900 leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            defaultValue={content}
            disabled={isLocked}
          />
          {/* Overlay with highlights - positioned absolutely */}
          <div className="absolute inset-0 px-4 py-3 text-sm text-slate-900 leading-relaxed pointer-events-none">
            {segments}
          </div>
        </div>
      ) : (
        // Read-only mode - show highlights directly
        <div className="px-4 py-3 text-sm text-slate-900 leading-relaxed bg-slate-50 border border-slate-200 rounded-md">
          {segments}
        </div>
      )}
    </div>
  );
}