import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ReviewHeader } from '../components/ReviewHeader';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import { AuditTrailModal } from '@/shared/components/AuditTrailModal';
import {
  reportSections,
  regulatoryFindings,
  reviewerComments,
  aiFindings as initialAIFindings,
} from '../data/mockReportData';

export default function ReviewPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(reportSections[0].id);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [aiFindings, setAIFindings] = useState(initialAIFindings);
  const [findings, setFindings] = useState(regulatoryFindings);

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
    alert('Changes requested.');
  };

  // Check if report can be approved
  const hasUnacceptedBlockers = findings.some((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const canApprove = !hasUnacceptedBlockers;

  return (
    <div className="h-screen flex bg-neutral-50">
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

      <AuditTrailModal open={showAuditTrail} onOpenChange={setShowAuditTrail} />    </div>
  );
}
