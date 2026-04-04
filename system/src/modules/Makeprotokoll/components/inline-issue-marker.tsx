import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface InlineIssueMarkerProps {
  issue: {
    id: string;
    severity: 'blocker' | 'warning';
    subsection: string;
    description: string;
    reference?: string;
    raisedBy: string;
    raisedDate: string;
    status: string;
  };
  onNavigateToIssuePanel?: () => void;
}

export function InlineIssueMarker({ issue, onNavigateToIssuePanel }: InlineIssueMarkerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        markerRef.current &&
        !markerRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopoverOpen]);

  const getSeverityStyles = () => {
    switch (issue.severity) {
      case 'blocker':
        return {
          marker: 'border-b-2 border-red-500 bg-red-50/30 hover:bg-red-50/60 cursor-pointer',
          icon: 'text-red-600',
          popover: 'border-red-500 bg-red-50',
          badge: 'bg-red-100 text-red-700',
          IconComponent: AlertCircle,
        };
      case 'warning':
        return {
          marker: 'border-b-2 border-amber-500 bg-amber-50/30 hover:bg-amber-50/60 cursor-pointer',
          icon: 'text-amber-600',
          popover: 'border-amber-500 bg-amber-50',
          badge: 'bg-amber-100 text-amber-700',
          IconComponent: AlertTriangle,
        };
      case 'issue':
        return {
          marker: 'border-b-2 border-amber-500 bg-amber-50/30 hover:bg-amber-50/60 cursor-pointer',
          icon: 'text-amber-600',
          popover: 'border-amber-500 bg-amber-50',
          badge: 'bg-amber-100 text-amber-700',
          IconComponent: AlertTriangle,
        };
    }
  };

  const styles = getSeverityStyles();
  const IconComponent = styles.IconComponent;

  return (
    <span className="relative inline">
      <span
        ref={markerRef}
        className={`${styles.marker} transition-colors`}
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        onMouseEnter={() => setIsPopoverOpen(true)}
        title={`${issue.severity.toUpperCase()}: Click for details`}
      >
        {/* Inline icon indicator */}
        <IconComponent className={`inline w-3 h-3 ${styles.icon} -mt-0.5`} />
      </span>

      {/* Issue Detail Popover */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-80 mt-1 left-0 border-2 ${styles.popover} rounded shadow-lg`}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <IconComponent className={`w-4 h-4 ${styles.icon} flex-shrink-0`} />
              <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded ${styles.badge}`}>
                {issue.severity}
              </span>
            </div>
            <button
              onClick={() => setIsPopoverOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            <div className="text-xs font-medium text-slate-900">
              {issue.subsection}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {issue.description}
            </p>

            {issue.reference && (
              <div className="text-xs text-slate-600 italic pt-2 border-t border-slate-200">
                Reference: {issue.reference}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>{issue.raisedBy}</span>
              <span>•</span>
              <span>{issue.raisedDate}</span>
            </div>
          </div>

          {/* Actions */}
          {onNavigateToIssuePanel && (
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={() => {
                  onNavigateToIssuePanel();
                  setIsPopoverOpen(false);
                }}
                className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 transition-colors"
              >
                View in Issues Panel
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}