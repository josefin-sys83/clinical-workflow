import { useState } from 'react';
import { useNavigate } from 'react-router';
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
} from '../data/mockReportData';

export default function ReviewPage() {
  const navigate = useNavigate();
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
          const auditEntry = {
            id: `audit-${Date.now()}`,
            domain: 'Approval' as const,
            timestamp: new Date(),
            action: `Accepted ${finding.severity === 'blocker' ? 'blocker' : 'warning'} risk`,
            userBy: 'Dr. Sarah Chen',
            userEmail: 'sarah.chen@medtech.com',
            details: finding.description,
          };
          setAuditEntries((prev) => [auditEntry, ...prev]);
          
          return updatedFinding;
        }
        return finding;
      })
    );
  };

  const handleApproveReport = () => {
    navigate('/approved');
  };

  const handleRequestChanges = () => {
    alert('Changes requested. This action would be logged in the audit trail.');
  };

  // Check if report can be approved
  const hasUnacceptedBlockers = findings.some((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const canApprove = !hasUnacceptedBlockers;

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