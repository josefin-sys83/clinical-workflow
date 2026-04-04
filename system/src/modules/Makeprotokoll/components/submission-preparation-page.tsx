import React from 'react';
import { ArrowLeft, Lock, FileText, History } from 'lucide-react';
import { eTMFPackagePanel } from './etmf-package-panel';
import { FinalSignoffPanel } from './final-signoff-panel';
import { AuthorityExportsPanel } from './authority-exports-panel';

interface SubmissionPreparationPageProps {
  protocolName?: string;
  versionId?: string;
  onBackToProtocol: () => void;
}

export function SubmissionPreparationPage({
  protocolName = 'CardioFlow Valve Performance Study',
  versionId = '2.1',
  onBackToProtocol
}: SubmissionPreparationPageProps) {
  const [allSignoffsComplete, setAllSignoffsComplete] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-300 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToProtocol}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
                title="Back to Protocol"
                aria-label="Back to Protocol"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-semibold text-slate-900">
                    {protocolName}
                  </h1>
                  {allSignoffsComplete && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium border border-green-200 rounded">
                      <Lock className="w-3 h-3" />
                      Locked / Approved
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div>
                    <span className="text-slate-400">Version:</span>{' '}
                    <span className="font-medium text-slate-700">{versionId}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div>
                    <span className="text-slate-400">Status:</span>{' '}
                    <span className="font-medium text-slate-700">Submission Preparation</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Immutable snapshot</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                console.log('View complete audit trail');
                alert('Complete Audit Trail\n\nShowing full protocol history:\n- All section edits with timestamps\n- AI generation events\n- Review cycles\n- Approvals and sign-offs\n- eTMF filing actions\n- Export generations\n\nAll events logged with user ID, timestamp, and IP address per 21 CFR Part 11.');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              <History className="w-4 h-4" />
              View Complete Audit Trail
            </button>
          </div>

          {/* Immutable Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Lock className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-blue-900">
              <span className="font-medium">Protocol content is locked.</span>{' '}
              <span className="text-blue-800">
                This is an immutable snapshot. Any future changes require formal amendment approval per ISO 14155:2020 § 6.3.8.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="space-y-6">
          {/* Page Introduction */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              Submission Preparation
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Complete the following steps to prepare the protocol for regulatory submission: (1) Generate eTMF filing package for Trial Master File, (2) Obtain final electronic sign-offs from required roles, and (3) Generate authority-specific export packages (EU MDR, US FDA, or Sponsor format). All actions are audit-logged with full traceability.
            </p>
          </div>

          {/* Final Sign-off Panel */}
          <FinalSignoffPanel
            protocolName={protocolName}
            versionId={versionId}
            lastActivity="Feb 8, 2026 at 15:10 CET"
            onAllSignoffsComplete={() => setAllSignoffsComplete(true)}
          />

          {/* eTMF Package Panel */}
          <eTMFPackagePanel
            protocolName={protocolName}
            versionId={versionId}
            lastActivity="Feb 8, 2026 at 14:23 CET"
          />

          {/* Authority Exports Panel */}
          <AuthorityExportsPanel
            protocolName={protocolName}
            versionId={versionId}
            lastActivity="Not yet generated"
          />

          {/* Completion Status */}
          {allSignoffsComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-green-900 mb-1">
                    Protocol Approved and Locked
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed mb-3">
                    All required sign-offs are complete. The protocol is now approved and immutable. Generate authority-specific export packages for submission to competent authorities and Ethics Committees.
                  </p>
                  <div className="text-xs text-green-700">
                    <div className="mb-1">
                      <span className="font-medium">Next steps:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>Generate eTMF filing pack and file to Trial Master File</li>
                      <li>Generate EU MDR export for competent authority submission</li>
                      <li>Distribute approved protocol to all participating sites</li>
                      <li>Begin Ethics Committee application submissions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}