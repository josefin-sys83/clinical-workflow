import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ContentIssue {
  id: string;
  type: 'conflict' | 'missing' | 'regulatory' | 'warning';
  startIndex: number;
  endIndex: number;
  tooltipText: string;
  issueId: string;
}

interface ProtocolTextEditorProps {
  label: string;
  content: string;
  isEditable: boolean;
  isLocked: boolean;
  issues: ContentIssue[];
  onIssueClick?: (issueId: string) => void;
  onChange?: (value: string) => void;
}

export function ProtocolTextEditor({
  label,
  content,
  isEditable,
  isLocked,
  issues,
  onIssueClick,
  onChange
}: ProtocolTextEditorProps) {
  
  // Group issues by severity for margin indicator
  const hasBlocker = issues.some(i => i.type === 'conflict' || i.type === 'regulatory');
  const hasHigh = issues.some(i => i.type === 'missing');
  const hasWarning = issues.some(i => i.type === 'warning');

  const getMarkerColor = () => {
    if (hasBlocker) return 'bg-red-400';
    if (hasHigh) return 'bg-orange-400';
    if (hasWarning) return 'bg-amber-400';
    return 'bg-slate-300';
  };

  const getMarkerIcon = () => {
    if (hasBlocker) return <AlertTriangle className="w-3 h-3 text-red-700" />;
    if (hasHigh) return <AlertCircle className="w-3 h-3 text-orange-700" />;
    if (hasWarning) return <Info className="w-3 h-3 text-amber-700" />;
    return null;
  };

  const getSeverityLabel = () => {
    if (hasBlocker) return 'Blocker';
    if (hasHigh) return 'High';
    if (hasWarning) return 'Warning';
    return '';
  };

  return (
    <div className="group">
      <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
        {label}
      </label>
      
      <div className="relative">
        {/* Subtle issue indicator in left margin - only if issues exist */}
        {issues.length > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md overflow-hidden">
            <div className={`h-full ${getMarkerColor()} opacity-80`} />
          </div>
        )}

        {/* Clean text editor */}
        <div className={issues.length > 0 ? 'pl-3' : ''}>
          {isEditable && !isLocked ? (
            <textarea
              className="w-full min-h-[100px] px-4 py-3 text-sm text-slate-900 leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y transition-shadow"
              value={content}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder="Enter content..."
            />
          ) : (
            <div className="px-4 py-3 text-sm text-slate-900 leading-relaxed bg-slate-50 border border-slate-200 rounded-md min-h-[100px]">
              {content}
            </div>
          )}
        </div>

        {/* Issue summary badge - subtle, only on hover or when issues exist */}
        {issues.length > 0 && (
          <button
            onClick={() => onIssueClick?.(issues[0].issueId)}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded shadow-sm hover:shadow transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title={`Click to view ${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
          >
            {getMarkerIcon()}
            <span className="text-xs font-medium text-slate-700">
              {issues.length} {getSeverityLabel()}
            </span>
          </button>
        )}

        {/* Review mode indicator - subtle */}
        {!isEditable && !isLocked && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 font-medium">
            Review Mode
          </div>
        )}
      </div>
    </div>
  );
}