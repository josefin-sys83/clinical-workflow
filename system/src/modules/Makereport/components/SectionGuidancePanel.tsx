import { Info, AlertTriangle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ReferencedDocument {
  name: string;
  version: string;
  date: string;
  approvalStatus?: string;
}

interface SectionGuidance {
  requiredElements: {
    reference: string;
    items: string[];
    mustAlignWith?: string;
  };
  commonPitfalls: string[];
  referencedDocuments?: ReferencedDocument[];
}

interface SectionGuidancePanelProps {
  guidance?: SectionGuidance;
  onViewDocument?: (docName: string) => void;
}

export function SectionGuidancePanel({ guidance, onViewDocument }: SectionGuidancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no guidance defined for this section
  if (!guidance) {
    return null;
  }

  return (
    <div className="mb-4 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F3F4F6] transition-colors rounded-lg"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <div className="text-[#111827] mb-0.5" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
              What this section must include
            </div>
            {!isExpanded && (
              <div className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                Click to view regulatory requirements and common pitfalls
              </div>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Required Elements - White box */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
            <div className="mb-2">
              <span className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                Required Elements
              </span>
              <span className="text-[#6B7280] ml-2" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                · {guidance.requiredElements.reference}
              </span>
            </div>
            <ul className="space-y-1.5">
              {guidance.requiredElements.items.map((item, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-2"
                >
                  <span className="text-[#6B7280] mt-1.5" style={{ fontSize: '8px' }}>●</span>
                  <span className="text-[#374151] flex-1" style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            {guidance.requiredElements.mustAlignWith && (
              <div className="mt-2 text-[#6B7280] italic" style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                {guidance.requiredElements.mustAlignWith}
              </div>
            )}
          </div>

          {/* Common Pitfalls - White box */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                Common pitfalls
              </span>
            </div>
            <ul className="space-y-1.5">
              {guidance.commonPitfalls.map((pitfall, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-2"
                >
                  <span className="text-[#6B7280] mt-1.5" style={{ fontSize: '8px' }}>●</span>
                  <span className="text-[#374151] flex-1" style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    {pitfall}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Referenced Documents - White box */}
          {guidance.referencedDocuments && guidance.referencedDocuments.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg">
              <button
                onClick={() => {
                  // This would open a modal or panel showing the documents
                  console.log('View referenced documents');
                }}
                className="w-full flex items-center justify-between hover:bg-[#F9FAFB] px-3 py-2.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    Referenced Documents
                  </span>
                  <span className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    ({guidance.referencedDocuments.length} referenced)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}