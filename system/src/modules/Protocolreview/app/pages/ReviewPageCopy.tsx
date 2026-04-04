import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReviewHeader } from '../components/ReviewHeader';
import { SectionOverview } from '../components/SectionOverview';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import { AuditTrailModal } from '../components/AuditTrailModal';
import {
  protocolSections,
  protocolFindings,
  protocolComments,
  protocolAIFindings,
  protocolAuditTrail,
} from '../data/mockProtocolData';
import { createProjectAuditEvent } from '@/shared/services/auditService';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { buildWorkflowPath } from '@/shared/workflow/steps';

export default function ReviewPageCopy() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [activeSection, setActiveSection] = useState(protocolSections[0].id);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [aiFindings, setAIFindings] = useState(protocolAIFindings);
  const [findings, setFindings] = useState(protocolFindings);
  const [auditEntries, setAuditEntries] = useState(protocolAuditTrail);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFindingClick = (sectionId: string) => {
    handleSectionClick(sectionId);
  };

  const handleDismissAIFinding = (findingId: string) => {
    setAIFindings((prev) =>
      prev.map((finding) =>
        finding.id === findingId ? { ...finding, dismissed: true } : finding
      )
    );
  };

  const handleAcceptRisk = (findingId: string) => {
    setFindings((prev) =>
      prev.map((finding) => {
        if (finding.id === findingId) {
          const updatedFinding = {
            ...finding,
            acceptedRisk: true,
            acceptedBy: 'Dr. Emma Nilsson',
            acceptedAt: new Date(),
          };
          
          // Add audit trail entry
          const auditEntry = {
            id: `audit-${Date.now()}`,
            domain: 'Approval' as const,
            timestamp: new Date(),
            action: `Accepted ${finding.severity === 'blocker' ? 'blocker' : 'warning'} risk`,
            userBy: 'Dr. Emma Nilsson',
            userEmail: 'emma.nilsson@medtech.com',
            details: finding.description,
          };
          setAuditEntries((prev) => [auditEntry, ...prev]);

          // Persist to mock API (Step 5): audit is server-like, not just local UI.
          (async () => {
            if (!projectId) return;
            await createProjectAuditEvent({ projectId, domain: 'protocol', stepId: 'protocol-review', type: 'risk_accepted', summary: auditEntry.action, details: auditEntry.details });
          })();
          
          return updatedFinding;
        }
        return finding;
      })
    );
  };

  const handleApproveReport = async () => {
    if (!projectId) return;
    await transitionWorkflow({ projectId, stepId: 'protocol-review', to: 'approved', note: 'Protocol approved in review UI' });
    navigate(buildWorkflowPath(projectId, 'protocol-pdf'));
  };

  const handleRequestChanges = async () => {
    if (!projectId) return;
    await transitionWorkflow({ projectId, stepId: 'protocol-review', to: 'blocked', note: 'Changes requested during protocol review' });
    await createProjectAuditEvent({ projectId, domain: 'protocol', stepId: 'protocol-review', type: 'changes_requested', summary: 'Changes requested', details: 'Reviewer requested changes (blocked) from Protocol Review UI.' });
    alert('Changes requested. Logged to audit trail (mock API).');
  };

  // Check if protocol can be approved
  const hasUnacceptedBlockers = findings.some((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const canApprove = !hasUnacceptedBlockers;

  return (
    <div className="h-screen flex bg-neutral-50">
      <SectionOverview
        sections={protocolSections}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ReviewHeader
          onViewAuditTrail={() => setShowAuditTrail(true)}
          activeStep="Protocol review"
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportContent
              sections={protocolSections}
              onSectionVisible={setActiveSection}
              findings={findings}
            />

            <ReviewFooter
              onApprove={handleApproveReport}
              onRequestChanges={handleRequestChanges}
              canApprove={canApprove}
              hasBlockers={hasUnacceptedBlockers}
              isLoadingAction={false}
            />
          </div>

          <FindingsPanel
            findings={findings}
            comments={protocolComments}
            aiFindings={aiFindings}
            onFindingClick={handleFindingClick}
            onDismissAIFinding={handleDismissAIFinding}
            onAcceptRisk={handleAcceptRisk}
          />
        </div>
      </div>

      <AuditTrailModal
        isOpen={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
        auditEntries={auditEntries}
      />
    </div>
  );
}