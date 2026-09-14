import { ReportSection } from '../types';
import { CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react';

interface SectionDef {
  id: string;
  title: string;
  number: number;
}

interface ReportNavigationProps {
  sections: ReportSection[];
  currentSection: string;
  onSectionChange: (sectionId: string) => void;
  getSectionStatus: (section: ReportSection) => 'complete' | 'in-progress' | 'empty';
  apiSectionDefs?: SectionDef[];
  getSectionLockReason: (sectionId: string) => string | undefined;
  generatingSectionId: string | null;
  draftErrors: Record<string, string>;
}

function getMarketBadge(sectionId: string): { label: string; className: string } | null {
  if (sectionId.includes('eu') || sectionId.includes('mdr')) {
    return { label: 'EU MDR', className: 'bg-blue-100 text-blue-700' };
  }
  if (sectionId.includes('us') || sectionId.includes('ide') || sectionId.includes('fda')) {
    return { label: 'FDA', className: 'bg-rose-50 text-rose-700' };
  }
  return null;
}

export function ReportNavigation({
  sections,
  currentSection,
  onSectionChange,
  getSectionStatus,
  apiSectionDefs,
  getSectionLockReason,
  generatingSectionId,
  draftErrors,
}: ReportNavigationProps) {
  // Use API section order when available; fall back to sections array order
  const orderedIds = apiSectionDefs && apiSectionDefs.length > 0
    ? apiSectionDefs.map(d => d.id)
    : sections.map(s => s.id);

  const orderedSections = orderedIds
    .map(id => sections.find(s => s.id === id))
    .filter((s): s is ReportSection => s !== undefined);

  return (
    <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
      <div className="pt-6 px-5 pb-5">
        <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">REPORT SECTIONS</h3>
      </div>

      <div className="px-5 pb-4 flex-1 space-y-1">
        {orderedSections.map((section) => {
          const isActive = section.id === currentSection;
          const isComplete = getSectionStatus(section) === 'complete';
          const badge = getMarketBadge(section.id);
          const lockReason = getSectionLockReason(section.id);
          const loading = generatingSectionId === section.id;

          return (
            <button
              key={section.id}
              type="button"
              disabled={!!lockReason}
              title={lockReason || `Open ${section.title}`}
              data-report-nav={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full text-left py-2 px-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-3 rounded transition-colors ${
                isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              {lockReason ? <Lock className="w-4 h-4 flex-shrink-0 text-slate-400" /> : loading ? <Loader2 className="w-4 h-4 flex-shrink-0 text-blue-600 animate-spin" /> : isComplete ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#2563EB]" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#F97316]" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${isActive ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'}`}>
                  {section.title}
                </div>
                {(lockReason || loading || draftErrors[section.id]) && <div className="mt-1 text-xs text-slate-500">
                  {lockReason || (loading ? 'Loading AI draft…' : 'Draft failed — retry in section')}
                </div>}
                {badge && (
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-medium leading-tight ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
