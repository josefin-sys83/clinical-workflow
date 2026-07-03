import { Circle, Check, X } from 'lucide-react';
import type { ReportSection } from '../types/review';

interface SectionOverviewProps {
  sections: ReportSection[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

function CircleWithCheck() {
  return (
    <div className="w-4 h-4 relative flex items-center justify-center flex-shrink-0">
      <Circle className="w-4 h-4 text-blue-600 absolute" strokeWidth={2} />
      <Check className="w-2.5 h-2.5 text-blue-600 relative" strokeWidth={2.5} />
    </div>
  );
}

function CircleWithX() {
  return (
    <div className="w-4 h-4 relative flex items-center justify-center flex-shrink-0">
      <Circle className="w-4 h-4 text-red-500 absolute" strokeWidth={2} />
      <X className="w-2.5 h-2.5 text-red-500 relative" strokeWidth={2.5} />
    </div>
  );
}

export function SectionOverview({ sections, activeSection, onSectionClick }: SectionOverviewProps) {
  const getSectionIcon = (section: ReportSection) => {
    const rs = section.reviewStatus;
    if (rs === 'approved') return <CircleWithCheck />;
    if (rs === 'rejected') return <CircleWithX />;
    // pending or undefined
    return <Circle className="h-4 w-4 flex-shrink-0 text-neutral-300" strokeWidth={2} />;
  };

  return (
    <div className="w-[264px] border-r border-neutral-200 bg-white h-full overflow-y-auto flex flex-col flex-shrink-0">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Protocol Sections
        </h2>
      </div>

      <nav className="px-3 pb-4 flex-1">
        {sections.map((section, idx) => {
          const rs = section.reviewStatus;
          return (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                activeSection === section.id ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              {getSectionIcon(section)}
              <span
                className={`text-sm flex-1 min-w-0 leading-tight ${
                  activeSection === section.id
                    ? 'font-semibold text-slate-900'
                    : 'font-normal text-slate-600'
                }`}
              >
                <span className="text-slate-400 text-xs mr-1">{idx + 1}.</span>
                {section.title}
              </span>
              {rs === 'rejected' && (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
