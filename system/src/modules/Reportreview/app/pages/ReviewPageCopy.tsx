import { useState } from 'react';
import { ReviewHeader } from '../components/ReviewHeader';
import { SectionOverview } from '../components/SectionOverview';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import { AuditTrailModal } from '../components/AuditTrailModal';
import {
  reportSections,
  regulatoryFindings,
  reviewerComments,
  aiFindings as initialAIFindings,
  auditTrail,
  projectRoles,
} from '../data/mockReportData';
import { createProjectAuditEvent } from '@/shared/services/auditService';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { buildWorkflowPath } from '@/shared/workflow/steps';
import { useNavigate, useParams } from 'react-router-dom';

export default function ReviewPageCopy() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [activeSection, setActiveSection] = useState(reportSections[0].id);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [aiFindings, setAIFindings] = useState(initialAIFindings);
  const [findings, setFindings] = useState(regulatoryFindings);
  const [auditEntries, setAuditEntries] = useState(auditTrail);

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
            acceptedBy: 'Dr. Sarah Chen',
            acceptedAt: new Date(),
          };
          
          // Add audit trail entry
          const now = new Date();
          const auditEntry = {
            id: `audit-${Date.now()}`,
            domain: 'Review' as const,
            timestamp: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            action: `${finding.severity === 'blocker' ? 'Blocker' : 'Warning'} risk accepted for ${finding.location}`,
            userBy: 'Dr. Sarah Chen',
            userEmail: 'sarah.chen@medtech.com',
            details: finding.description,
          };
          setAuditEntries((prev) => [auditEntry, ...prev]);

          (async () => {
            if (!projectId) return;
            await createProjectAuditEvent({ projectId, domain: 'report', stepId: 'report-review', type: 'risk_accepted', summary: auditEntry.action, details: auditEntry.details });
          })();
          
          return updatedFinding;
        }
        return finding;
      })
    );
  };

  const handleApproveReport = async () => {
    // Add audit trail entry
    const now = new Date();
    const auditEntry = {
      id: `audit-${Date.now()}`,
      domain: 'Review' as const,
      timestamp: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      action: 'Report approved',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Clinical Investigation Report has been approved for regulatory submission',
    };
    setAuditEntries((prev) => [auditEntry, ...prev]);

    if (!projectId) return;
    await transitionWorkflow({ projectId, stepId: 'report-review', to: 'approved', note: 'Report approved in review UI' });
    await createProjectAuditEvent({ projectId, domain: 'report', stepId: 'report-review', type: 'note', summary: auditEntry.action, details: auditEntry.details });

    navigate(buildWorkflowPath(projectId, 'report-pdf'));
  };

  const handleRequestChanges = async () => {
    if (!projectId) return;
    await transitionWorkflow({ projectId, stepId: 'report-review', to: 'blocked', note: 'Changes requested during report review' });
    await createProjectAuditEvent({ projectId, domain: 'report', stepId: 'report-review', type: 'changes_requested', summary: 'Changes requested', details: 'Reviewer requested changes (blocked) from Report Review UI.' });
    alert('Changes requested. Logged to audit trail (mock API).');
  };

  // Check if report can be approved
  const hasUnacceptedBlockers = findings.some((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const hasUnacceptedWarnings = findings.some((f) => f.severity === 'warning' && !f.acceptedRisk);
  const allSectionsApproved = reportSections.every((s) => s.status === 'approved');
  const canApprove = allSectionsApproved && !hasUnacceptedBlockers && !hasUnacceptedWarnings;

  return (
    <div className="h-screen flex bg-neutral-50">
      <SectionOverview
        sections={reportSections}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ReviewHeader
          onViewAuditTrail={() => setShowAuditTrail(true)}
          projectRoles={projectRoles}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportContent
              sections={reportSections}
              onSectionVisible={setActiveSection}
              findings={findings}
            />

            <ReviewFooter
              onApproveReport={handleApproveReport}
              onRequestChanges={handleRequestChanges}
              canApprove={canApprove}
              hasBlockers={hasUnacceptedBlockers}
              totalFindings={findings.length}
              acceptedFindings={findings.filter(f => f.acceptedRisk).length}
            />
          </div>

          <FindingsPanel
            findings={findings}
            comments={reviewerComments}
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