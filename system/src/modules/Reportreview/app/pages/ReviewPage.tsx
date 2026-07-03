import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReviewHeader } from '../components/ReviewHeader';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import { AuditTrailModal } from '../components/AuditTrailModal';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { createProjectAuditEvent } from '@/shared/services/auditService';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { protocolFinalized, latestAmendment } = useProtocolStatus(projectId);
  const apiBase = '';

  const [sections, setSections] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiFindings, setAIFindings] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [requestChangesComment, setRequestChangesComment] = useState('');
  const [requestChangesSubmitting, setRequestChangesSubmitting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);

  const [activeSection, setActiveSection] = useState<string>('');
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // ── Fetch real project data and report sections ────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(apiBase + '/api/projects/' + projectId).then(r => r.json()),
      fetch(apiBase + '/api/projects/' + projectId + '/report-sections').then(r => r.json()).catch(() => null),
    ]).then(([p, sectionMeta]) => {
      setRoles(p.data?.roles || []);
      setReportData(p.data);

      const savedSections = p.data?.report?.sections || {};
      const titleMap: Record<string, string> = {};
      (sectionMeta?.sections || []).forEach((s: any) => { titleMap[s.id] = s.title; });

      const allComments = Object.entries(savedSections).flatMap(([id, data]: [string, any]) =>
        (data.comments || []).map((c: any) => ({ ...c, sectionId: id }))
      );
      setComments(allComments);

      const sectionList = Object.entries(savedSections).map(([id, data]: [string, any]) => ({
        id,
        title: titleMap[id] || id,
        // ReportContent/SectionOverview only distinguish 'approved' from everything else
        status: (data.state === 'approved' || data.state === 'locked') ? 'approved' : 'warning',
        content: data.content || '',
        issues: data.issues || [],
      })).filter((s: any) => s.content);

      setSections(sectionList);
      if (sectionList.length > 0) setActiveSection(sectionList[0].id);

      // RegulatoryFinding shape expected by FindingsPanel/ReportContent
      const regulatoryFindings = sectionList.flatMap((s: any) =>
        (s.issues || []).map((issue: any) => ({
          id: issue.id || Math.random().toString(),
          sectionId: s.id,
          severity: issue.severity === 'blocker' ? 'blocker' : 'warning',
          description: issue.description || issue.message || '',
          location: issue.title || issue.message || s.title,
        }))
      );
      setFindings(regulatoryFindings);

      // AIFinding shape (currently unused in FindingsPanel's render, kept for prop-shape correctness)
      const aiFindingsList = sectionList.flatMap((s: any) =>
        (s.issues || []).map((issue: any) => ({
          id: issue.id || Math.random().toString(),
          sectionId: s.id,
          type: 'inconsistency' as const,
          description: issue.description || issue.message || '',
          dismissed: false,
        }))
      );
      setAIFindings(aiFindingsList);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [projectId]);

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

          return updatedFinding;
        }
        return finding;
      })
    );
  };

  const handleApproveReport = async () => {
    if (!projectId) return;
    setApproving(true);
    try {
      await createProjectAuditEvent({
        projectId,
        domain: 'report',
        stepId: 'report-review',
        type: 'lifecycle_transition',
        summary: 'Report approved for PDF finalization',
      });
      await transitionWorkflow({ projectId, stepId: 'report-review', to: 'approved' });
      navigate(`/projects/${projectId}/workflow/report/pdf`);
    } catch (e) {
      console.error('Approve failed', e);
    } finally {
      setApproving(false);
    }
  };

  const handleRequestChanges = () => {
    setShowRequestChangesDialog(true);
  };

  const handleSubmitRequestChanges = async () => {
    if (!requestChangesComment.trim() || !projectId) return;
    setRequestChangesSubmitting(true);
    try {
      await createProjectAuditEvent({
        projectId,
        domain: 'report',
        stepId: 'report-review',
        type: 'changes_requested',
        summary: `Request Changes: ${requestChangesComment.trim()}`,
      });
      await transitionWorkflow({ projectId, stepId: 'report-review', to: 'draft' });
      navigate(`/projects/${projectId}/workflow/report/make`);
    } catch (e) {
      console.error('Request changes failed', e);
    } finally {
      setRequestChangesSubmitting(false);
      setShowRequestChangesDialog(false);
      setRequestChangesComment('');
    }
  };

  const handleAddComment = async (content: string, type: 'general' | 'issue' | 'approval-request') => {
    if (!projectId || !activeSection || !content.trim()) return;
    const comment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: 'Reviewer',
      authorRole: 'Medical Writer',
      content,
      type,
      timestamp: new Date().toISOString(),
      replies: [],
    };

    setReportData((prev: any) => {
      const updated = { ...prev };
      const sections = { ...(updated.report?.sections || {}) };
      const section = { ...(sections[activeSection] || {}) };
      section.comments = [...(section.comments || []), comment];
      sections[activeSection] = section;
      updated.report = { ...(updated.report || {}), sections };

      // Persist to backend (fire and forget)
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      }).catch(() => {});

      return updated;
    });

    // Update comments state for immediate UI update
    setComments(prev => [...prev, {
      id: comment.id,
      sectionId: activeSection,
      author: comment.author,
      authorRole: comment.authorRole,
      content: comment.content,
      type: comment.type,
      timestamp: comment.timestamp,
      replies: [],
    }]);
  };

  const handleAddReply = async (commentId: string, replyText: string) => {
    if (!projectId || !replyText.trim()) return;
    const reply = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: 'Reviewer',
      content: replyText,
      timestamp: new Date().toISOString(),
    };

    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, replies: [...(c.replies || []), reply] }
        : c
    ));
  };

  // Check if report can be approved
  const blockerCount = findings.filter((f: any) => f.severity === 'blocker' && !f.acceptedRisk).length;
  const canApprove = blockerCount === 0 && sections.length > 0 && !approving;

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-neutral-50 text-neutral-500">Loading...</div>;
  }

  return (
    <div className="h-screen flex bg-neutral-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <MilestoneBanner projectId={projectId!} currentStepId="report-review" />
        {protocolFinalized && (
          <div className="mx-6 mt-4">
            <ProtocolFinalizedBanner
              projectId={projectId!}
              latestAmendment={latestAmendment}
            />
          </div>
        )}
        <ReviewHeader
          onViewAuditTrail={() => setShowAuditTrail(true)}
          projectRoles={roles}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportContent
              sections={sections}
              onSectionVisible={setActiveSection}
              findings={findings}
            />

            <ReviewFooter
              onApproveReport={handleApproveReport}
              onRequestChanges={handleRequestChanges}
              canApprove={canApprove}
              hasBlockers={blockerCount > 0}
              totalFindings={findings.length}
              acceptedFindings={findings.filter((f: any) => f.acceptedRisk).length}
            />
          </div>

          <FindingsPanel
            findings={findings}
            comments={comments}
            aiFindings={aiFindings}
            onFindingClick={handleFindingClick}
            onDismissAIFinding={handleDismissAIFinding}
            onAcceptRisk={handleAcceptRisk}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            activeSectionTitle={sections.find((s: any) => s.id === activeSection)?.title}
          />
        </div>
      </div>

      <AuditTrailModal
        isOpen={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
        auditEntries={auditEntries}
      />

      {showRequestChangesDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Request Changes</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Describe what needs to be corrected. This will be logged in the audit trail and the report will be returned to authoring.
            </p>
            <textarea
              value={requestChangesComment}
              onChange={e => setRequestChangesComment(e.target.value)}
              placeholder="Describe the required changes..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
            {!requestChangesComment.trim() && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>A comment is required before requesting changes.</p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setShowRequestChangesDialog(false); setRequestChangesComment(''); }} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmitRequestChanges}
                disabled={!requestChangesComment.trim() || requestChangesSubmitting}
                style={{ padding: '10px 20px', background: requestChangesComment.trim() && !requestChangesSubmitting ? '#dc2626' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: requestChangesComment.trim() && !requestChangesSubmitting ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500 }}
              >
                {requestChangesSubmitting ? 'Submitting...' : 'Request Changes & Return to Authoring'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
