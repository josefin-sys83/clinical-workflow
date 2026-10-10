import { countIssueSeverities } from '@/shared/protocol/issues';
import { SectionOriginBadge } from '@/shared/editor/SectionOriginBadge';
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
import DOMPurify from 'dompurify';
import { highlightReviewHtml } from '@/shared/editor/review-highlights';
import { ReviewRemediation } from '@/shared/editor/ReviewRemediation';

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
    const sectionFindings = findings.filter(finding => finding.sectionId === section.id)
      .map(finding => ({ ...finding, textQuote: finding.textHighlight }));
    const rawContent = Array.isArray(section.content)
      ? section.content.join('\n\n')
      : section.content || '';
    if (/<[a-z][\s\S]*>/i.test(rawContent)) {
      const sanitized = DOMPurify.sanitize(rawContent, {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['style'],
      });
      const container = document.createElement('div');
      container.innerHTML = sanitized;
      const children = Array.from(container.children);
      if (children.length > 1 && children.every((child) => child.tagName === 'SPAN')) {
        children.slice(1).forEach((child) => child.before(document.createElement('br')));
      }
      // Pasted or browser-edited text can carry inline fonts; show one consistent font.
      return <div className="text-neutral-700 leading-relaxed [&_*]:[font-family:inherit]! [&_*]:[font-size:inherit]!" dangerouslySetInnerHTML={{ __html: highlightReviewHtml(container.innerHTML, sectionFindings) }} />;
    }

    const contentArray = Array.isArray(section.content)
      ? section.content
      : (section.content || '').split('\n\n');

    // Anchor against the whole section so repeated quotes stay ambiguous.
    const container = document.createElement('div');
    contentArray.forEach(paragraph => {
      const element = document.createElement('p');
      element.textContent = paragraph;
      container.append(element);
    });
    container.innerHTML = highlightReviewHtml(container.innerHTML, sectionFindings);

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

      return (
        <p key={i} className="text-neutral-700 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: container.children[i].innerHTML }} />
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
                <div className="flex flex-wrap justify-end items-center gap-2">
                  <SectionOriginBadge provenance={section.provenance} aiGenerated={section.aiGenerated} />
                  {/* Findings count badge */}
                  {(() => {
                    const sf = findings.filter((f) => f.sectionId === section.id && !f.acceptedRisk);
                    return countIssueSeverities(sf).filter(({ count }) => count > 0).map(({ severity, count, label, plural, badge, border }) => (
                      <span key={severity} className={`px-2 py-0.5 rounded border text-xs font-medium ${badge} ${border}`}>
                        {count} {count === 1 ? label : plural}
                      </span>
                    ));
                  })()}
                  {getReviewBadge(section)}
                </div>
              </div>

              {/* Section content */}
              <div className="prose prose-neutral max-w-none prose-p:leading-relaxed">
                <ReviewRemediation findings={findings.filter(finding => finding.sectionId === section.id && !finding.acceptedRisk)}>
                  {renderContent(section)}
                </ReviewRemediation>
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
