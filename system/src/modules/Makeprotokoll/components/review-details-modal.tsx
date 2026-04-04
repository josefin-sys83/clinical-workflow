import React from 'react';
import { X, AlertTriangle, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';

interface ReviewDetailsModalProps {
  issueId: string;
  issueType: 'conflict' | 'missing' | 'clarification';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  title: string;
  onClose: () => void;
}

export function ReviewDetailsModal({ 
  issueId, 
  issueType, 
  severity, 
  title,
  onClose 
}: ReviewDetailsModalProps) {
  // Mock data - would come from backend in production
  const comparisonData = {
    synopsis: {
      section: 'Synopsis § 2.3',
      content: 'The primary endpoint is cardiovascular mortality at 30 days post-procedure, assessed per VARC-3 criteria.'
    },
    protocol: {
      section: 'Protocol § 4.2',
      content: 'The primary objective is to evaluate all-cause mortality at 30 days following the transcatheter aortic valve replacement procedure.'
    },
    sap: {
      section: 'SAP § 3.1',
      content: 'Primary analysis will assess cardiovascular mortality rate at 30-day follow-up using Kaplan-Meier method.'
    }
  };

  const aiRecommendation = {
    action: 'Align Protocol § 4.2 with Synopsis § 2.3',
    rationale: 'The Synopsis defines the primary endpoint as "cardiovascular mortality" which has been approved by regulatory authorities. The Protocol currently states "all-cause mortality" which creates a regulatory conflict. The SAP correctly references cardiovascular mortality.',
    suggestedText: 'The primary objective is to evaluate cardiovascular mortality at 30 days following the transcatheter aortic valve replacement procedure, assessed per VARC-3 criteria.',
    regulatoryImpact: 'Misalignment between Synopsis and Protocol may require regulatory submission delay and additional clarification with competent authorities.'
  };

  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case 'blocker':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'conflict':
        return '🔴';
      case 'missing':
        return '🟠';
      case 'clarification':
        return '🟡';
      default:
        return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{getIssueIcon(issueType)}</span>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-medium border rounded uppercase ${getSeverityStyles(severity)}`}>
                {severity}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Issue ID: {issueId} • Type: {issueType.charAt(0).toUpperCase() + issueType.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Regulatory Impact Warning */}
          {severity === 'blocker' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-900 mb-1">
                    Regulatory Impact – Blocker
                  </div>
                  <p className="text-xs text-red-800">
                    {aiRecommendation.regulatoryImpact}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Comparison */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Document Comparison</h3>
            <div className="space-y-3">
              {/* Synopsis */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-900 uppercase tracking-wide">
                    {comparisonData.synopsis.section}
                  </span>
                  <span className="text-xs text-blue-700">(Approved Baseline)</span>
                </div>
                <p className="text-sm text-slate-900 leading-relaxed">
                  "{comparisonData.synopsis.content}"
                </p>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>

              {/* Protocol */}
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                    {comparisonData.protocol.section}
                  </span>
                  <span className="text-xs text-red-700">(Conflict Detected)</span>
                </div>
                <p className="text-sm text-slate-900 leading-relaxed">
                  "{comparisonData.protocol.content}"
                </p>
                <div className="mt-2 p-2 bg-red-100 border-l-2 border-red-400 rounded">
                  <p className="text-xs text-red-800">
                    <strong>Conflict:</strong> States "all-cause mortality" instead of "cardiovascular mortality"
                  </p>
                </div>
              </div>

              {/* SAP */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                    {comparisonData.sap.section}
                  </span>
                  <span className="text-xs text-blue-700">(Aligned)</span>
                </div>
                <p className="text-sm text-slate-900 leading-relaxed">
                  "{comparisonData.sap.content}"
                </p>
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">
                AI
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  AI Recommendation
                </h4>
                <p className="text-xs text-blue-800 mb-3">
                  {aiRecommendation.rationale}
                </p>
                
                <div className="p-3 bg-white border border-blue-200 rounded">
                  <div className="text-xs font-medium text-blue-900 mb-1 uppercase tracking-wide">
                    Suggested Text
                  </div>
                  <p className="text-sm text-slate-900 leading-relaxed italic">
                    "{aiRecommendation.suggestedText}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comment Thread */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Discussion</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-semibold">
                    AS
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-900">Anna Schmidt</span>
                      <span className="text-xs text-slate-500">Regulatory Affairs</span>
                      <span className="text-xs text-slate-400">• Feb 4, 2026 at 14:22 CET</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Please clarify if the primary endpoint applies to both EU MDR and FDA IDE pathways or if separate endpoints are needed. The current wording conflicts with Synopsis § 2.3.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg ml-6">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                    JP
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-900">Dr. James Patterson</span>
                      <span className="text-xs text-slate-500">Clinical Lead</span>
                      <span className="text-xs text-slate-400">• Feb 4, 2026 at 16:15 CET</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Good catch. We should align with the Synopsis. I'll update to "cardiovascular mortality" and add a note that FDA may require all-cause mortality as a secondary endpoint.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Go to Section
            </button>
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Accept AI Suggestion
            </button>
            <button className="px-4 py-2 text-sm border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
              Mark as Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}