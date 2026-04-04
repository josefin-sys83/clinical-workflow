import { Circle, Check } from 'lucide-react';
import type { ReportSection } from '../types/review';

interface SectionOverviewProps {
  sections: ReportSection[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

// Completed section icon: circle with checkmark inside
function CircleWithCheck() {
  return (
    <div className="w-4 h-4 relative flex items-center justify-center flex-shrink-0">
      <Circle 
        className="w-4 h-4 text-blue-600 absolute" 
        strokeWidth={2}
      />
      <Check 
        className="w-2.5 h-2.5 text-blue-600 relative" 
        strokeWidth={2.5}
      />
    </div>
  );
}

export function SectionOverview({ sections, activeSection, onSectionClick }: SectionOverviewProps) {
  const getSectionIcon = (section: ReportSection) => {
    const isCompleted = section.status === 'approved';
    
    if (isCompleted) {
      return <CircleWithCheck />;
    } else {
      return <Circle className="h-4 w-4 flex-shrink-0 text-orange-400" />;
    }
  };

  return (
    <div className="w-[280px] border-r border-neutral-200 bg-white h-full overflow-y-auto flex flex-col">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Sections</h2>
      </div>

      <nav className="px-4 pb-4 flex-1">
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
            {getSectionIcon(section)}
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