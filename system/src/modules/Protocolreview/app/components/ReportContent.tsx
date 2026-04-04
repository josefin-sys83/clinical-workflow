import { useEffect, useRef } from 'react';
import type { ReportSection, RegulatoryFinding } from '../types/review';
import { TableView } from './TableView';
import { FigureView } from './FigureView';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ReportContentProps {
  sections: ReportSection[];
  onSectionVisible: (sectionId: string) => void;
  findings: RegulatoryFinding[];
}

export function ReportContent({ sections, onSectionVisible, findings }: ReportContentProps) {
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Debug: Log findings to see if they're passed correctly
  console.log('ReportContent received findings:', findings);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onSectionVisible(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [onSectionVisible]);

  const getStatusBadge = (status: ReportSection['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
            Approved
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 border border-yellow-200">
            Warning
          </span>
        );
    }
  };

  const renderContent = (section: ReportSection) => {
    const contentArray = Array.isArray(section.content) 
      ? section.content 
      : section.content.split('\n\n');

    // Get findings for this section
    const sectionFindings = findings.filter(f => f.sectionId === section.id);
    
    console.log(`[${section.id}] Processing section with ${sectionFindings.length} findings`);

    return contentArray.map((paragraph, i) => {
      // Check if this is a table marker
      if (paragraph.startsWith('[TABLE:') && paragraph.endsWith(']')) {
        const tableId = paragraph.slice(7, -1);
        const table = section.tables?.find(t => t.id === tableId);
        if (table) {
          return <TableView key={i} table={table} />;
        }
      }

      // Check if this is a figure marker
      if (paragraph.startsWith('[FIGURE:') && paragraph.endsWith(']')) {
        const figureId = paragraph.slice(8, -1);
        const figure = section.figures?.find(f => f.id === figureId);
        if (figure) {
          return <FigureView key={i} figure={figure} />;
        }
      }

      // Regular paragraph - check if any finding matches this paragraph
      const matchingFinding = sectionFindings.find(f => 
        f.textHighlight && paragraph.includes(f.textHighlight)
      );

      if (matchingFinding && matchingFinding.textHighlight) {
        console.log(`✓ MATCH found in paragraph ${i}:`, matchingFinding.textHighlight);
        
        // Find the index of the highlight in the paragraph
        const highlightIndex = paragraph.indexOf(matchingFinding.textHighlight);
        const beforeText = paragraph.substring(0, highlightIndex);
        const highlightText = matchingFinding.textHighlight;
        const afterText = paragraph.substring(highlightIndex + highlightText.length);
        
        // Determine styling based on severity and acceptance
        let bgClass, borderClass, textClass;
        
        if (matchingFinding.acceptedRisk) {
          bgClass = 'bg-neutral-100';
          borderClass = 'border-neutral-300';
          textClass = 'text-neutral-700';
        } else if (matchingFinding.severity === 'blocker') {
          bgClass = 'bg-red-100';
          borderClass = 'border-red-300';
          textClass = 'text-red-900';
        } else {
          bgClass = 'bg-amber-100';
          borderClass = 'border-amber-300';
          textClass = 'text-amber-900';
        }
        
        return (
          <p key={i} className="text-neutral-700 leading-relaxed mb-4">
            {beforeText}
            <mark 
              className={`${bgClass} ${borderClass} ${textClass} border px-1 py-0.5 rounded-sm not-italic`}
              style={{ fontStyle: 'normal' }}
              title={matchingFinding.description}
            >
              {highlightText}
            </mark>
            {afterText}
          </p>
        );
      }

      // No highlight - render normally
      return (
        <p key={i} className="text-neutral-700 leading-relaxed mb-4">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white min-h-0">
      <div className="max-w-4xl mx-auto px-12 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-neutral-900 mb-2">
            Clinical Investigation Protocol
          </h1>
          <p className="text-neutral-600">
            CARDIA-SUPPORT-2026 | Implantable Cardiac Support Device
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Protocol: CIP-2024-MED-0847 | Study Period: January 2024 – December 2025
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              className="scroll-mt-4"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200">
                <h2 className="text-lg font-medium text-neutral-900">
                  {index + 1}. {section.title}
                </h2>
                {getStatusBadge(section.status)}
              </div>

              <div className="prose prose-neutral max-w-none">
                {renderContent(section)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}