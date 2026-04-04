import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface SectionContentGuidanceProps {
  sectionNumber: string;
}

const purposeMap: { [key: string]: string } = {
  '4.1': 'Identify the study, sponsor, investigators, and administrative responsibilities.',
  '4.2': 'State the scientific rationale, clinical need, and study objectives.',
  '4.3': 'Describe the investigational device and its intended use.',
  '4.4': 'Describe how the study is designed and conducted.',
  '4.5': 'Define the target population and exclusion criteria.',
  '4.6': 'Specify the schedule of assessments and procedures.',
  '4.7': 'Define safety monitoring and adverse event management procedures.',
  '4.8': 'Describe the statistical methods and analysis plan.',
  '4.9': 'Address regulatory compliance, ethics, and data protection requirements.'
};

const contentExpectationsMap: { [key: string]: string[] } = {
  '4.1': [
    'Protocol title, version number, and date',
    'Sponsor name and contact information',
    'Principal Investigator credentials and institutional affiliation',
    'Regulatory identifiers (e.g., IDE number, clinical trial registration)',
    'Protocol approval signature page requirements'
  ],
  '4.2': [
    'Clinical need and disease/condition background',
    'Scientific rationale for the device and study',
    'Primary objective statement',
    'Secondary and exploratory objectives',
    'Alignment with intended use and regulatory pathways',
    'Reference to approved Synopsis'
  ],
  '4.3': [
    'Device name, manufacturer, and technical specifications',
    'Intended use statement consistent with regulatory scope',
    'Device description including components and materials',
    'Risk classification and applicable regulatory standards',
    'Reference to technical documentation and Instructions for Use'
  ],
  '4.4': [
    'Study type (e.g., prospective, single-arm, randomized)',
    'Control strategy or comparison group if applicable',
    'Number of subjects and enrollment justification',
    'Study duration and follow-up period',
    'Visit structure and assessment timing',
    'Alignment with defined endpoints'
  ],
  '4.5': [
    'Inclusion criteria defining target population',
    'Exclusion criteria including medical and technical contraindications',
    'Age, gender, and demographic specifications',
    'Disease severity or stage requirements',
    'Concomitant therapy restrictions',
    'Consistency with Synopsis and intended use'
  ],
  '4.6': [
    'Complete visit schedule from screening to study completion',
    'Assessments at each visit supporting all endpoints',
    'Device-specific procedures and follow-up protocols',
    'Permitted visit windows',
    'Unscheduled visit procedures',
    'Study discontinuation criteria'
  ],
  '4.7': [
    'Adverse event definitions aligned with applicable standards (ISO 14155, VARC-3)',
    'Severity grading and causality assessment procedures',
    'Serious adverse event reporting timelines',
    'Data Safety Monitoring Board charter and responsibilities',
    'Safety stopping rules or early termination criteria',
    'Post-market surveillance requirements'
  ],
  '4.8': [
    'Analysis populations (ITT, per-protocol, safety)',
    'Primary endpoint analysis method and statistical test',
    'Sample size calculation with assumptions and power',
    'Secondary and exploratory endpoint analysis plans',
    'Handling of missing data and protocol deviations',
    'Interim analysis plan if applicable',
    'Reference to Statistical Analysis Plan'
  ],
  '4.9': [
    'Applicable regulations (FDA 21 CFR, EU MDR, ISO 14155)',
    'Ethics committee approval requirements',
    'Informed consent process and documentation',
    'Data protection and GDPR compliance',
    'Protocol amendments and deviation procedures',
    'Study record retention requirements',
    'Insurance and indemnification provisions'
  ]
};

export function SectionContentGuidance({ sectionNumber }: SectionContentGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const purpose = purposeMap[sectionNumber] || 'Provide required information for this section.';
  const expectations = contentExpectationsMap[sectionNumber] || [];

  return (
    <div className="space-y-3">
      {/* Purpose Line - Always Visible */}
      <div className="text-sm text-slate-600 italic">
        Purpose: {purpose}
      </div>

      {/* Collapsible Content Expectations */}
      <div className="border border-slate-200 rounded-lg bg-slate-50">
        <button
          className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-slate-100 transition-colors rounded-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <BookOpen className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700">
            What this section must include
          </span>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1">
            <ul className="space-y-1.5 text-xs text-slate-600">
              {expectations.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
