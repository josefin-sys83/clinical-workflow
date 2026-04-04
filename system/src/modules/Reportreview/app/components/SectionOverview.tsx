import { Circle, Check } from 'lucide-react';
import type { ReportSection } from '../types/review';

interface SectionOverviewProps {
  sections: ReportSection[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export function SectionOverview({ sections, activeSection, onSectionClick }: SectionOverviewProps) {
  const getCompletionIcon = (status: ReportSection['status']) => {
    // Completed sections (approved) show blue circle with checkmark
    if (status === 'approved') {
      return (
        <div className="w-4 h-4 flex items-center justify-center relative flex-shrink-0">
          <Circle className="h-4 w-4 text-blue-600 absolute" strokeWidth={2} />
          <Check className="h-2.5 w-2.5 text-blue-600 relative" strokeWidth={2.5} />
        </div>
      );
    }
    
    // Not completed sections show orange circle outline
    return <Circle className="h-4 w-4 text-orange-400 flex-shrink-0" strokeWidth={2} />;
  };

  return (
    <div className="w-[280px] border-r border-neutral-200 bg-white h-full overflow-y-auto flex flex-col">
      <div className="p-4 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          REPORT SECTIONS
        </h2>
      </div>

      <nav className="px-2 flex-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
              activeSection === section.id
                ? 'bg-slate-100'
                : 'hover:bg-slate-50'
            }`}
          >
            {getCompletionIcon(section.status)}
            <span className={`text-sm ${
              activeSection === section.id
                ? 'font-semibold text-slate-900'
                : 'font-normal text-slate-600'
            }`}>
              {section.title}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
