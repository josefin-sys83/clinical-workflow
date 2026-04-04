import React from 'react';
import { Lock, User, FileText } from 'lucide-react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { ProjectData } from '../App';

interface LockedArchivedProps {
  onRequestAmendment: () => void;
  onGoToSubmission: () => void;
  projectData: ProjectData;
}

export function LockedArchived({ onRequestAmendment, onGoToSubmission, projectData }: LockedArchivedProps) {
  const approvals = [
    { role: 'Medical Writer', name: 'Dr. Emma Weber', timestamp: 'Feb 8, 2026 at 14:30 CET', status: 'Signed' },
    { role: 'Regulatory Affairs', name: 'Lisa Schmidt', timestamp: 'Feb 8, 2026 at 15:15 CET', status: 'Signed' },
    { role: 'Clinical Operations', name: 'Dr. Michael Berg', timestamp: 'Feb 8, 2026 at 16:00 CET', status: 'Signed' },
    { role: 'Project Manager', name: 'Anna Schneider', timestamp: 'Feb 8, 2026 at 16:45 CET', status: 'Signed' }
  ];

  const auditSummary = [
    { event: 'PROTOCOL_LOCKED', user: 'Anna Schneider', timestamp: 'Feb 8, 2026 at 16:45' },
    { event: 'SECTION_APPROVED', user: 'Lisa Schmidt', section: '4.8 Data Handling', timestamp: 'Feb 8, 2026 at 16:40' },
    { event: 'REVIEW_COMPLETED', user: 'Dr. Michael Berg', timestamp: 'Feb 8, 2026 at 16:30' },
    { event: 'CONFLICT_RESOLVED', user: 'Dr. Emma Weber', section: '4.5 Study Endpoints', timestamp: 'Feb 8, 2026 at 14:20' }
  ];

  return (
    <>
      <GlobalHeader
        projectName={projectData.projectName}
        protocolId={projectData.protocolId}
        version={projectData.version}
        protocolState="Locked"
        currentUserRole="Medical Writer"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="locked-archived"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-4xl mx-auto p-8">
            {/* Locked Banner */}
            <div className="mb-8 p-6 bg-green-50 border border-green-300 rounded-lg">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-base font-semibold text-green-900 mb-2">
                    Protocol Locked
                  </div>
                  <div className="text-sm text-green-800 mb-3">
                    This protocol is now immutable. All changes require a formal amendment process with full audit trail.
                  </div>
                  <div className="text-xs text-green-700">
                    Version: {projectData.version} · Hash: 7f4a9c2e8b1d · Locked: Feb 8, 2026 at 16:45 CET
                  </div>
                </div>
              </div>
            </div>

            {/* Protocol Summary */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                {projectData.projectName}
              </h1>
              <p className="text-sm text-slate-600">
                {projectData.protocolId} · {projectData.version}
              </p>
            </div>

            {/* Approval Signatures */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Approval Signatures</h2>
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Timestamp</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {approvals.map((approval, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-slate-900">{approval.role}</td>
                        <td className="px-4 py-3 text-slate-700">{approval.name}</td>
                        <td className="px-4 py-3 text-slate-600">{approval.timestamp}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <User className="w-3 h-3" />
                            {approval.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Summary Snapshot */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Audit Summary</h2>
              <div className="bg-white border border-slate-300 rounded-lg divide-y divide-slate-200">
                {auditSummary.map((event, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-900 mb-1">
                        {event.event}
                      </div>
                      {event.section && (
                        <div className="text-xs text-slate-700 mb-1">{event.section}</div>
                      )}
                      <div className="text-xs text-slate-600">
                        {event.user} · {event.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Read-only Protocol Preview */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Protocol Document</h2>
              <div className="bg-white border border-slate-300 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        Clinical Investigation Protocol v{projectData.version}
                      </div>
                      <div className="text-xs text-slate-600">
                        8 sections · Last modified Feb 8, 2026
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors">
                    Download PDF
                  </button>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>• 4.1 Protocol Overview</div>
                  <div>• 4.2 Study Rationale & Background</div>
                  <div>• 4.3 Device Description</div>
                  <div>• 4.4 Study Objectives</div>
                  <div>• 4.5 Study Endpoints</div>
                  <div>• 4.6 Study Design</div>
                  <div>• 4.7 Study Population</div>
                  <div>• 4.8 Data Handling & Confidentiality</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button
                onClick={onRequestAmendment}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors bg-amber-600 text-white hover:bg-amber-700"
              >
                Request Amendment
              </button>
              <button
                onClick={onGoToSubmission}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Submission Preparation
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}