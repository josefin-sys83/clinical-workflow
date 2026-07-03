import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Target, Filter } from 'lucide-react';

export interface ReviewFinding {
  id: string;
  severity: 'Blocker' | 'High' | 'Medium' | 'Info';
  title: string;
  description: string;
  owner: string;
  ownerRole: string;
  requiredAction: string;
  status: 'Open' | 'Resolved';
  linkedText?: string;
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface ReviewFindingsPanelProps {
  sectionNumber: string;
  findings: ReviewFinding[];
  onResolveFinding?: (findingId: string) => void;
  onNavigateToText?: (findingId: string) => void;
}

export function ReviewFindingsPanel({ 
  sectionNumber, 
  findings,
  onResolveFinding,
  onNavigateToText
}: ReviewFindingsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const filteredFindings = findings.filter(finding => {
    if (filter === 'all') return true;
    return finding.status.toLowerCase() === filter;
  });

  const openCount = findings.filter(f => f.status === 'Open').length;
  const resolvedCount = findings.filter(f => f.status === 'Resolved').length;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Blocker':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const toggleExpanded = (findingId: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(findingId)) {
      newExpanded.delete(findingId);
    } else {
      newExpanded.add(findingId);
    }
    setExpandedFindings(newExpanded);
  };

  const allResolved = openCount === 0 && findings.length > 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">Review Findings</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600">{openCount} Open</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{resolvedCount} Resolved</span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({findings.length})
            </button>
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === 'open'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
              onClick={() => setFilter('open')}
            >
              Open ({openCount})
            </button>
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === 'resolved'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
              onClick={() => setFilter('resolved')}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Ready for Re-Review Banner */}
      {allResolved && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            <span className="text-sm font-medium text-blue-700">
              All findings resolved – Ready for Re-Review
            </span>
          </div>
        </div>
      )}

      {/* Findings List */}
      <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
        {filteredFindings.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-600">
              {filter === 'all' && 'No findings for this section'}
              {filter === 'open' && 'No open findings'}
              {filter === 'resolved' && 'No resolved findings'}
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedFindings.has(finding.id);
            return (
              <div key={finding.id} className={finding.status === 'Resolved' ? 'opacity-60' : ''}>
                {/* Finding Header */}
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpanded(finding.id)}>
                  <div className="flex items-start gap-3">
                    <button className="mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getSeverityStyles(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        {finding.status === 'Resolved' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            Resolved
                          </span>
                        )}
                        <span className="text-xs text-slate-600">
                          {finding.owner} • {finding.ownerRole}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {finding.title}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finding Details (Expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pl-11 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-1">Description:</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{finding.description}</p>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-1">Required Action:</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{finding.requiredAction}</p>
                    </div>

                    {finding.linkedText && (
                      <div>
                        <div className="text-xs font-medium text-slate-700 mb-1">Linked Text:</div>
                        <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-slate-700 italic">
                          "{finding.linkedText}"
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="text-xs text-slate-500">
                        Created by {finding.createdBy} on {finding.createdAt}
                        {finding.resolvedBy && (
                          <span className="block mt-0.5">
                            Resolved by {finding.resolvedBy} on {finding.resolvedAt}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {onNavigateToText && finding.linkedText && (
                          <button
                            className="px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                            onClick={() => onNavigateToText(finding.id)}
                          >
                            Go to Text
                          </button>
                        )}
                        {finding.status === 'Open' && onResolveFinding && (
                          <button
                            className="px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => onResolveFinding(finding.id)}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
