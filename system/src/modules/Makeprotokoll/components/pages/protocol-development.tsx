import React, { useState } from 'react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { ProtocolDevelopmentPage } from '../protocol-development-page';
import { RightPanel } from '../right-panel';
import { ProtocolState, UserRole, ProjectData, WorkflowStep } from '../App';

interface ProtocolDevelopmentProps {
  protocolState: ProtocolState;
  currentUserRole: UserRole;
  projectData: ProjectData;
  onSubmitForReview: () => void;
  onApproveAndLock: () => void;
}

export function ProtocolDevelopment({
  protocolState,
  currentUserRole,
  projectData,
  onSubmitForReview,
  onApproveAndLock
}: ProtocolDevelopmentProps) {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  return (
    <>
      <GlobalHeader
        projectName={projectData.projectName}
        protocolId={projectData.protocolId}
        version={projectData.version}
        protocolState={protocolState}
        currentUserRole={currentUserRole}
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="protocol-development"
          onNavigate={() => {}}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto p-8">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                Gate 2: Protocol Development
              </h1>
              <p className="text-sm text-slate-600">
                Clinical Investigation Protocol — {projectData.deviceName}
              </p>
            </div>

            {/* Protocol Sections */}
            <ProtocolDevelopmentPage
              protocolState={protocolState}
              currentUserRole={currentUserRole}
              projectData={projectData}
              onSubmitForReview={onSubmitForReview}
              onApproveAndLock={onApproveAndLock}
            />

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button
                onClick={onSubmitForReview}
                disabled={!allSectionsComplete}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
              >
                Submit Protocol for Review
              </button>
              <button
                onClick={onApproveAndLock}
                disabled={hasBlockers || !allSectionsComplete || currentUserRole === 'Medical Writer'}
                title={currentUserRole === 'Medical Writer' ? 'Only Project Manager or Regulatory Affairs can approve and lock' : undefined}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-700 text-white hover:bg-slate-800"
              >
                Approve & Lock Protocol
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