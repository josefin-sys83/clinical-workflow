import { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import type { ReportSection, RegulatoryFinding } from '../types/review';
import { TableView } from './TableView';
import { FigureView } from './FigureView';

interface ReportContentProps {
  sections: ReportSection[];
  onSectionVisible: (sectionId: string) => void;
  findings: RegulatoryFinding[];
  projectName?: string;
  deviceName?: string;
}

export function ReportContent({
  sections,
  onSectionVisible,
  findings,
  projectName,
  deviceName,
}: ReportContentProps) {
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
      { threshold: 0.3 },
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [onSectionVisible, sections]);

  // Review status badge in section header
  const getReviewBadge = (section: ReportSection) => {
    const rs = section.reviewStatus;
    if (rs === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    }
    if (rs === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    }
    return null;
  };

  const renderContent = (section: ReportSection) => {
    const contentArray = Array.isArray(section.content)
      ? section.content
      : (section.content || '').split('\n\n');

    const sectionFindings = findings.filter((f) => f.sectionId === section.id);

    return contentArray.map((paragraph, i) => {
      if (typeof paragraph !== 'string') return null;

      if (paragraph.startsWith('[TABLE:') && paragraph.endsWith(']')) {
        const tableId = paragraph.slice(7, -1);
        const table = section.tables?.find((t) => t.id === tableId);
        if (table) return <TableView key={i} table={table} />;
      }

      if (paragraph.startsWith('[FIGURE:') && paragraph.endsWith(']')) {
        const figureId = paragraph.slice(8, -1);
        const figure = section.figures?.find((f) => f.id === figureId);
        if (figure) return <FigureView key={i} figure={figure} />;
      }

      // Inline highlight for findings with textHighlight
      const matchingFinding = sectionFindings.find(
        (f) => f.textHighlight && paragraph.includes(f.textHighlight),
      );

      if (matchingFinding?.textHighlight) {
        const hi = matchingFinding.textHighlight;
        const idx = paragraph.indexOf(hi);
        const before = paragraph.substring(0, idx);
        const after = paragraph.substring(idx + hi.length);

        let bgClass = 'bg-amber-100 border-amber-300 text-amber-900';
        if (matchingFinding.acceptedRisk) bgClass = 'bg-neutral-100 border-neutral-300 text-neutral-700';
        else if (matchingFinding.severity === 'blocker') bgClass = 'bg-rose-50 border-rose-300 text-rose-800';

        return (
          <p key={i} className="text-neutral-700 leading-relaxed mb-4">
            {before}
            <mark
              className={`${bgClass} border px-1 py-0.5 rounded-sm`}
              style={{ fontStyle: 'normal' }}
              title={matchingFinding.description}
            >
              {hi}
            </mark>
            {after}
          </p>
        );
      }

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
        {/* Protocol header */}
        <div className="mb-8">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">
            Clinical Investigation Protocol
          </p>
          <h1 className="text-2xl font-medium text-neutral-900">
            {projectName || 'Protocol Review'}
          </h1>
          {deviceName && (
            <p className="text-neutral-500 text-sm mt-1">{deviceName}</p>
          )}
        </div>

        {/* Sections */}
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
              {/* Section header */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-neutral-200 gap-4">
                <h2 className="text-lg font-medium text-neutral-900 leading-tight">
                  {index + 1}. {section.title}
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Findings count badge */}
                  {(() => {
                    const sf = findings.filter((f) => f.sectionId === section.id && !f.acceptedRisk);
                    const blockers = sf.filter((f) => f.severity === 'blocker').length;
                    const warnings = sf.filter((f) => f.severity === 'warning').length;
                    if (blockers > 0) return (
                      <span className="flex items-center gap-1 text-xs text-rose-700 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {blockers}
                      </span>
                    );
                    if (warnings > 0) return (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {warnings}
                      </span>
                    );
                    return null;
                  })()}
                  {getReviewBadge(section)}
                </div>
              </div>

              {/* Section content */}
              <div className="prose prose-neutral max-w-none prose-p:leading-relaxed">
                {renderContent(section)}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-16 text-neutral-400">
              <p className="text-sm">No protocol sections available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
