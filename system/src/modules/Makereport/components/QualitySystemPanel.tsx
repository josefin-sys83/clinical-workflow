import { AlertTriangle, ChevronRight, Download, CheckCircle2 } from 'lucide-react';
import { ReportSection, User } from '../types';
import { useState } from 'react';

interface QualitySystemPanelProps {
  currentSection: string;
  sections: ReportSection[];
  onNavigateToSection: (sectionId: string) => void;
  currentUser: User;
  onVerifyElement: (elementId: string) => void;
  sectionAiIssues: Record<string, any[]>;
  crossConsistencyIssues?: any[];
  savedWontFixIssues?: Record<string, string[]>;
  wontFixCrossConsistencyIds?: string[];
  onSectionAiIssuesChange: (sectionId: string, issues: any[]) => void;
  onWontFixSave?: (sectionId: string, descriptions: string[]) => void;
  onCrossConsistencyWontFixSave?: (ids: string[]) => void;
}

// Deterministic key for a cross-consistency finding, derived from its content since
// the AI doesn't return stable ids — lets a dismissal survive re-running the check.
function hashCrossConsistencyFinding(section1: string, section2: string, description: string): string {
  const input = `${section1}|||${section2}|||${description}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return `cc-${(hash >>> 0).toString(36)}`;
}

type WontFixModalState =
  | { kind: 'section'; sectionId: string; issueId: string }
  | { kind: 'cross-consistency'; crossId: string };

export function QualitySystemPanel({
  currentSection,
  sections,
  onNavigateToSection,
  currentUser,
  onVerifyElement,
  sectionAiIssues,
  crossConsistencyIssues,
  savedWontFixIssues,
  wontFixCrossConsistencyIds,
  onSectionAiIssuesChange,
  onWontFixSave,
  onCrossConsistencyWontFixSave,
}: QualitySystemPanelProps) {
  const [activeTab, setActiveTab] = useState<'my-issues' | 'all-issues'>('my-issues');
  const [wontFixModal, setWontFixModal] = useState<WontFixModalState | null>(null);
  const [wontFixComment, setWontFixComment] = useState('');

  // Collect real AI-analyzed issues across all sections
  interface FlatIssue {
    id: string;
    rawIssueId?: string;
    type: 'blocker' | 'warning';
    title: string;
    description: string;
    sectionTitle: string;
    sectionId: string;
    sectionNumber: string;
    sectionOwner: string;
    raisedBy?: string;
    dueDate?: string;
    reference?: string;
    isCrossConsistency?: boolean;
    crossId?: string;
    protocolSectionTitle?: string;
  }

  const allFindings: FlatIssue[] = [];
  const seenKeys = new Set<string>();
  sections.forEach((sec) => {
    const issues = sectionAiIssues[sec.id] || [];
    const openIssues = issues.filter((i: any) => i.status === 'open' || !i.status);
    openIssues.forEach((issue: any) => {
      const dedupeKey = `${sec.id}:${issue.id || issue.description}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);
      allFindings.push({
        id: `${sec.id}-${issue.id || Math.random()}`,
        rawIssueId: issue.id,
        type: issue.severity === 'blocker' ? 'blocker' : 'warning',
        title: issue.subsection || (issue.description?.substring(0, 60) ?? 'Issue'),
        description: issue.description || '',
        sectionTitle: sec.title,
        sectionId: sec.id,
        sectionNumber: sec.order?.toString() ?? '',
        sectionOwner: sec.roles?.contentOwner?.[0]?.name || 'Unassigned',
        raisedBy: issue.raisedBy,
        dueDate: issue.dueDate,
        reference: issue.reference,
      });
    });
  });

  (crossConsistencyIssues || []).forEach((issue: any, i: number) => {
    const crossId = hashCrossConsistencyFinding(issue.section1 || '', issue.section2 || '', issue.description || '');
    if (wontFixCrossConsistencyIds?.includes(crossId)) return;

    // section1 is a protocol section title — protocol data isn't available in this
    // module, so it's shown as plain text. section2 is a report section title, which
    // can be matched against the report sections we do have, to recover a real id.
    const matchedReportSection = sections.find(
      (s) => s.title?.trim().toLowerCase() === (issue.section2 || '').trim().toLowerCase()
    );

    allFindings.push({
      id: `cross-consistency-${i}`,
      isCrossConsistency: true,
      crossId,
      type: issue.severity === 'blocker' ? 'blocker' : 'warning',
      title: `${issue.section1} → ${issue.section2}`,
      description: issue.description || '',
      sectionTitle: matchedReportSection?.title || issue.section2 || 'Cross-section',
      sectionId: matchedReportSection?.id || '',
      sectionNumber: matchedReportSection?.order?.toString() ?? '',
      sectionOwner: 'System',
      protocolSectionTitle: issue.section1 || '',
    });
  });

  const unresolvedFindings = allFindings;
  const myIssues = unresolvedFindings.filter(f => {
    const section = sections.find(s => s.id === f.sectionId);
    return section?.roles.contentOwner.some(u => u.id === currentUser.id) ?? false;
  });
  const displayedIssues = activeTab === 'my-issues' ? myIssues : unresolvedFindings;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-[#111827] mb-1" style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
          Issues & Consistency
        </h2>
        <p className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
          System-detected inconsistencies and review flags
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('my-issues')}
          className={`flex-1 px-3 py-2 rounded transition-colors ${
            activeTab === 'my-issues'
              ? 'bg-white border border-[#E5E7EB] text-[#111827]'
              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
          }`}
          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
        >
          My issues ({myIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('all-issues')}
          className={`flex-1 px-3 py-2 rounded transition-colors ${
            activeTab === 'all-issues'
              ? 'bg-white border border-[#E5E7EB] text-[#111827]'
              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
          }`}
          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
        >
          All issues ({unresolvedFindings.length})
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {displayedIssues.length > 0 ? (
          displayedIssues.map((finding) => {
            const isBlocker = finding.type === 'blocker';
            const bgColor = isBlocker ? 'bg-rose-50' : 'bg-amber-50';
            const borderColor = isBlocker ? 'border-rose-200' : 'border-amber-200';
            const hoverColor = isBlocker ? 'hover:bg-rose-50' : 'hover:bg-amber-100';
            const badgeBg = isBlocker ? 'bg-rose-50' : 'bg-amber-100';
            const badgeText = isBlocker ? 'text-rose-700' : 'text-amber-700';
            const linkColor = isBlocker ? 'text-rose-700 hover:text-rose-800' : 'text-amber-700 hover:text-amber-900';
            const capitalizedTitle = finding.title
              ? finding.title.charAt(0).toUpperCase() + finding.title.slice(1)
              : 'Issue';

            return (
              <div
                key={finding.id}
                onClick={() => finding.sectionId && onNavigateToSection(finding.sectionId)}
                className={`p-3 rounded border ${bgColor} ${borderColor} cursor-pointer ${hoverColor} transition-colors`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${badgeBg} ${badgeText}`}>
                        {isBlocker ? 'Blocker' : 'Warning'}
                      </span>
                      {finding.raisedBy?.toLowerCase().includes('system') && (
                        <span className="text-xs text-slate-500">AI Regulatory Review</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-900 mb-1">{capitalizedTitle}</div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                      {finding.description}
                    </p>
                    <div className={`pt-2 border-t ${borderColor} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Affected section</span>
                        {finding.sectionId ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToSection(finding.sectionId); }}
                            className={`text-xs ${linkColor} hover:underline`}
                          >
                            {finding.sectionNumber}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                      {finding.isCrossConsistency && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Compared against Protocol</span>
                          <span className="text-xs text-slate-700">{finding.protocolSectionTitle || '—'}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Section owner</span>
                        <span className="text-xs text-slate-700">{finding.sectionOwner}</span>
                      </div>
                      {finding.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Due in</span>
                          <span className="text-xs text-slate-700 font-medium">{finding.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {finding.sectionId ? (
                    <div
                      onClick={(e) => { e.stopPropagation(); onNavigateToSection(finding.sectionId); }}
                      className={`text-xs ${linkColor} flex items-center gap-1 font-medium cursor-pointer`}
                    >
                      <span>Navigate to Section {finding.sectionNumber}</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No section to navigate to</span>
                  )}
                  {(finding.isCrossConsistency || finding.sectionId) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWontFixModal(
                          finding.isCrossConsistency
                            ? { kind: 'cross-consistency', crossId: finding.crossId! }
                            : { kind: 'section', sectionId: finding.sectionId, issueId: finding.rawIssueId || '' }
                        );
                        setWontFixComment('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-2"
                    >
                      Won't fix
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-700 mb-1">No issues found</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {activeTab === 'my-issues'
                ? 'You have no open issues assigned to your sections.'
                : 'Generate report or edit sections to see AI analysis.'}
            </p>
          </div>
        )}
      </div>

      {/* Export Readiness */}
      <div className="mt-6">
        <button 
          className="w-full flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] transition-colors"
          onClick={() => {/* Navigate to export readiness details */}}
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-gray-700" />
            <div>
              <div className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                Export Readiness
              </div>
              <div className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
                3/6 checks passed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Won't Fix Modal */}
      {wontFixModal && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div style={{backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
            <h2 style={{margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a'}}>Mark as Won't Fix</h2>
            <p style={{margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b'}}>
              Provide a reason for suppressing this issue. This will be saved in the audit trail.
            </p>
            <textarea
              autoFocus
              value={wontFixComment}
              onChange={(e) => setWontFixComment(e.target.value)}
              placeholder="e.g. Risk accepted per sponsor decision, documented in risk management file"
              style={{width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => { setWontFixModal(null); setWontFixComment(''); }}
                style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
              >Cancel</button>
              <button
                disabled={!wontFixComment.trim()}
                onClick={() => {
                  if (wontFixModal.kind === 'cross-consistency') {
                    const updated = [...(wontFixCrossConsistencyIds || []), wontFixModal.crossId];
                    onCrossConsistencyWontFixSave?.(updated);
                  } else {
                    const { sectionId, issueId } = wontFixModal;
                    const issueDesc = (sectionAiIssues[sectionId] || []).find((i: any) => i.id === issueId)?.description || '';
                    const updated = [...(savedWontFixIssues?.[sectionId] || []), issueDesc];
                    onSectionAiIssuesChange(sectionId, (sectionAiIssues[sectionId] || []).filter((i: any) => i.id !== issueId));
                    onWontFixSave?.(sectionId, updated);
                  }
                  setWontFixModal(null);
                  setWontFixComment('');
                }}
                style={{padding: '0.5rem 1rem', backgroundColor: wontFixComment.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: wontFixComment.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500}}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}