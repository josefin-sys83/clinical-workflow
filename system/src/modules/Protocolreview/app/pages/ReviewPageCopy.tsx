import { isOpenIssue } from '@/shared/protocol/issues';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReviewHeader } from '../components/ReviewHeader';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import type { ReportSection, RegulatoryFinding, ReviewerComment, AIFinding } from '../types/review';
import { advanceWorkflowStep, WorkflowStepBlockedError } from '@/shared/services/workflowService';
import { buildWorkflowPath } from '@/shared/workflow/steps';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { apiErrorMessage, apiFetch } from '@/shared/api/http';

/** Derive a section status from approval state + open issues */
function deriveSectionStatus(section: any): ReportSection['status'] {
  if (section.approvalStatus === 'approved') return 'approved';
  const openIssues: any[] = (section.issues || []).filter(
    isOpenIssue,
  );
  if (openIssues.some((i) => i.severity === 'blocker')) return 'blocked';
  if (openIssues.some((i) => i.severity === 'warning')) return 'warning';
  // No open issues — treat as approved for review-mode display
  return 'approved';
}

export default function ReviewPageCopy() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { protocolFinalized, latestAmendment } = useProtocolStatus(projectId);

  // Backend URL: swap the Vite dev port for the API port (same pattern as Makeprotokoll)
  const apiBase = '';

  // ── Real project data ─────────────────────────────────────────────────────
  const [projectData, setProjectData] = useState<any>(null);
  const [protocol, setProtocol] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string>('');
  const [findings, setFindings] = useState<RegulatoryFinding[]>([]);
  const [aiFindings, setAIFindings] = useState<AIFinding[]>([]);

  // ── Fetch project data on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`${apiBase}/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) => {
        if (p.data) {
          setProjectData({
            ...(p.data.projectData || {}),
            projectName: p.name,
            deviceCategory: p.deviceCategory,
            targetMarkets: p.targetMarkets || [],
          });
          setRoles(p.roles || []);
          if (p.data.protocol) setProtocol(p.data.protocol);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Helper: look up a section owner from roles ────────────────────────────
  const sectionOwner = useMemo(() => {
    const lead = roles.find((r: any) => r.title === 'Protocol Lead')?.assignedTo?.[0]?.name;
    const pi = roles.find((r: any) => r.title === 'Principal Investigator')?.assignedTo?.[0]?.name;
    return lead || pi || undefined;
  }, [roles]);

  // ── Map protocol sections → ReportSection[] ───────────────────────────────
  const sections = useMemo((): ReportSection[] => {
    if (!protocol?.sections?.length) return [];
    return protocol.sections.map((s: any) => ({
      id: s.id,
      title: s.title || '',
      status: deriveSectionStatus(s),
      content: s.content || '',
      reviewStatus: s.reviewStatus as ReportSection['reviewStatus'] | undefined,
    }));
  }, [protocol]);

  // ── Activate first section once data arrives ──────────────────────────────
  useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  // ── Derive RegulatoryFinding[] + AIFinding[] from section issues ──────────
  useEffect(() => {
    if (!protocol?.sections) return;

    const derivedFindings: RegulatoryFinding[] = [];
    const derivedAI: AIFinding[] = [];

    protocol.sections.forEach((section: any) => {
      const openIssues = (section.issues || []).filter(
        isOpenIssue,
      );
      const acceptances: any[] = section.riskAcceptances || [];

      openIssues.forEach((issue: any) => {
        const description = (issue.description || '').trim();
        // Saved decisions are matched to findings by description, because findings
        // are recreated each time a section is analysed.
        const acceptance = acceptances.find((a) => a.description === description);
        derivedFindings.push({
          id: issue.id,
          sectionId: section.id,
          severity: issue.severity,
          source: 'system',
          requirementSource: issue.source,
          requirementId: issue.requirementId,
          reference: issue.reference,
          targetSection: issue.targetSection,
          remediation: issue.remediation,
          textHighlight: issue.textQuote,
          description,
          location: issue.subsection || section.title || '',
          sectionOwner,
          acceptedRisk: Boolean(acceptance),
          acceptanceId: acceptance?.id,
          acceptanceReason: acceptance?.reason,
          acceptedBy: acceptance?.acceptedBy,
          acceptedAt: acceptance ? new Date(acceptance.acceptedAt) : undefined,
        });

        const raisedByLower = (issue.raisedBy || '').toLowerCase();
        const isAIRaised =
          raisedByLower.includes('system') ||
          raisedByLower.includes('ai') ||
          raisedByLower.includes('validation') ||
          raisedByLower.includes('consistency');

        if (isAIRaised) {
          derivedAI.push({
            id: `ai-${issue.id}`,
            sectionId: section.id,
            type: raisedByLower.includes('consistency') ? 'inconsistency' : 'missing',
            description: issue.description || '',
            dismissed: false,
          });
        }
      });
    });

    setFindings(derivedFindings);
    setAIFindings(derivedAI);
  }, [protocol, sectionOwner]);

  // ── Derive ReviewerComment[] from section comments ────────────────────────
  const reviewerComments = useMemo((): ReviewerComment[] => {
    if (!protocol?.sections) return [];
    const comments: ReviewerComment[] = [];
    protocol.sections.forEach((section: any) => {
      (section.comments || []).forEach((comment: any) => {
        comments.push({
          id: comment.id,
          sectionId: section.id,
          author: comment.author || 'Unknown',
          role: comment.authorRole || 'Reviewer',
          timestamp: comment.timestamp ? new Date(comment.timestamp) : new Date(),
          content: comment.content || '',
          status: comment.status || 'open',
          replies: (comment.replies || []).map((reply: any) => ({
            id: reply.id,
            sectionId: section.id,
            author: reply.author || 'Unknown',
            role: reply.authorRole || 'Reviewer',
            timestamp: reply.timestamp ? new Date(reply.timestamp) : new Date(),
            content: reply.content || '',
            status: reply.status || 'open',
          })),
        });
      });
    });
    return comments;
  }, [protocol]);

  // ── Add Comment / Reply ───────────────────────────────────────────────────
  // Comments have their own endpoint: the server records the signed-in user as
  // author and writes the audit entry. Only this section's comments are replaced
  // here, so nothing else on the page is written back.
  const updateSection = (sectionId: string, changes: Record<string, unknown>) =>
    setProtocol((prev: any) => !prev ? prev : ({
      ...prev,
      sections: prev.sections.map((s: any) => (s.id === sectionId ? { ...s, ...changes } : s)),
    }));

  const postComment = async (
    sectionId: string,
    body: { content: string; type?: string; parentCommentKey?: string },
  ) => {
    if (!projectId) return;
    try {
      const comments = await apiFetch<any[]>(`/projects/${projectId}/protocol/sections/${sectionId}/comments`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      updateSection(sectionId, { comments });
    } catch (error) {
      window.alert(apiErrorMessage(error, 'The comment could not be saved. Please try again.'));
      throw error;
    }
  };

  const handleAddComment = async (content: string, type: 'general' | 'issue' | 'approval-request') => {
    await postComment(activeSection, { content, type });
  };

  const handleAddReply = async (commentId: string, replyText: string) => {
    const sectionId = protocol?.sections?.find((s: any) =>
      (s.comments || []).some((c: any) => c.id === commentId))?.id;
    if (!sectionId) return;
    await postComment(sectionId, { content: replyText, parentCommentKey: commentId });
  };

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFindingClick = (sectionId: string) => handleSectionClick(sectionId);

  const handleDismissAIFinding = (findingId: string) => {
    setAIFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, dismissed: true } : f)),
    );
  };

  // Risk decisions are saved with a reason and audited, so they survive leaving the
  // page and re-analysis of the section.
  const handleAcceptRisk = async (findingId: string, reason: string) => {
    const finding = findings.find((f) => f.id === findingId);
    if (!finding || !projectId) return;
    try {
      const riskAcceptances = await apiFetch<any[]>(
        `/projects/${projectId}/protocol/sections/${finding.sectionId}/risk-acceptances`,
        { method: 'POST', body: JSON.stringify({ description: finding.description, reason }) },
      );
      updateSection(finding.sectionId, { riskAcceptances });
    } catch (error) {
      window.alert(apiErrorMessage(error, 'The risk could not be accepted. Please try again.'));
      throw error;
    }
  };

  const handleRevokeRisk = async (findingId: string) => {
    const finding = findings.find((f) => f.id === findingId);
    if (!finding?.acceptanceId || !projectId) return;
    try {
      const riskAcceptances = await apiFetch<any[]>(
        `/projects/${projectId}/protocol/sections/${finding.sectionId}/risk-acceptances/${finding.acceptanceId}`,
        { method: 'DELETE' },
      );
      updateSection(finding.sectionId, { riskAcceptances });
    } catch (error) {
      window.alert(apiErrorMessage(error, 'The risk acceptance could not be withdrawn. Please try again.'));
    }
  };

  const handleApproveReport = async (reason: string) => {
    if (!projectId) return;

    // Only navigate once the transition actually succeeded — silently proceeding on
    // failure previously masked every role-mismatch/state error as a false success.
    try {
      await advanceWorkflowStep({
        projectId,
        stepId: 'protocol-review',
        to: 'approved',
        note: reason,
      });
    } catch (e) {
      if (e instanceof WorkflowStepBlockedError) {
        window.alert(e.message);
      } else {
        console.error('Approve failed', e);
        window.alert('Something went wrong while approving. Please try again.');
      }
      return;
    }

    navigate(`/projects/${projectId}/workflow/protocol/pdf`);
  };

  const handleRequestChanges = async (reason: string) => {
    if (!projectId) return;

    // Only navigate once the transition actually succeeded (see handleApproveReport).
    try {
      await advanceWorkflowStep({
        projectId,
        stepId: 'protocol-review',
        to: 'blocked',
        note: reason,
      });
    } catch (e) {
      if (e instanceof WorkflowStepBlockedError) {
        window.alert(e.message);
      } else {
        console.error('Request changes failed', e);
        window.alert('Something went wrong while requesting changes. Please try again.');
      }
      return;
    }

    navigate(`/projects/${projectId}/workflow/protocol/make`);
  };

  // ── Derived approval state ────────────────────────────────────────────────
  const hasUnacceptedBlockers = findings.some((f) => f.severity === 'blocker' && !f.acceptedRisk);
  const canApprove = !hasUnacceptedBlockers;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-500 text-sm">Loading protocol…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-neutral-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <MilestoneBanner projectId={projectId!} currentStepId="protocol-review" />
        {protocolFinalized && (
          <div className="mx-6 mt-4">
            <ProtocolFinalizedBanner
              projectId={projectId!}
              latestAmendment={latestAmendment}
            />
          </div>
        )}
        <ReviewHeader activeStep="Protocol review" />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportContent
              sections={sections}
              onSectionVisible={setActiveSection}
              findings={findings}
              projectName={projectData?.projectName}
              deviceName={projectData?.deviceName}
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
            comments={reviewerComments}
            aiFindings={aiFindings}
            onFindingClick={handleFindingClick}
            onDismissAIFinding={handleDismissAIFinding}
            onAcceptRisk={protocolFinalized ? undefined : handleAcceptRisk}
            onRevokeRisk={protocolFinalized ? undefined : handleRevokeRisk}
            onAddComment={protocolFinalized ? undefined : handleAddComment}
            onAddReply={protocolFinalized ? undefined : handleAddReply}
            activeSectionTitle={sections.find((s) => s.id === activeSection)?.title}
          />
        </div>
      </div>

    </div>
  );
}
