import { ChevronDown, ChevronRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { CompletenessElement } from '../types';
import { useState } from 'react';

interface SectionCompletenessStatusProps {
  elements?: CompletenessElement[];
  sectionTitle: string;
}

export function SectionCompletenessStatus({ elements, sectionTitle }: SectionCompletenessStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!elements || elements.length === 0) {
    return null;
  }

  const verifiedCount = elements.filter(el => el.status === 'verified').length;
  const totalCount = elements.length;
  const isComplete = verifiedCount === totalCount;

  const getStatusIcon = (status: 'verified' | 'partially-covered' | 'not-yet-verified') => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />;
      case 'partially-covered':
        return <AlertCircle className="w-4 h-4 text-[#F97316]" />;
      case 'not-yet-verified':
        return <AlertCircle className="w-4 h-4 text-[#F97316]" />;
    }
  };

  const getStatusText = (status: 'verified' | 'partially-covered' | 'not-yet-verified', element: CompletenessElement) => {
    switch (status) {
      case 'verified':
        return (
          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Verified by {element.verifiedBy?.name || 'Unknown'} on {element.verificationDate || 'Unknown date'}
          </div>
        );
      case 'partially-covered':
        return (
          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Partially covered - requires completion
          </div>
        );
      case 'not-yet-verified':
        return null;
    }
  };

  return (
    <div className="mb-4 border border-[#E5E7EB] rounded bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
            Completeness Status
          </span>
          <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            (ISO 14155:2020 Required Elements)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span 
            className={isComplete ? "text-[#2563EB]" : "text-[#111827]"}
            style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
          >
            {isComplete ? 'Complete' : `${verifiedCount}/${totalCount}`}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Inspection Requirement Notice */}
          <div className="mb-4 p-3 bg-[#F9FAFB] rounded flex gap-2">
            <Info className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div className="text-[#6B7280]" style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              <span className="font-medium">Inspection requirement:</span> This section must cover all required elements per ISO 14155:2020. AI may assist in identifying gaps, but final confirmation must be performed and verified by the section owner or reviewer.
            </div>
          </div>

          {/* Completeness Elements List */}
          <div className="space-y-3">
            {elements.map((element) => (
              <div key={element.id} className="border-b border-[#F3F4F6] pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-2 mb-1">
                  <div className="flex-1">
                    <div className="text-[#111827] mb-0.5" style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                      {element.title}
                    </div>
                    <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                      {element.isoReference}
                    </div>
                    {getStatusText(element.status, element)}
                  </div>
                  {getStatusIcon(element.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="mt-4 p-2 bg-[#F9FAFB] rounded">
            <div className="text-[#6B7280]" style={{ fontSize: '10px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              <span className="font-medium">Note:</span> Completeness verification is a human responsibility. AI suggestions for gaps are advisory only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}