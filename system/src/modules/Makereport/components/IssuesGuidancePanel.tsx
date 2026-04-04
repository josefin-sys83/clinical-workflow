import { AlertTriangle, XCircle, MessageSquare, Sparkles, ChevronRight, FileText, Lock } from 'lucide-react';
import { ReportSection, ValidationFinding, ProtocolDeviation } from '../types';

interface IssuesGuidancePanelProps {
  currentSection: string;
  sections: ReportSection[];
  onNavigateToSection: (sectionId: string) => void;
  onViewDeviations: () => void;
  deviations: ProtocolDeviation[];
  onAssembleFinalReport: () => void;
  canAssemble: boolean;
  assemblyBlockers: string[];
}

export function IssuesGuidancePanel({
  currentSection,
  sections,
  onNavigateToSection,
  onViewDeviations,
  deviations,
  onAssembleFinalReport,
  canAssemble,
  assemblyBlockers,
}: IssuesGuidancePanelProps) {
  // Collect all validation findings
  const allFindings: ValidationFinding[] = [];
  sections.forEach(section => {
    if (section.validationFindings) {
      allFindings.push(...section.validationFindings);
    }
  });

  const unresolvedBlockers = allFindings.filter(f => f.type === 'blocker' && !f.resolved);
  const unresolvedWarnings = allFindings.filter(f => f.type === 'warning' && !f.resolved);

  // Collect all unresolved comments
  const allComments = sections.flatMap(section => 
    section.comments
      .filter(c => !c.resolved)
      .map(c => ({ ...c, sectionTitle: section.title }))
  );

  // Collect all AI suggestions
  const allSuggestions = sections.flatMap(section =>
    (section.aiSuggestions || [])
      .filter(s => !s.accepted)
      .map(s => ({ ...s, sectionTitle: section.title, sectionId: section.id }))
  );

  return (
    <aside className="w-[320px] bg-white border-l border-[#E5E7EB] flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="text-[#111827] mb-4" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
          Warnings & Guidance
        </div>

        {/* Regulatory Findings */}
        <div className="mb-6">
          <div className="text-[#6B7280] mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
            Regulatory Findings
          </div>

          {/* Blockers */}
          {unresolvedBlockers.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                <span className="text-[#DC2626]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                  Blockers ({unresolvedBlockers.length})
                </span>
              </div>
              <div className="space-y-2">
                {unresolvedBlockers.map(finding => {
                  const section = sections.find(s => s.id === finding.sectionId);
                  return (
                    <button
                      key={finding.id}
                      onClick={() => onNavigateToSection(finding.sectionId)}
                      className="w-full text-left p-2.5 rounded border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors"
                    >
                      <div className="text-[#991B1B] mb-1" style={{ fontSize: '12px', fontWeight: 500, lineHeight: '1.3', fontFamily: 'system-ui, sans-serif' }}>
                        {finding.title}
                      </div>
                      <div className="text-[#DC2626] mb-1.5" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {finding.description}
                      </div>
                      {finding.protocolReference && (
                        <div className="text-[#B91C1C] mb-1.5" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500, fontStyle: 'italic' }}>
                          Reference: {finding.protocolReference}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[#DC2626]" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                          {section?.title}
                        </span>
                        <ChevronRight className="w-3 h-3 text-[#DC2626]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warnings */}
          {unresolvedWarnings.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[#F59E0B]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                  Warnings ({unresolvedWarnings.length})
                </span>
              </div>
              <div className="space-y-2">
                {unresolvedWarnings.map(finding => {
                  const section = sections.find(s => s.id === finding.sectionId);
                  return (
                    <button
                      key={finding.id}
                      onClick={() => onNavigateToSection(finding.sectionId)}
                      className="w-full text-left p-2.5 rounded border border-[#FEF3C7] bg-[#FFFBEB] hover:bg-[#FEF3C7] transition-colors"
                    >
                      <div className="text-[#92400E] mb-1" style={{ fontSize: '12px', fontWeight: 500, lineHeight: '1.3', fontFamily: 'system-ui, sans-serif' }}>
                        {finding.title}
                      </div>
                      <div className="text-[#B45309] mb-1.5" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {finding.description}
                      </div>
                      {finding.protocolReference && (
                        <div className="text-[#D97706] mb-1.5" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500, fontStyle: 'italic' }}>
                          Reference: {finding.protocolReference}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[#D97706]" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                          {section?.title}
                        </span>
                        <ChevronRight className="w-3 h-3 text-[#D97706]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {unresolvedBlockers.length === 0 && unresolvedWarnings.length === 0 && (
            <div className="text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] rounded p-2.5 text-center" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              No validation issues detected
            </div>
          )}
        </div>

        {/* Reviewer Comments */}
        {allComments.length > 0 && (
          <div className="mb-6">
            <div className="text-[#6B7280] mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
              Reviewer Comments
            </div>
            <div className="space-y-2">
              {allComments.map(comment => (
                <button
                  key={comment.id}
                  onClick={() => onNavigateToSection(comment.sectionId)}
                  className="w-full text-left p-2.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-[#6B7280] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[#111827] mb-0.5" style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                        {comment.author.name}
                      </div>
                      <div className="text-[#374151] mb-1" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {comment.text}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                          {comment.sectionTitle}
                        </span>
                        <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {allSuggestions.length > 0 && (
          <div className="mb-6">
            <div className="text-[#6B7280] mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
              AI Suggestions
            </div>
            <div className="space-y-2">
              {allSuggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => onNavigateToSection(suggestion.sectionId!)}
                  className="w-full text-left p-2.5 rounded border border-[#DBEAFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Sparkles className="w-3 h-3 text-[#2563EB] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[#1E40AF] mb-1" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {suggestion.content}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#3B82F6]" style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                          {suggestion.sectionTitle}
                        </span>
                        <ChevronRight className="w-3 h-3 text-[#3B82F6]" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Protocol Deviations */}
        {deviations.length > 0 && (
          <div className="mb-6">
            <div className="text-[#6B7280] mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
              Protocol Deviations
            </div>
            <button
              onClick={onViewDeviations}
              className="w-full text-left p-2.5 rounded border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span className="text-[#DC2626]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    {deviations.length} Deviation{deviations.length !== 1 ? 's' : ''} Reported
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#DC2626]" />
              </div>
              <div className="text-[#DC2626] mt-1.5" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                {deviations.filter(d => d.deviationType === 'major').length} major, {deviations.filter(d => d.deviationType === 'minor').length} minor
              </div>
            </button>
          </div>
        )}

        {/* Guidance Note */}
        <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
          <div className="text-[#6B7280] text-center" style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Click any item to navigate to the relevant section
          </div>
        </div>
      </div>
    </aside>
  );
}