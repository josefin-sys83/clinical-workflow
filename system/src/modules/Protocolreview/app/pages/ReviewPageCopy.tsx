import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReviewHeader } from '../components/ReviewHeader';
import { ReportContent } from '../components/ReportContent';
import { FindingsPanel } from '../components/FindingsPanel';
import { ReviewFooter } from '../components/ReviewFooter';
import type { ReportSection, RegulatoryFinding, ReviewerComment, AIFinding } from '../types/review';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { buildWorkflowPath } from '@/shared/workflow/steps';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';

/** Derive a section status from approval state + open issues */
function deriveSectionStatus(section: any): ReportSection['status'] {
  if (section.approvalStatus === 'approved') return 'approved';
  const openIssues: any[] = (section.issues || []).filter(
    (i: any) => i.status === 'open' || !i.status,
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
          if (p.data.projectData) setProjectData(p.data.projectData);
          if (p.data.roles) setRoles(p.data.roles);
          if (p.data.protocol) setProtocol(p.data.protocol);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Derive current user from project roles ────────────────────────────────
  const currentUser = useMemo(() => {
    const priority = ['Protocol Lead', 'Principal Investigator', 'Medical Writer', 'Regulatory Affairs'];
    for (const roleTitle of priority) {
      const role = roles.find((r: any) => r.title === roleTitle);
      const person = role?.assignedTo?.[0];
      if (person?.name) return person.name;
    }
    for (const role of roles) {
      const person = role?.assignedTo?.[0];
      if (person?.name) return person.name;
    }
    return 'Unknown';
  }, [roles]);

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
        (i: any) => i.status === 'open' || !i.status,
      );

      openIssues.forEach((issue: any) => {
        derivedFindings.push({
          id: issue.id,
          sectionId: section.id,
          severity: issue.severity === 'blocker' ? 'blocker' : 'warning',
          description: issue.description || '',
          location: issue.subsection || section.title || '',
          sectionOwner,
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

  // ── Add Comment ───────────────────────────────────────────────────────────
  const handleAddComment = async (content: string, type: 'general' | 'issue' | 'approval-request') => {
    if (!projectId) return;
    const now = new Date().toISOString();
    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: currentUser,
      authorRole: roles.find((r: any) => r.assignedTo?.some((a: any) => a.name === currentUser))?.title || 'Reviewer',
      timestamp: now,
      content,
      type,
      status: 'open' as const,
    };
    const sectionId = activeSection;
    const sectionTitle = sections.find((s) => s.id === sectionId)?.title || sectionId;

    // Optimistic update: append comment to the matching protocol section so
    // reviewerComments (derived from protocol) reflects it immediately.
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId ? { ...s, comments: [...(s.comments || []), newComment] } : s,
      );
      const updated = { ...prev, sections: updatedSections };
      // Persist to backend (fire-and-forget inside the state setter)
      fetch(`${apiBase}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      }).catch(() => {});
      return updated;
    });

    // Audit trail entry
    try {
      const commentTypeLabel =
        type === 'general' ? 'General Comment'
        : type === 'issue' ? 'Issue'
        : 'Approval Request';
      await fetch(`${apiBase}/api/projects/${projectId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'comment.added',
          message: `${commentTypeLabel} added to section: ${sectionTitle}`,
          stepId: 'protocol-review',
          actorUserId: currentUser,
          metadataJson: JSON.stringify({
            sectionId,
            sectionTitle,
            commentType: commentTypeLabel,
            commentText: content,
            author: currentUser,
          }),
        }),
      });
    } catch (e) {
      console.error('Audit trail entry failed', e);
    }
  };

  // ── Add Reply ─────────────────────────────────────────────────────────────
  const handleAddReply = async (commentId: string, replyText: string) => {
    if (!projectId) return;
    const now = new Date().toISOString();
    const reply = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: currentUser,
      authorRole: roles.find((r: any) => r.assignedTo?.some((a: any) => a.name === currentUser))?.title || 'Reviewer',
      timestamp: now,
      content: replyText,
      status: 'open' as const,
    };

    // Find the original comment content for the audit message
    let originalCommentContent = '';
    protocol?.sections?.forEach((s: any) => {
      const c = (s.comments || []).find((c: any) => c.id === commentId);
      if (c) originalCommentContent = c.content || '';
    });

    // Optimistic update: append reply into the matching comment's replies array
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) => ({
        ...s,
        comments: (s.comments || []).map((c: any) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies || []), reply] }
            : c,
        ),
      }));
      const updated = { ...prev, sections: updatedSections };
      // Persist to backend (fire-and-forget)
      fetch(`${apiBase}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      }).catch(() => {});
      return updated;
    });

    // Audit trail entry
    fetch(`${apiBase}/api/projects/${projectId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'comment.reply.added',
        message: `Reply added to comment in Protocol Review: ${replyText}`,
        stepId: 'protocol-review',
        actorUserId: currentUser,
        metadataJson: JSON.stringify({
          commentId,
          replyText,
          originalComment: originalCommentContent,
          author: currentUser,
          timestamp: now,
        }),
      }),
    }).catch(() => {});
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

  const handleAcceptRisk = (findingId: string) => {
    setFindings((prev) =>
      prev.map((finding) => {
        if (finding.id !== findingId) return finding;

        const updatedFinding = {
          ...finding,
          acceptedRisk: true,
          acceptedBy: currentUser,
          acceptedAt: new Date(),
        };

        // Audit log
        if (projectId) {
          fetch(`${apiBase}/api/projects/${projectId}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'risk.accepted',
              message: `${finding.severity === 'blocker' ? 'Blocker' : 'Warning'} risk accepted by ${currentUser}: ${finding.description}`,
              stepId: 'protocol-review',
              actorUserId: currentUser,
              metadataJson: JSON.stringify({ findingId: finding.id, severity: finding.severity, description: finding.description, sectionId: finding.sectionId }),
            }),
          }).catch(() => {});
        }

        return updatedFinding;
      }),
    );
  };

  const handleApproveReport = async (reason: string) => {
    if (!projectId) return;

    // Audit log (fire-and-forget)
    fetch(`${apiBase}/api/projects/${projectId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'protocol.approved',
        message: `Protocol approved: ${reason}`,
        stepId: 'protocol-review',
        actorUserId: currentUser,
        metadataJson: JSON.stringify({ reason, approvedBy: currentUser, approvedAt: new Date().toISOString() }),
      }),
    }).catch(() => {});

    // Transition workflow step — non-blocking; navigate regardless of outcome
    try {
      await transitionWorkflow({
        projectId,
        stepId: 'protocol-review',
        to: 'approved',
        note: reason,
      });
    } catch {
      // workflow transition failure is non-critical — proceed to navigate
    }

    navigate(`/projects/${projectId}/workflow/protocol/pdf`);
  };

  const handleRequestChanges = async (reason: string) => {
    if (!projectId) return;

    // Audit log (fire-and-forget)
    fetch(`${apiBase}/api/projects/${projectId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'changes.requested',
        message: `Changes requested: ${reason}`,
        stepId: 'protocol-review',
        actorUserId: currentUser,
        metadataJson: JSON.stringify({ reason, requestedBy: currentUser, requestedAt: new Date().toISOString() }),
      }),
    }).catch(() => {});

    // Transition workflow step — non-blocking; navigate regardless of outcome
    try {
      await transitionWorkflow({
        projectId,
        stepId: 'protocol-review',
        to: 'blocked',
        note: reason,
      });
    } catch {
      // workflow transition failure is non-critical — proceed to navigate
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
            onAcceptRisk={handleAcceptRisk}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            activeSectionTitle={sections.find((s) => s.id === activeSection)?.title}
          />
        </div>
      </div>

    </div>
  );
}
