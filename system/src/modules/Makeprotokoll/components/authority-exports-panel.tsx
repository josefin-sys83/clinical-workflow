import React, { useState } from 'react';
import { FileDown, CheckCircle, AlertCircle, AlertTriangle, FileText, Download } from 'lucide-react';

interface ExportProfile {
  id: string;
  name: string;
  description: string;
  authority: string;
  icon: string;
}

interface DocumentItem {
  name: string;
  included: boolean;
}

interface ValidationResult {
  category: string;
  status: 'Pass' | 'Warning' | 'Blocker';
  message: string;
}

interface AuthorityExportsPanelProps {
  protocolName: string;
  versionId: string;
  lastActivity?: string;
}

export function AuthorityExportsPanel({ 
  protocolName, 
  versionId, 
  lastActivity 
}: AuthorityExportsPanelProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>('eu-mdr');

  const exportProfiles: ExportProfile[] = [
    {
      id: 'eu-mdr',
      name: 'EU (MDR / ISO 14155)',
      description: 'Export package for EU competent authorities and Ethics Committees',
      authority: 'European Union Medical Device Regulation 2017/745',
      icon: '🇪🇺'
    },
    {
      id: 'us-fda',
      name: 'US (FDA IDE / 21 CFR 812)',
      description: 'Export package for FDA Investigational Device Exemption submission',
      authority: 'US Food and Drug Administration',
      icon: '🇺🇸'
    },
    {
      id: 'sponsor',
      name: 'Sponsor Template',
      description: 'Internal sponsor format with full audit trail and metadata',
      authority: 'CardioMed Technologies Internal Standard',
      icon: '🏢'
    }
  ];

  const getProfileDocuments = (profileId: string): DocumentItem[] => {
    const commonDocs = [
      { name: 'Clinical Investigation Plan (Protocol)', included: true },
      { name: 'Protocol Synopsis', included: true },
      { name: 'Investigator Brochure', included: true },
      { name: 'Risk Management File Summary', included: true },
      { name: 'Device Technical Documentation', included: true }
    ];

    switch (profileId) {
      case 'eu-mdr':
        return [
          ...commonDocs,
          { name: 'ISO 14155:2020 Compliance Matrix', included: true },
          { name: 'Declaration of Conformity', included: true },
          { name: 'EU Ethics Committee Application Form', included: true },
          { name: 'MDR Annex XV Clinical Evaluation Report', included: true },
          { name: 'Informed Consent Form (local languages)', included: true }
        ];
      case 'us-fda':
        return [
          ...commonDocs,
          { name: 'FDA Form 1571 (Investigational Device)', included: true },
          { name: 'FDA Form 1572 (Investigator Statement)', included: true },
          { name: '21 CFR 812 Compliance Checklist', included: true },
          { name: 'Monitoring Plan per GCP', included: true },
          { name: 'IRB Application Package', included: true }
        ];
      case 'sponsor':
        return [
          ...commonDocs,
          { name: 'Complete Audit Trail Export', included: true },
          { name: 'Section Approval Log with Signatures', included: true },
          { name: 'Amendment History with Rationale', included: true },
          { name: 'Justified Deviations Log', included: true },
          { name: 'Internal Quality Review Sign-off', included: true },
          { name: 'AI Generation Metadata', included: true }
        ];
      default:
        return commonDocs;
    }
  };

  const getProfileValidation = (profileId: string): ValidationResult[] => {
    switch (profileId) {
      case 'eu-mdr':
        return [
          {
            category: 'Structure & Formatting',
            status: 'Pass',
            message: 'All required sections present per ISO 14155:2020 § 6'
          },
          {
            category: 'Regulatory Compliance',
            status: 'Pass',
            message: 'MDR 2017/745 requirements satisfied'
          },
          {
            category: 'Language Requirements',
            status: 'Pass',
            message: 'Protocol available in English; Consent forms in DE/FR/NL'
          },
          {
            category: 'Ethics Documentation',
            status: 'Pass',
            message: 'Ethics Committee submission package complete'
          },
          {
            category: 'Risk-Benefit Assessment',
            status: 'Pass',
            message: 'ISO 14971 risk management file properly referenced'
          }
        ];
      case 'us-fda':
        return [
          {
            category: 'Structure & Formatting',
            status: 'Pass',
            message: 'Protocol format compliant with 21 CFR 812.25'
          },
          {
            category: 'Regulatory Compliance',
            status: 'Warning',
            message: 'Sample size may require additional justification for FDA review'
          },
          {
            category: 'GCP Compliance',
            status: 'Pass',
            message: 'ICH-GCP E6(R2) requirements satisfied'
          },
          {
            category: 'Informed Consent',
            status: 'Pass',
            message: 'Consent form includes all 21 CFR 50.25 required elements'
          },
          {
            category: 'Device Description',
            status: 'Pass',
            message: 'Device specifications complete per 21 CFR 812.20'
          }
        ];
      case 'sponsor':
        return [
          {
            category: 'Content Completeness',
            status: 'Pass',
            message: 'All protocol sections approved and locked'
          },
          {
            category: 'Audit Trail',
            status: 'Pass',
            message: 'Complete edit history with timestamps and user IDs'
          },
          {
            category: 'Quality Review',
            status: 'Pass',
            message: 'All quality checkpoints satisfied'
          },
          {
            category: 'Version Control',
            status: 'Pass',
            message: 'Version history complete with amendment documentation'
          },
          {
            category: 'Metadata',
            status: 'Pass',
            message: 'AI generation sources and confidence scores documented'
          }
        ];
      default:
        return [];
    }
  };

  const currentProfile = exportProfiles.find(p => p.id === selectedProfile);
  const currentDocuments = getProfileDocuments(selectedProfile);
  const currentValidation = getProfileValidation(selectedProfile);

  const blockerCount = currentValidation.filter(v => v.status === 'Blocker').length;
  const warningCount = currentValidation.filter(v => v.status === 'Warning').length;
  const passCount = currentValidation.filter(v => v.status === 'Pass').length;

  const hasBlockers = blockerCount > 0;
  const canDownloadDraft = warningCount > 0 && blockerCount === 0;

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'Pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Blocker':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getValidationColor = (status: string) => {
    switch (status) {
      case 'Pass':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'Warning':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Blocker':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const handleGenerateExport = () => {
    console.log('Generate submission export for:', selectedProfile);
    alert(`Submission export generated for ${currentProfile?.name}\n\nPackage includes ${currentDocuments.length} documents formatted per ${currentProfile?.authority} requirements.\n\nAll export actions are audit-logged.`);
  };

  const handleDownloadDraft = () => {
    console.log('Download draft export for:', selectedProfile);
    alert(`Draft export downloaded for ${currentProfile?.name}\n\nNote: This is a draft with ${warningCount} Warning(s). Review Warnings before final submission.\n\nAll actions are audit-logged.`);
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
              <FileDown className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Exports</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Authority-specific export packages for regulatory submission
              </p>
            </div>
          </div>
          {lastActivity && (
            <div className="text-xs text-slate-500">
              <span className="text-slate-400">Last activity:</span> {lastActivity}
            </div>
          )}
        </div>
      </div>

      {/* Profile Selector */}
      <div className="px-5 py-4 border-b border-slate-200">
        <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
          Select Export Profile
        </label>
        <div className="grid grid-cols-3 gap-3">
          {exportProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile.id)}
              className={`p-4 border rounded-lg text-left transition-all ${
                selectedProfile === profile.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="text-2xl mb-2">{profile.icon}</div>
              <div className={`text-sm font-semibold mb-1 ${
                selectedProfile === profile.id ? 'text-blue-900' : 'text-slate-900'
              }`}>
                {profile.name}
              </div>
              <p className={`text-xs leading-relaxed ${
                selectedProfile === profile.id ? 'text-blue-700' : 'text-slate-600'
              }`}>
                {profile.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Profile Details */}
      {currentProfile && (
        <>
          {/* Included Documents */}
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
              Included Documents ({currentDocuments.length})
            </div>
            <div className="space-y-1.5">
              {currentDocuments.map((doc, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm py-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">{doc.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Results */}
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Format & Structure Validation
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-slate-700">{passCount} Pass</span>
                </div>
                {warningCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700">{warningCount} Warning</span>
                  </div>
                )}
                {blockerCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700">{blockerCount} Blocker</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {currentValidation.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    result.status === 'Pass' ? 'bg-green-50/30' :
                    result.status === 'Warning' ? 'bg-amber-50/30' :
                    'bg-red-50/30'
                  }`}
                >
                  <div className="mt-0.5">{getValidationIcon(result.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="text-sm font-medium text-slate-900">
                        {result.category}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs font-medium border rounded whitespace-nowrap ${getValidationColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authority Information */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="text-xs text-slate-600">
              <span className="font-medium">Regulatory Authority:</span> {currentProfile.authority}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 bg-white">
            {hasBlockers && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900 mb-0.5">
                      Cannot generate submission export
                    </div>
                    <p className="text-xs text-red-800">
                      {blockerCount} critical validation {blockerCount === 1 ? 'Issue' : 'Issues'} must be resolved before export.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canDownloadDraft && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-900 mb-0.5">
                      Warnings detected
                    </div>
                    <p className="text-xs text-amber-800">
                      {warningCount} validation {warningCount === 1 ? 'Warning' : 'Warnings'}. You can download a draft or resolve Warnings first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                All export actions are audit-logged with full traceability
              </p>
              <div className="flex gap-2">
                {canDownloadDraft && (
                  <button
                    onClick={handleDownloadDraft}
                    className="px-4 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Draft Export
                  </button>
                )}
                <button
                  onClick={handleGenerateExport}
                  disabled={hasBlockers}
                  className={`px-5 py-2.5 text-sm rounded-md font-medium transition-colors flex items-center gap-2 ${
                    hasBlockers
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  Generate Submission Export
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}