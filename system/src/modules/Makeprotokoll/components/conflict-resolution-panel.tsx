import React, { useState } from 'react';
import { X, AlertCircle, ArrowRight, CheckCircle, MessageSquare } from 'lucide-react';

interface ConflictResolutionPanelProps {
  conflictId: string;
  sectionNumber: string;
  sectionTitle: string;
  issueType: 'conflict' | 'missing' | 'blocker';
  sourceA: {
    label: string;
    content: string;
  };
  sourceB: {
    label: string;
    content: string;
  };
  affectedParagraph: {
    label: string;
    content: string;
  };
  onClose: () => void;
  onAlignWithSource: (source: 'A' | 'B') => void;
  onMarkAsJustified: (comment: string) => void;
}

export function ConflictResolutionPanel({
  conflictId,
  sectionNumber,
  sectionTitle,
  issueType,
  sourceA,
  sourceB,
  affectedParagraph,
  onClose,
  onAlignWithSource,
  onMarkAsJustified
}: ConflictResolutionPanelProps) {
  const [showJustificationInput, setShowJustificationInput] = useState(false);
  const [justificationText, setJustificationText] = useState('');

  const getIssueTypeLabel = () => {
    switch (issueType) {
      case 'conflict':
        return 'Content Conflict';
      case 'missing':
        return 'Missing Required Content';
      case 'blocker':
        return 'Regulatory Blocker';
      default:
        return 'Issue';
    }
  };

  const getIssueTypeColor = () => {
    switch (issueType) {
      case 'conflict':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'missing':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'blocker':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const handleMarkAsJustified = () => {
    if (justificationText.trim()) {
      onMarkAsJustified(justificationText);
      setJustificationText('');
      setShowJustificationInput(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[560px] bg-white border-l border-slate-300 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium mb-2 ${getIssueTypeColor()}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              {getIssueTypeLabel()}
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {sectionNumber} {sectionTitle}
            </h2>
            <p className="text-xs text-slate-600">
              Issue ID: {conflictId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Affected Paragraph */}
        <div className="mb-6">
          <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">
            Current Protocol Content
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-600 mb-1.5 font-medium">
              {affectedParagraph.label}
            </div>
            <div className="text-sm text-slate-800 leading-relaxed">
              {affectedParagraph.content}
            </div>
          </div>
        </div>

        {/* Source Comparison */}
        <div className="mb-6">
          <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
            Conflicting Sources
          </div>
          
          {/* Source A */}
          <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-semibold text-blue-900">
                {sourceA.label}
              </div>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed mb-3">
              {sourceA.content}
            </div>
            <button
              onClick={() => onAlignWithSource('A')}
              className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Align Protocol with {sourceA.label}
            </button>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center mb-3">
            <div className="text-slate-400 text-xs font-medium">vs.</div>
          </div>

          {/* Source B */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-semibold text-amber-900">
                {sourceB.label}
              </div>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed mb-3">
              {sourceB.content}
            </div>
            <button
              onClick={() => onAlignWithSource('B')}
              className="w-full px-3 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Keep Current Protocol Version
            </button>
          </div>
        </div>

        {/* Justified Deviation */}
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
            Or Mark as Justified Deviation
          </div>
          
          {!showJustificationInput ? (
            <button
              onClick={() => setShowJustificationInput(true)}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Add Justification & Accept Deviation
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Explain why this deviation from source is justified (e.g., updated regulatory guidance, clinical rationale, sponsor decision)..."
                rows={5}
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                  onClick={handleMarkAsJustified}
                  disabled={!justificationText.trim()}
                >
                  Mark as Justified
                </button>
                <button
                  className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    setShowJustificationInput(false);
                    setJustificationText('');
                  }}
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-slate-600">
                All justifications are audit-logged and will be included in regulatory documentation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-600 text-center">
          All conflict resolutions are audit-logged with full traceability
        </p>
      </div>
    </div>
  );
}
