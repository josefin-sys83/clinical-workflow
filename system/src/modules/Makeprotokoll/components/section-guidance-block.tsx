import React, { useState } from 'react';
import { Info, User, CheckCircle, AlertCircle, Clock, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface SectionGuidanceBlockProps {
  sectionNumber: string;
  sectionTitle: string;
  purpose: string;
  mustInclude: string[];
  ownerRole: string;
  ownerName: string;
  status: string;
}

const sectionGuidance: Record<string, { purpose: string; mustInclude: string[] }> = {
  '4.2': {
    purpose: 'Establish the scientific foundation and clinical objectives for the investigation',
    mustInclude: [
      'Scientific rationale for the clinical investigation',
      'Primary and secondary objectives clearly stated',
      'Alignment with approved Synopsis and Intended Use',
      'References to predicate devices and clinical evidence'
    ]
  },
  '4.3': {
    purpose: 'Provide complete technical and regulatory specification of the investigational device',
    mustInclude: [
      'Device name, manufacturer, and classification',
      'Detailed technical specifications and sizes',
      'Intended use and indications for use',
      'Reference to device master file and biocompatibility testing'
    ]
  },
  '4.4': {
    purpose: 'Define the overall study structure, population, and methodology',
    mustInclude: [
      'Study type (e.g., prospective, single-arm, multi-center)',
      'Target population with clear inclusion/exclusion criteria',
      'Sample size with statistical justification',
      'Study duration and follow-up schedule'
    ]
  },
  '4.5': {
    purpose: 'Define precise criteria for subject selection and exclusion',
    mustInclude: [
      'Complete inclusion criteria with measurable parameters',
      'Complete exclusion criteria including safety considerations',
      'Justification for age, gender, and comorbidity restrictions',
      'Alignment with Synopsis and regulatory guidance'
    ]
  },
  '4.6': {
    purpose: 'Describe all procedures, visits, and assessments throughout the study',
    mustInclude: [
      'Screening and baseline procedures',
      'Device implantation procedure details',
      'Follow-up visit schedule with timing windows',
      'Required assessments and imaging at each timepoint'
    ]
  },
  '4.7': {
    purpose: 'Establish the risk-benefit assessment for the investigational device',
    mustInclude: [
      'Risk-benefit rationale linked to intended use',
      'Reference to ISO 14971 risk management file',
      'Clinical risk characterization with incidence estimates',
      'Expected clinical benefits with supporting evidence'
    ]
  },
  '4.8': {
    purpose: 'Define adverse event management and safety reporting framework',
    mustInclude: [
      'Definitions of AE, SAE, SADE, and USADE per ISO 14155',
      'Safety reporting timelines per MDR Article 80',
      'Assignment of safety responsibilities',
      'Alignment with VARC-3 or relevant consensus definitions'
    ]
  },
  '4.9': {
    purpose: 'Establish protocol deviation and amendment management processes',
    mustInclude: [
      'Definition of minor vs major protocol deviations',
      'Definition of substantial vs non-substantial amendments',
      'Documentation and approval process',
      'Protocol version control and history'
    ]
  },
  '4.10': {
    purpose: 'Define ethical oversight and informed consent requirements',
    mustInclude: [
      'Ethics Committee review and approval requirements',
      'Informed consent process per ISO 14155 and local regulations',
      'Vulnerable populations considerations',
      'Subject rights and withdrawal procedures'
    ]
  },
  '4.11': {
    purpose: 'Establish data protection and confidentiality framework',
    mustInclude: [
      'GDPR compliance and legal basis for processing',
      'Data pseudonymization and subject identification',
      'Access controls and data retention periods',
      'Confidentiality measures and breach reporting'
    ]
  }
};

export function SectionGuidanceBlock({
  sectionNumber,
  sectionTitle,
  ownerRole,
  ownerName,
  status
}: Omit<SectionGuidanceBlockProps, 'purpose' | 'mustInclude'>) {
  const guidance = sectionGuidance[sectionNumber] || {
    purpose: 'Provide complete and accurate information per ISO 14155:2020 requirements',
    mustInclude: [
      'All required regulatory content per ISO 14155:2020',
      'Alignment with approved Synopsis and upstream gates',
      'Clear and unambiguous terminology',
      'References to source documents where applicable'
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'Draft':
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
      case 'Approved':
        return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'Locked':
        return <Lock className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'Draft':
        return 'text-slate-600 bg-slate-50 border-slate-100';
      case 'Approved':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'Locked':
        return 'text-slate-700 bg-slate-100 border-slate-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
      {/* Header - what this section must include */}
      <div className="px-4 py-3 bg-slate-50">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              What this section must include
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">{guidance.purpose}</p>
            
            <ul className="space-y-1.5">
              {guidance.mustInclude.map((item, index) => (
                <li key={index} className="text-xs text-slate-700 flex items-start gap-2">
                  <span className="text-slate-400 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Ownership and status row */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Owner:</span>
            <span className="font-medium text-slate-700">{ownerName}</span>
            <span className="text-slate-400">({ownerRole})</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          {status}
        </div>
      </div>

      {/* AI Notice - Only for Draft - More subtle */}
      {status === 'Draft' && (
        <div className="px-4 py-2 bg-blue-50/50 border-t border-blue-100/50">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-blue-600 text-white rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              AI
            </div>
            <span className="text-xs text-blue-800">
              AI-generated draft • Editable until approved • All edits logged
            </span>
          </div>
        </div>
      )}
    </div>
  );
}