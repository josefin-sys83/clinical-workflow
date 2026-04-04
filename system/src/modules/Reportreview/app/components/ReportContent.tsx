import { useEffect, useRef } from 'react';
import type { ReportSection, RegulatoryFinding } from '../types/review';
import { TableView } from './TableView';
import { FigureView } from './FigureView';

interface ReportContentProps {
  sections: ReportSection[];
  onSectionVisible: (sectionId: string) => void;
  findings: RegulatoryFinding[];
}

export function ReportContent({ sections, onSectionVisible, findings }: ReportContentProps) {
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

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

    return contentArray.map((item, i) => {
      // Check if this is a table marker
      if (item.startsWith('[TABLE:') && item.endsWith(']')) {
        const tableId = item.slice(7, -1);
        const table = section.tables?.find(t => t.id === tableId);
        if (table) {
          return <TableView key={i} table={table} />;
        }
      }

      // Check if this is a figure marker
      if (item.startsWith('[FIGURE:') && item.endsWith(']')) {
        const figureId = item.slice(8, -1);
        const figure = section.figures?.find(f => f.id === figureId);
        if (figure) {
          return <FigureView key={i} figure={figure} />;
        }
      }

      // Regular paragraph - check for findings highlights
      let content: React.ReactNode = item;
      
      sectionFindings.forEach((finding) => {
        if (finding.textHighlight && item.includes(finding.textHighlight)) {
          const parts = item.split(finding.textHighlight);
          const highlightClass = finding.acceptedRisk
            ? 'bg-neutral-100 text-neutral-700'
            : finding.severity === 'blocker'
            ? 'bg-red-100 text-red-800 border border-red-300'
            : 'bg-yellow-100 text-yellow-800 border border-yellow-300';
          
          content = (
            <>
              {parts[0]}
              <span
                className={`px-2 py-0.5 rounded ${highlightClass}`}
                title={finding.description}
              >
                {finding.textHighlight}
              </span>
              {parts[1]}
            </>
          );
        }
      });

      return (
        <p key={i} className="text-neutral-700 leading-relaxed mb-4">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white min-h-0">
      <div className="max-w-4xl mx-auto px-12 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-neutral-900 mb-2">
            Clinical Investigation Report
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
