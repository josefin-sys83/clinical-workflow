import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review1' | 'Review2' | 'Review3' | 'Review4' | 'Locked';

interface Issue {
  id: string;
  type: 'Missing' | 'Conflict' | 'Gap';
  severity: 'Blocker' | 'High' | 'Info';
  title: string;
  description: string;
  affectedSection: string;
  owner: string;
  relevantForMode: ReviewMode[];
}

interface ConsistencyIssue {
  id: string;
  title: string;
  synopsisSection: string;
  protocolSection: string;
  severity: 'Blocker' | 'High' | 'Info';
}

const allIssues: Issue[] = [
  {
    id: 'I1',
    type: 'Conflict',
    severity: 'Blocker',
    title: 'Endpoint definition differs from Synopsis',
    description: 'Protocol §4.2 defines primary endpoint as "composite of all-cause mortality and MACE" but Synopsis §2.3 specifies "cardiovascular mortality and MACE"',
    affectedSection: '4.2',
    owner: 'Medical Writer',
    relevantForMode: ['Draft', 'Review1', 'Review2']
  },
  {
    id: 'I2',
    type: 'Missing',
    severity: 'High',
    title: 'Sample size source document not cited',
    description: 'Statistical power calculation references 15% performance goal but source document not cited',
    affectedSection: '4.8',
    owner: 'Biostatistician',
    relevantForMode: ['Draft', 'Review1']
  },
  {
    id: 'I3',
    type: 'Gap',
    severity: 'High',
    title: 'Biocompatibility testing not referenced',
    description: 'ISO 10993 biocompatibility testing should be referenced for Class III implantable device per MDR Annex I',
    affectedSection: '4.3',
    owner: 'Regulatory Affairs',
    relevantForMode: ['Review2']
  },
  {
    id: 'I4',
    type: 'Missing',
    severity: 'Info',
    title: 'DSMB charter not attached',
    description: 'Section references DSMB but charter document not linked in system',
    affectedSection: '4.7',
    owner: 'Safety Officer',
    relevantForMode: ['Review3']
  }
];

const consistencyIssues: ConsistencyIssue[] = [
  {
    id: 'C1',
    title: 'Endpoint definition differs from Synopsis',
    synopsisSection: '§ 2.3 Primary Endpoint',
    protocolSection: '§ 4.2 Study Objectives',
    severity: 'Blocker'
  },
  {
    id: 'C2',
    title: 'Target population age range not specified',
    synopsisSection: '§ 3.1 Study Population',
    protocolSection: '§ 4.5 Eligibility Criteria',
    severity: 'High'
  }
];

interface IssuesConsistencyPanelProps {
  onReviewDetailsClick?: (issueId: string) => void;
  onOpenSection?: (sectionId: string) => void;
  filterSection?: string | null;
}

export function IssuesConsistencyPanel({ onReviewDetailsClick, onOpenSection, filterSection }: IssuesConsistencyPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'blockers' | 'all'>('blockers');

  const issues: Issue[] = [
    {
      id: 'C1',
      title: 'Primary endpoint definition differs from Synopsis',
      description: 'Protocol § 4.2 defines "composite of all-cause mortality and MACE" but Synopsis § 2.3 specifies "all-cause mortality at 30 days"',
      severity: 'blocker',
      type: 'Conflict',
      protocolSection: '4.2',
      synopsisReference: '§ 2.3',
      detectedBy: 'AI Consistency Check',
      detectedOn: 'Feb 4, 2026'
    },
    {
      id: 'C2',
      title: 'Inclusion criteria age threshold differs from Synopsis',
      description: 'Protocol § 4.5 specifies "Age ≥65 years" but Synopsis § 3.2 states "Age ≥70 years"',
      severity: 'high',
      type: 'Conflict',
      protocolSection: '4.5',
      synopsisReference: '§ 3.2',
      detectedBy: 'AI Consistency Check',
      detectedOn: 'Feb 4, 2026'
    },
    {
      id: 'M1',
      title: 'Missing device size specifications',
      description: 'Device description lacks specific catheter size mapping per valve size (14F/15F/16F)',
      severity: 'high',
      type: 'Missing',
      protocolSection: '4.3',
      synopsisReference: 'Gate 3',
      detectedBy: 'QA Review',
      detectedOn: 'Feb 4, 2026'
    },
    {
      id: 'M2',
      title: 'DSMB stopping criteria not specified',
      description: 'Section references DSMB charter but stopping rules not included in protocol per ISO 14155:2020',
      severity: 'blocker',
      type: 'Missing',
      protocolSection: '4.7',
      synopsisReference: 'N/A',
      detectedBy: 'Regulatory Check',
      detectedOn: 'Feb 4, 2026'
    },
    {
      id: 'R1',
      title: 'Sample size justification may not meet MDR requirements',
      description: 'Power calculation methodology needs verification per MDR 2017/745 Annex XV Part B § 3.4',
      severity: 'high',
      type: 'Regulatory',
      protocolSection: '4.8',
      synopsisReference: 'N/A',
      detectedBy: 'Regulatory Check',
      detectedOn: 'Feb 4, 2026'
    }
  ];

  const blockerIssues = issues.filter(issue => issue.severity === 'blocker');
  
  // Apply section filter if provided
  let filteredIssues = selectedTab === 'blockers' ? blockerIssues : issues;
  if (filterSection) {
    filteredIssues = filteredIssues.filter(issue => issue.protocolSection === filterSection);
  }
  
  const displayIssues = filteredIssues;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'border-red-300 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <div className="bg-white border-l border-slate-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 z-10">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Issues & Consistency</h2>
        
        {/* Filter indicator */}
        {filterSection && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
            <span className="text-xs text-amber-900">
              Filtered to Section {filterSection}
            </span>
            <button
              onClick={() => {
                // This would need to be a callback to parent to clear filter
                console.log('Clear filter');
              }}
              className="text-xs text-amber-700 hover:text-amber-900 underline"
            >
              Show all
            </button>
          </div>
        )}
        
        {/* Tab selector - blockers first */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('blockers')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedTab === 'blockers'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Blockers ({blockerIssues.length})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({issues.length})
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {displayIssues.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No blocking issues found
          </div>
        ) : (
          displayIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 border rounded-lg ${getSeverityColor(issue.severity)}`}
            >
              {/* Issue header - cleaner */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-900 mb-1">{issue.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{issue.description}</p>
                </div>
              </div>

              {/* Metadata - de-emphasized */}
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span>§ {issue.protocolSection}</span>
                {issue.synopsisReference !== 'N/A' && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>vs {issue.synopsisReference}</span>
                  </>
                )}
              </div>

              {/* Single action */}
              <button
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium"
                onClick={() => {
                  if (onReviewDetailsClick) {
                    onReviewDetailsClick(issue.id);
                  }
                }}
              >
                Review Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}