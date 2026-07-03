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
}

export function QualitySystemPanel({
  currentSection,
  sections,
  onNavigateToSection,
  currentUser,
  onVerifyElement,
  sectionAiIssues,
  crossConsistencyIssues,
}: QualitySystemPanelProps) {
  const [activeTab, setActiveTab] = useState<'my-issues' | 'all-issues'>('my-issues');

  // Collect real AI-analyzed issues across all sections
  interface FlatIssue {
    id: string;
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
    allFindings.push({
      id: `cross-consistency-${i}`,
      type: issue.severity === 'blocker' ? 'blocker' : 'warning',
      title: `${issue.section1} → ${issue.section2}`,
      description: issue.description || '',
      sectionTitle: issue.section1 || 'Cross-section',
      sectionId: '',
      sectionNumber: '',
      sectionOwner: 'System',
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
                onClick={() => onNavigateToSection(finding.sectionId)}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigateToSection(finding.sectionId); }}
                          className={`text-xs ${linkColor} hover:underline`}
                        >
                          {finding.sectionNumber}
                        </button>
                      </div>
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
                  <div
                    onClick={(e) => { e.stopPropagation(); onNavigateToSection(finding.sectionId); }}
                    className={`text-xs ${linkColor} flex items-center gap-1 font-medium cursor-pointer`}
                  >
                    <span>Navigate to Section {finding.sectionNumber}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
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
    </div>
  );
}