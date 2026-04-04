import { ReportSection } from '../types';
import { Check, Circle } from 'lucide-react';

interface ReportNavigationProps {
  sections: ReportSection[];
  currentSection: string;
  onSectionChange: (sectionId: string) => void;
  getSectionStatus: (section: ReportSection) => 'complete' | 'in-progress' | 'empty';
}

export function ReportNavigation({ sections, currentSection, onSectionChange, getSectionStatus }: ReportNavigationProps) {
  const scrollToSection = (sectionId: string) => {
    onSectionChange(sectionId);
  };

  const getSectionIcon = (section: ReportSection) => {
    const status = getSectionStatus(section);
    
    // Completed section: Blue circle outline + check inside
    if (status === 'complete') {
      return (
        <div className="w-4 h-4 flex items-center justify-center relative flex-shrink-0">
          <Circle className="w-4 h-4 absolute" style={{ stroke: '#2563eb', strokeWidth: 2, fill: 'none' }} />
          <Check className="w-2.5 h-2.5 relative" style={{ stroke: '#2563eb', strokeWidth: 2.5 }} />
        </div>
      );
    }
    
    // Not completed: Orange circle outline
    return <Circle className="w-4 h-4 flex-shrink-0" style={{ stroke: '#fb923c', strokeWidth: 2, fill: 'none' }} />;
  };

  return (
    <nav className="w-[240px] bg-white border-r border-[#E5E7EB] flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="text-slate-500 mb-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: 'system-ui, sans-serif' }}>
          REPORT SECTIONS
        </div>
        <div className="space-y-1">
          {sections.map((section) => {
            const status = getSectionStatus(section);
            const isActive = section.id === currentSection;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-2.5 py-2.5 rounded transition-colors flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-slate-100'
                    : 'hover:bg-slate-50'
                }`}
              >
                {getSectionIcon(section)}
                <span 
                  className={`flex-1 text-sm ${isActive ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'}`}
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {section.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}