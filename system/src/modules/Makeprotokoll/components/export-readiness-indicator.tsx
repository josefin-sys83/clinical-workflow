import React, { useState } from 'react';
import { Download, CheckCircle2, AlertCircle, FileText, ChevronDown, X } from 'lucide-react';

interface ExportReadinessCheck {
  category: string;
  passed: boolean;
  message: string;
  details?: string;
}

interface ExportReadinessIndicatorProps {
  checks: ExportReadinessCheck[];
  onExport?: () => void;
}

export function ExportReadinessIndicator({ checks, onExport }: ExportReadinessIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const isReady = passedChecks === totalChecks;

  return (
    <>
      <div className="border border-slate-300 rounded bg-white">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-slate-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">
                Export Readiness
              </div>
              <div className="text-xs text-slate-600">
                {passedChecks}/{totalChecks} checks passed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isReady ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <ChevronDown 
              className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-600 mb-3">
              The following checks verify protocol completeness and export readiness:
            </div>

            {checks.map((check, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded border ${
                  check.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-900 mb-0.5">
                      {check.category}
                    </div>
                    <div className="text-xs text-slate-700">
                      {check.message}
                    </div>
                    {check.details && (
                      <div className="text-xs text-slate-600 mt-1 italic">
                        {check.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowModal(true)}
                disabled={!isReady}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Preview Export Content
              </button>
              <div className="text-xs text-slate-500 text-center mt-2">
                {isReady 
                  ? 'Protocol is ready for export'
                  : 'Complete all checks before exporting'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Export Preview
                </h2>
                <p className="text-sm text-slate-600">
                  This shows what will be included in the exported protocol document
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* What WILL be exported */}
              <div className="border border-green-300 rounded-lg overflow-hidden">
                <div className="bg-green-100 px-4 py-2 border-b border-green-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700" />
                    <span className="text-sm font-medium text-green-900">
                      INCLUDED IN EXPORT
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900 mb-1">Protocol Content</div>
                      <ul className="text-xs space-y-0.5 list-disc list-inside text-slate-600">
                        <li>All section text content (4.1–4.9)</li>
                        <li>Tables, figures, and structured data</li>
                        <li>Subsection headings and organization</li>
                        <li>Cross-references between sections</li>
                        <li>Regulatory-required elements</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* What will NOT be exported */}
              <div className="border border-red-300 rounded-lg overflow-hidden">
                <div className="bg-red-100 px-4 py-2 border-b border-red-300">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-700" />
                    <span className="text-sm font-medium text-red-900">
                      EXCLUDED FROM EXPORT
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white space-y-3 text-sm text-slate-700">
                  <div className="text-xs text-red-800 bg-red-50 p-2 rounded">
                    The following metadata is for internal use only and will NOT appear in the exported protocol:
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">AI labels and markers</span>
                        <span className="text-slate-600"> — "AI-generated draft", source references, AI version numbers</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">Review comments and threads</span>
                        <span className="text-slate-600"> — All reviewer comments, replies, and discussions</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">AI suggestions and guidance</span>
                        <span className="text-slate-600"> — Regulatory hints, completeness indicators, consistency warnings</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">System messages</span>
                        <span className="text-slate-600"> — Amendment warnings, approval notifications, workflow status</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">Audit trail entries</span>
                        <span className="text-slate-600"> — Edit history, version log, approval timeline (maintained separately)</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-900">Issue markers and tracking</span>
                        <span className="text-slate-600"> — Inline issue markers, issue descriptions, resolution status</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-900">
                  <strong>Export Format:</strong> The protocol will be exported as a clean, formatted document 
                  containing only the authoritative protocol content required for regulatory submission. 
                  All metadata remains in the system for audit and QA purposes.
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  onExport?.();
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Protocol Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
