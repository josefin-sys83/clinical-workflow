import { useNavigate, useParams } from 'react-router-dom';
import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ReviewModeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  blockerCount: number;
  warningCount: number;
  incompleteSections: string[];
}

export function ReviewModeConfirmation({ isOpen, onClose, onConfirm, blockerCount, warningCount, incompleteSections }: ReviewModeConfirmationProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  if (!isOpen) return null;

  const hasIssues = blockerCount > 0 || warningCount > 0 || incompleteSections.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {hasIssues ? <AlertTriangle className="w-6 h-6 text-amber-600" /> : <CheckCircle2 className="w-6 h-6 text-green-600" />}
              <h3 className="text-lg text-slate-900">{hasIssues ? 'Enter Review with Outstanding Issues?' : 'Enter Review Mode'}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            {hasIssues ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">You can proceed to Review Mode, but reviewers will be notified of the following:</p>
                <div className="space-y-2">
                  {blockerCount > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-medium text-red-900 mb-0.5">{blockerCount} Critical Blocker{blockerCount > 1 ? 's' : ''}</p>
                      <p className="text-xs text-red-800">These issues may prevent approval and should be resolved during review.</p>
                    </div>
                  )}
                  {warningCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-xs font-medium text-amber-900 mb-0.5">{warningCount} Open Warning{warningCount > 1 ? 's' : ''}</p>
                      <p className="text-xs text-amber-800">Reviewers will evaluate these during the review process.</p>
                    </div>
                  )}
                  {incompleteSections.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-0.5">{incompleteSections.length} Incomplete Section{incompleteSections.length > 1 ? 's' : ''}</p>
                      <p className="text-xs text-blue-800">Sections {incompleteSections.join(', ')} are not fully complete.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed">The protocol appears ready for review with no critical blockers or incomplete sections.</p>
            )}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded">
              <p className="text-xs text-slate-700 mb-2 font-medium">What happens in Review Mode:</p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                <li>Reviewers are notified to begin assessment</li>
                <li>Editing is restricted based on role and section status</li>
                <li>Comments and approvals become the primary workflow</li>
                <li>All changes are logged in the audit trail</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => { navigate(`/projects/${projectId}/workflow/protocol/review`); onConfirm(); }} className="px-4 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-800 transition-colors flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {hasIssues ? 'Proceed to Review' : 'Enter Review Mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
