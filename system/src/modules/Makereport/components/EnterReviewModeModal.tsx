import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { ReportSection } from '../types';

interface EnterReviewModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  sections: ReportSection[];
}

export function EnterReviewModeModal({ isOpen, onClose, onProceed, sections }: EnterReviewModeModalProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();

  if (!isOpen) return null;

  const criticalBlockers = sections.reduce((count, section) => {
    const blockers = section.validationFindings?.filter(f => f.type === 'blocker' && !f.resolved) || [];
    return count + blockers.length;
  }, 0);

  const openWarnings = sections.reduce((count, section) => {
    const warnings = section.validationFindings?.filter(f => f.type === 'warning' && !f.resolved) || [];
    return count + warnings.length;
  }, 0);

  const incompleteSections = sections.filter(s => s.state !== 'approved' && s.state !== 'locked');
  const incompleteSectionNumbers = incompleteSections.map(s => s.order).join(', ');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[520px] mx-4">
        <div className="flex items-start gap-3 p-6 pb-4">
          <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-[#111827] text-lg font-semibold">Enter Review with Outstanding Issues?</h2>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <p className="text-[#6B7280] mb-4 text-sm">You can proceed to Review Mode, but reviewers will be notified of the following:</p>

          <div className="space-y-3 mb-4">
            {criticalBlockers > 0 && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-md p-3">
                <div className="text-[#991B1B] font-semibold text-sm mb-0.5">{criticalBlockers} Critical Blocker{criticalBlockers !== 1 ? 's' : ''}</div>
                <div className="text-[#991B1B] text-xs">These issues may prevent approval and should be resolved during review.</div>
              </div>
            )}
            {openWarnings > 0 && (
              <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-md p-3">
                <div className="text-[#92400E] font-semibold text-sm mb-0.5">{openWarnings} Open Warning{openWarnings !== 1 ? 's' : ''}</div>
                <div className="text-[#92400E] text-xs">Reviewers will evaluate these during the review process.</div>
              </div>
            )}
            {incompleteSections.length > 0 && (
              <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-md p-3">
                <div className="text-[#1E40AF] font-semibold text-sm mb-0.5">{incompleteSections.length} Incomplete Section{incompleteSections.length !== 1 ? 's' : ''}</div>
                <div className="text-[#1E40AF] text-xs">Sections {incompleteSectionNumbers} are not fully complete.</div>
              </div>
            )}
          </div>

          <p className="text-[#6B7280] italic mb-4 text-xs">Review Mode allows you to receive feedback and make updates. You can exit and re-enter review as many times as needed until all issues are resolved and the protocol is approved.</p>

          <div>
            <h3 className="text-[#111827] font-semibold text-sm mb-2">What happens in Review Mode:</h3>
            <ul className="space-y-1.5 text-[#6B7280] text-xs">
              <li className="flex gap-2"><span>•</span><span>Reviewers are notified to begin assessment</span></li>
              <li className="flex gap-2"><span>•</span><span>Editing is restricted based on role and section status</span></li>
              <li className="flex gap-2"><span>•</span><span>AI focuses on consistency checking and risk highlighting</span></li>
              <li className="flex gap-2"><span>•</span><span>Comments and approvals become the primary workflow</span></li>
              <li className="flex gap-2"><span>•</span><span>All changes are logged in the audit trail</span></li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded transition-colors text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={() => { navigate(`/projects/${projectId}/workflow/report/review`); onProceed(); }}
            className="px-4 py-2 bg-[#1F2937] text-white rounded hover:bg-[#111827] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Proceed to Review
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}