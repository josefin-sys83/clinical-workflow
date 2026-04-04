import React, { useState } from 'react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { RightPanel } from '../right-panel';
import { ProjectData } from '../App';
import { AlertTriangle } from 'lucide-react';

interface ReviewProps {
  onRequestChanges: () => void;
  onApprove: () => void;
  projectData: ProjectData;
}

interface Finding {
  id: string;
  severity: 'Blocker' | 'High' | 'Info';
  section: string;
  description: string;
  suggestedAction: string;
}

export function Review({ onRequestChanges, onApprove, projectData }: ReviewProps) {
  const [reviewRound] = useState(1);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const findings: Finding[] = [
    {
      id: 'f1',
      severity: 'High',
      section: '4.5 Study Endpoints',
      description: 'Primary endpoint timing conflicts with synopsis (30 days vs. 6 months)',
      suggestedAction: 'Align with synopsis: change to 6 months follow-up'
    },
    {
      id: 'f2',
      severity: 'Blocker',
      section: '4.8 Data Handling',
      description: 'GDPR retention period not specified',
      suggestedAction: 'Add specific retention period per EU MDR (minimum 15 years post-study completion)'
    },
    {
      id: 'f3',
      severity: 'Info',
      section: '4.6 Study Design',
      description: 'Sample size justification could be more detailed',
      suggestedAction: 'Reference statistical power calculation or feasibility rationale'
    }
  ];

  const sectionApprovals = [
    { section: '4.1 Protocol Overview', owner: 'Dr. Emma Weber', status: 'Approved', findings: 0 },
    { section: '4.2 Study Rationale', owner: 'Dr. Emma Weber', status: 'Approved', findings: 0 },
    { section: '4.3 Device Description', owner: 'Lisa Schmidt', status: 'Approved', findings: 0 },
    { section: '4.4 Study Objectives', owner: 'Dr. Emma Weber', status: 'Approved', findings: 0 },
    { section: '4.5 Study Endpoints', owner: 'Dr. Emma Weber', status: 'Needs Changes', findings: 1 },
    { section: '4.6 Study Design', owner: 'Dr. Emma Weber', status: 'Info Only', findings: 1 },
    { section: '4.7 Study Population', owner: 'Dr. Emma Weber', status: 'Approved', findings: 0 },
    { section: '4.8 Data Handling', owner: 'Thomas Müller', status: 'Blocked', findings: 1 }
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Blocker':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Info':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-blue-700 bg-blue-50';
      case 'Needs Changes':
        return 'text-amber-700 bg-amber-50';
      case 'Blocked':
        return 'text-red-700 bg-red-50';
      case 'Info Only':
        return 'text-blue-700 bg-blue-50';
      default:
        return 'text-slate-700 bg-slate-50';
    }
  };

  const hasBlockers = findings.some(f => f.severity === 'Blocker');

  return (
    <>
      <GlobalHeader
        projectName={projectData.projectName}
        protocolId={projectData.protocolId}
        version={projectData.version}
        protocolState="In Review"
        currentUserRole="Medical Writer"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="review"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-semibold text-slate-900">
                  Review Round {reviewRound}
                </h1>
                <div className="px-3 py-1.5 bg-blue-50 border border-blue-300 rounded text-xs font-medium text-blue-700">
                  {findings.length} findings
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Review protocol for conflicts, missing information, and regulatory compliance
              </p>
            </div>

            {/* Blocker Warning */}
            {hasBlockers && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-900 mb-1">
                      Blocker Issues Detected
                    </div>
                    <div className="text-xs text-red-800">
                      Protocol cannot be approved until all blocker issues are resolved.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Findings by Severity */}
            <div className="mb-8 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Review Findings</h2>
              
              {findings.map((finding) => (
                <div key={finding.id} className="bg-white border border-slate-300 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-1 border rounded text-xs font-medium ${getSeverityBadge(finding.severity)}`}>
                        {finding.severity}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {finding.section}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 mb-3">
                    {finding.description}
                  </div>
                  <div className="text-xs text-slate-600 italic mb-3">
                    Suggested: {finding.suggestedAction}
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
                      Align with Synopsis
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors">
                      Go to Section
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors">
                      Add Comment
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Section Approval Status */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Section Review Status</h2>
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Section</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Owner</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Findings</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sectionApprovals.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{item.section}</td>
                        <td className="px-4 py-3 text-slate-700">{item.owner}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.findings}</td>
                        <td className="px-4 py-3">
                          {item.status !== 'Approved' && (
                            <button className="text-blue-600 hover:text-blue-700 font-medium">
                              Review →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button
                onClick={onRequestChanges}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors bg-amber-600 text-white hover:bg-amber-700"
              >
                Request Changes
              </button>
              <button
                onClick={onApprove}
                disabled={hasBlockers}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
              >
                Approve Review Round
              </button>
            </div>
          </div>
        </main>

        <RightPanel 
          isCollapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />
      </div>
    </>
  );
}