import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronRight, Info } from 'lucide-react';

interface RequiredElement {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'missing';
  reference: string; // ISO 14155 reference
  verifiedBy?: string;
  verifiedDate?: string;
}

interface SectionCompletenessIndicatorProps {
  sectionNumber: string;
  requiredElements: RequiredElement[];
  onVerify?: (elementId: string) => void;
}

export function SectionCompletenessIndicator({ 
  sectionNumber, 
  requiredElements,
  onVerify 
}: SectionCompletenessIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const completeCount = requiredElements.filter(e => e.status === 'complete').length;
  const partialCount = requiredElements.filter(e => e.status === 'partial').length;
  const missingCount = requiredElements.filter(e => e.status === 'missing').length;
  const totalCount = requiredElements.length;
  
  const allComplete = completeCount === totalCount;
  const hasGaps = missingCount > 0 || partialCount > 0;

  const getStatusIcon = (status: RequiredElement['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'partial':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'missing':
        return <Circle className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  return (
    <div className="border border-slate-200 rounded bg-white">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-900">
            Completeness Status
          </span>
          <span className="text-xs text-slate-500">
            (ISO 14155:2020 Required Elements)
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {allComplete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-blue-700">Complete</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">{completeCount}/{totalCount}</span>
            </div>
          )}
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Inspection Note */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                Inspection requirement: This section must cover all required elements 
                per ISO 14155:2020. AI may assist in identifying gaps, but final confirmation 
                must be performed and verified by the section owner or reviewer.
              </p>
            </div>
          </div>

          {/* Required Elements List */}
          <div className="px-3 py-2 space-y-2">
            {requiredElements.map((element) => (
              <div 
                key={element.id}
                className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-900">{element.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {element.reference}
                  </div>
                  {element.status === 'complete' && element.verifiedBy && (
                    <div className="text-xs text-slate-500">
                      Verified by {element.verifiedBy} on {element.verifiedDate}
                    </div>
                  )}
                  {element.status === 'partial' && (
                    <div className="text-xs text-slate-500 mt-1">
                      Partially covered - requires completion
                    </div>
                  )}
                  {element.status === 'missing' && (
                    <div className="text-xs text-red-600 mt-1">
                      Missing - must be added before approval
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(element.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Human Verification Footer */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Note: Completeness verification is a human responsibility. 
              AI suggestions for gaps are advisory only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}