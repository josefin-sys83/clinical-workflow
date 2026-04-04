import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, ChevronDown } from 'lucide-react';

interface RequiredElement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  coverage: 'complete' | 'partial' | 'missing' | 'placeholder';
  location?: string;
  reference?: string;
}

interface RequiredElementsCheckerProps {
  sectionId: string;
  sectionTitle: string;
  elements: RequiredElement[];
}

export function RequiredElementsChecker({ sectionId, sectionTitle, elements }: RequiredElementsCheckerProps) {
  const [expanded, setExpanded] = useState(false);

  const completeCount = elements.filter(e => e.coverage === 'complete').length;
  const partialCount = elements.filter(e => e.coverage === 'partial').length;
  const missingCount = elements.filter(e => e.coverage === 'missing' || e.coverage === 'placeholder').length;
  const totalRequired = elements.filter(e => e.required).length;

  const getCompletionPercentage = () => {
    const requiredElements = elements.filter(e => e.required);
    const completeRequired = requiredElements.filter(e => e.coverage === 'complete').length;
    const partialRequired = requiredElements.filter(e => e.coverage === 'partial').length;
    return Math.round(((completeRequired + partialRequired * 0.5) / requiredElements.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  const getCoverageIcon = (coverage: string) => {
    switch (coverage) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'partial':
        return <Circle className="w-4 h-4 text-amber-600 fill-amber-600/30" />;
      case 'missing':
      case 'placeholder':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCoverageLabel = (coverage: string) => {
    switch (coverage) {
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'Partial';
      case 'missing':
        return 'Missing';
      case 'placeholder':
        return 'Placeholder only';
      default:
        return 'Unknown';
    }
  };

  const getCoverageColor = (coverage: string) => {
    switch (coverage) {
      case 'complete':
        return 'text-green-700';
      case 'partial':
        return 'text-amber-700';
      case 'missing':
      case 'placeholder':
        return 'text-red-700';
      default:
        return 'text-slate-700';
    }
  };

  return (
    <div className="border border-slate-200 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-sm font-medium text-slate-900">
                Required Elements Coverage
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {completeCount}/{totalRequired}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">{completionPercentage}%</div>
              <div className="text-xs text-slate-500">{completeCount}/{totalRequired} required</div>
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 bg-slate-50 space-y-2">
          <div className="text-xs text-slate-600 mb-3">
            ISO 14155:2020 and EU MDR requirements for {sectionTitle}
          </div>

          {elements.map((element) => (
            <div 
              key={element.id}
              className="p-3 bg-white border border-slate-200 rounded hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                {getCoverageIcon(element.coverage)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-900">
                      {element.name}
                    </span>
                    {element.required && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                        Required
                      </span>
                    )}
                    <span className={`text-xs font-medium ${getCoverageColor(element.coverage)}`}>
                      {getCoverageLabel(element.coverage)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {element.description}
                  </p>
                  {element.location && (
                    <div className="text-xs text-slate-500">
                      Location: {element.location}
                    </div>
                  )}
                  {element.reference && (
                    <div className="text-xs text-slate-500 italic">
                      {element.reference}
                    </div>
                  )}
                  {element.coverage === 'missing' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>Action required:</strong> This element must be added to meet regulatory requirements.
                    </div>
                  )}
                  {element.coverage === 'placeholder' && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <strong>Placeholder detected:</strong> Replace with actual content based on approved inputs.
                    </div>
                  )}
                  {element.coverage === 'partial' && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <strong>Incomplete:</strong> Additional detail or clarification needed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded mt-4">
            <div className="text-xs text-blue-900">
              <strong>AI Assessment:</strong> Coverage analysis is based on keyword detection and structural analysis. 
              Final determination of completeness requires human review by qualified personnel.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}