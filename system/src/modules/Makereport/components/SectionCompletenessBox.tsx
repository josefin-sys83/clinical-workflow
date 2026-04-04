import { CheckCircle2, AlertCircle, XCircle, Sparkles, User as UserIcon, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { CompletenessElement, User } from '../types';
import { useState } from 'react';

interface SectionCompletenessBoxProps {
  elements?: CompletenessElement[];
  currentUser: User;
  onVerifyElement: (elementId: string) => void;
}

export function SectionCompletenessBox({ elements, currentUser, onVerifyElement }: SectionCompletenessBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no completeness elements defined for this section
  if (!elements || elements.length === 0) {
    return null;
  }

  const verifiedCount = elements.filter(el => el.status === 'verified').length;
  const totalCount = elements.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />;
      case 'partially-covered':
        return <AlertCircle className="w-4 h-4 text-[#F59E0B]" />;
      case 'not-yet-verified':
        return <XCircle className="w-4 h-4 text-[#9CA3AF]" />;
      default:
        return null;
    }
  };

  const getStatusText = (element: CompletenessElement) => {
    if (element.status === 'verified' && element.verifiedBy && element.verificationDate) {
      const date = new Date(element.verificationDate);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      return (
        <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
          Verified by {element.verifiedBy.name} on {formattedDate}
        </span>
      );
    } else if (element.status === 'partially-covered') {
      return (
        <span className="text-[#F59E0B]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
          Partially covered – requires completion
        </span>
      );
    } else {
      return (
        <span className="text-[#9CA3AF]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
          Missing – not yet verified
        </span>
      );
    }
  };

  return (
    <div className="mb-4 border border-[#E5E7EB] rounded-lg bg-white">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
            Completeness Status
          </span>
          <span className="text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            (ISO 14155:2020 Required Elements)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
            {verifiedCount}/{totalCount}
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
        <div className="border-t border-[#E5E7EB]">
          {/* Info Banner - No background color */}
          <div className="border-b border-[#E5E7EB] px-4 py-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <p className="text-[#6B7280] flex-1" style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              <span className="font-semibold">Inspection requirement:</span> This section must cover all required elements per ISO 14155:2020. AI may assist in identifying gaps, but final confirmation must be performed and verified by the section owner or reviewer.
            </p>
          </div>

          {/* Elements List - No background boxes, just simple rows */}
          <div className="px-4 py-3 space-y-4">
            {elements.map((element) => (
              <div 
                key={element.id}
                className="flex items-start justify-between gap-4"
              >
                {/* Left side - Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[#111827] mb-1" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    {element.title}
                  </div>
                  <div className="text-[#6B7280] mb-1" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    {element.isoReference}
                  </div>
                  {getStatusText(element)}
                </div>

                {/* Right side - Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(element.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="bg-[#F3F4F6] border-t border-[#E5E7EB] px-4 py-3">
            <p className="text-[#6B7280]" style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              <span className="font-semibold">Note:</span> Completeness verification is a human responsibility. AI suggestions for gaps are advisory only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}