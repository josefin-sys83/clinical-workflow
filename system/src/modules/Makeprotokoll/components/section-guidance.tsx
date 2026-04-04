import React from 'react';
import { Info } from 'lucide-react';

interface SectionGuidanceProps {
  sectionNumber: string;
}

const guidanceMap: { [key: string]: string } = {
  '4.1': 'Verify administrative details and investigator credentials.',
  '4.2': 'Confirm objectives align with Synopsis and regulatory requirements.',
  '4.3': 'Verify device description matches technical documentation.',
  '4.4': 'Review design consistency with Synopsis and statistical requirements.',
  '4.5': 'Validate criteria match target population and are unambiguous.',
  '4.6': 'Confirm visit schedule supports all endpoints.',
  '4.7': 'Review safety procedures for regulatory compliance.',
  '4.8': 'Verify statistical methods support objectives.',
  '4.9': 'Review regulatory and ethics considerations for completeness.'
};

export function SectionGuidance({ sectionNumber }: SectionGuidanceProps) {
  const guidance = guidanceMap[sectionNumber] || 'Review for accuracy and consistency.';

  return (
    <div className="mb-4 flex items-start gap-2 text-xs text-slate-600">
      <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
      <span>{guidance}</span>
    </div>
  );
}