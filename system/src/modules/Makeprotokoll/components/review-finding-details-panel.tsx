import React from 'react';
import { X, AlertTriangle, AlertCircle, FileQuestion, ExternalLink, User, CheckCircle, Clock } from 'lucide-react';

interface ReviewFindingDetailsPanelProps {
  findingId: string;
  onClose: () => void;
  onOpenSection: (sectionId: string, paragraphId?: string) => void;
}

interface FindingDetail {
  id: string;
  title: string;
  type: 'Conflict' | 'Missing' | 'Inconsistency' | 'Regulatory';
  severity: 'Blocker' | 'High' | 'Medium';
  status: 'Open' | 'In Progress' | 'Resolved';
  detectedSources: {
    source: string;
    link: string;
    excerpt: string;
  }[];
  protocolLocation: {
    section: string;
    sectionId: string;
    paragraphId?: string;
    excerpt: string;
  };
  owner: {
    role: string;
    name: string;
  };
  requiredAction: string;
  detectedAt: string;
  assignedTo?: string;
}

const findingsData: Record<string, FindingDetail> = {
  'C1': {
    id: 'C1',
    title: 'Primary endpoint definition differs from Synopsis',
    type: 'Conflict',
    severity: 'Blocker',
    status: 'Open',
    detectedSources: [
      {
        source: 'Synopsis § 2.3 — Primary Endpoint',
        link: 'synopsis-2.3',
        excerpt: 'Primary safety endpoint: All-cause mortality at 30 days post-procedure'
      }
    ],
    protocolLocation: {
      section: '4.2 — Study Rationale & Objectives',
      sectionId: '4.2',
      paragraphId: 'primary-objective',
      excerpt: 'Primary endpoint: Composite of all-cause mortality and major adverse cardiac events (MACE) at 30-day follow-up'
    },
    owner: {
      role: 'Clinical Lead',
      name: 'Dr. James Patterson'
    },
    requiredAction: 'Align endpoint definition with approved Synopsis or submit formal protocol deviation justification',
    detectedAt: 'Feb 4, 2026 at 09:15 CET',
    assignedTo: 'Dr. James Patterson'
  },
  'C2': {
    id: 'C2',
    title: 'Inclusion criteria age threshold differs from Synopsis',
    type: 'Conflict',
    severity: 'High',
    status: 'In Progress',
    detectedSources: [
      {
        source: 'Synopsis § 3.2 — Inclusion Criteria',
        link: 'synopsis-3.2',
        excerpt: 'Age ≥70 years at time of consent'
      }
    ],
    protocolLocation: {
      section: '4.5 — Subject Eligibility Criteria',
      sectionId: '4.5',
      paragraphId: 'inclusion-age',
      excerpt: 'Age ≥65 years at time of consent'
    },
    owner: {
      role: 'Medical Writer',
      name: 'Emma Rodriguez'
    },
    requiredAction: 'Update age criteria to match Synopsis or obtain Clinical Lead approval for deviation with scientific rationale',
    detectedAt: 'Feb 4, 2026 at 09:16 CET',
    assignedTo: 'Emma Rodriguez'
  },
  'M1': {
    id: 'M1',
    title: 'Missing device size specifications',
    type: 'Missing',
    severity: 'High',
    status: 'Open',
    detectedSources: [
      {
        source: 'Gate 3 § Device Specification',
        link: 'gate3-device',
        excerpt: 'CardioFlow system available in 23mm, 26mm, 29mm valve sizes. Catheter sizes: 14F (23mm), 15F (26mm), 16F (29mm)'
      }
    ],
    protocolLocation: {
      section: '4.3 — Device Description',
      sectionId: '4.3',
      paragraphId: 'device-sizes',
      excerpt: 'The valve is available in three sizes (23mm, 26mm, 29mm)... The delivery system features a 14-16 French catheter'
    },
    owner: {
      role: 'Regulatory Affairs',
      name: 'Anna Schmidt'
    },
    requiredAction: 'Add specific catheter size mapping for each valve size as specified in device master file',
    detectedAt: 'Feb 4, 2026 at 09:18 CET',
    assignedTo: 'Anna Schmidt'
  },
  'M2': {
    id: 'M2',
    title: 'DSMB stopping criteria not specified',
    type: 'Missing',
    severity: 'Blocker',
    status: 'Open',
    detectedSources: [
      {
        source: 'ISO 14155:2020 § 8.2.4',
        link: 'iso-14155',
        excerpt: 'Safety monitoring plan shall include pre-defined stopping criteria for serious adverse events'
      }
    ],
    protocolLocation: {
      section: '4.7 — Safety Monitoring',
      sectionId: '4.7',
      paragraphId: 'dsmb-charter',
      excerpt: 'DSMB charter defining roles, responsibilities, and stopping rules approved separately'
    },
    owner: {
      role: 'Safety Officer',
      name: 'Dr. Lisa Patel'
    },
    requiredAction: 'Reference specific DSMB charter document number or include stopping criteria directly in protocol',
    detectedAt: 'Feb 4, 2026 at 09:22 CET',
    assignedTo: 'Dr. Lisa Patel'
  },
  'R1': {
    id: 'R1',
    title: 'Sample size justification may not meet MDR requirements',
    type: 'Regulatory',
    severity: 'High',
    status: 'Open',
    detectedSources: [
      {
        source: 'MDR 2017/745 Annex XV Part B § 3.4',
        link: 'mdr-annex-xv',
        excerpt: 'Clinical investigation plan shall provide justification for sample size with sufficient statistical power'
      }
    ],
    protocolLocation: {
      section: '4.8 — Statistical Considerations',
      sectionId: '4.8',
      paragraphId: 'sample-size',
      excerpt: 'Sample size of 120 subjects provides 90% power... assuming a true event rate of 8%'
    },
    owner: {
      role: 'Biostatistician',
      name: 'Dr. Michael Zhang'
    },
    requiredAction: 'Verify power calculation methodology and confirm event rate assumptions are supported by predicate device data',
    detectedAt: 'Feb 4, 2026 at 09:25 CET',
    assignedTo: 'Dr. Michael Zhang'
  }
};

export function ReviewFindingDetailsPanel({ findingId, onClose, onOpenSection }: ReviewFindingDetailsPanelProps) {
  const finding = findingsData[findingId];

  if (!finding) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Blocker':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'High':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Conflict':
        return <AlertTriangle className="w-5 h-5" />;
      case 'Missing':
        return <FileQuestion className="w-5 h-5" />;
      case 'Inconsistency':
        return <AlertCircle className="w-5 h-5" />;
      case 'Regulatory':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl border-l border-slate-300 flex flex-col z-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(finding.severity)}`}>
                {getTypeIcon(finding.type)}
                {finding.severity}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${getStatusColor(finding.status)}`}>
                {getStatusIcon(finding.status)}
                {finding.status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {finding.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{finding.owner.role}</span>
            <span className="text-slate-400">•</span>
            <span>{finding.owner.name}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Issue Type */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Issue Type
          </div>
          <div className="flex items-center gap-2">
            {getTypeIcon(finding.type)}
            <span className="text-sm font-medium text-slate-900">{finding.type}</span>
          </div>
        </div>

        {/* Detected Sources */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Detected Source{finding.detectedSources.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-3">
            {finding.detectedSources.map((source, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-sm text-slate-900">
                    {source.source}
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded p-3 font-mono leading-relaxed">
                  "{source.excerpt}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Protocol Location */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Protocol Location
          </div>
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-sm text-slate-900">
                {finding.protocolLocation.section}
              </div>
              <button
                onClick={() => onOpenSection(finding.protocolLocation.sectionId, finding.protocolLocation.paragraphId)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Open Section
              </button>
            </div>
            <div className="text-sm text-slate-700 bg-white border border-orange-300 rounded p-3 font-mono leading-relaxed">
              <span className={finding.severity === 'Blocker' ? 'bg-red-100 border-l-2 border-red-500 px-2 py-1 inline-block' : 'bg-orange-100 border-l-2 border-orange-500 px-2 py-1 inline-block'}>
                "{finding.protocolLocation.excerpt}"
              </span>
            </div>
          </div>
        </div>

        {/* Inline Diff Comparison */}
        {finding.type === 'Conflict' && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Comparison (Inline Diff)
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 border-b border-red-200 p-3">
                <div className="text-xs font-semibold text-red-800 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-red-600" />
                  Protocol (Current)
                </div>
                <div className="text-sm font-mono text-slate-700 leading-relaxed">
                  <span className="bg-red-200 px-1">
                    {finding.protocolLocation.excerpt}
                  </span>
                </div>
              </div>
              <div className="bg-green-50 p-3">
                <div className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-green-600" />
                  {finding.detectedSources[0].source}
                </div>
                <div className="text-sm font-mono text-slate-700 leading-relaxed">
                  <span className="bg-green-200 px-1">
                    {finding.detectedSources[0].excerpt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Required Action */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Required Action
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-slate-900 leading-relaxed">
              {finding.requiredAction}
            </p>
          </div>
        </div>

        {/* Assignment */}
        {finding.assignedTo && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Assigned To
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-sm font-medium text-slate-900">{finding.assignedTo}</div>
                <div className="text-xs text-slate-600">{finding.owner.role}</div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Detected {finding.detectedAt}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-slate-50">
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 text-sm border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors font-medium">
            Mark In Progress
          </button>
          <button className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
