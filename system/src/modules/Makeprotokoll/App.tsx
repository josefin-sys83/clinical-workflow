import React, { useState, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Info, AlertCircle, CheckCircle2, Clock, MessageSquare, History, ChevronRight, ChevronDown, User, FileText, Lock, Check, Circle, CheckCircle } from 'lucide-react';
import { useWorkflowSnapshot } from '@/shared/hooks/useWorkflowSnapshot';
import type { DocumentLifecycleState } from '@/shared/workflow/types';
import { advanceWorkflowStep } from '@/shared/services/workflowService';
import { ProtocolSection } from './components/protocol-section';
import { ProtocolAttachmentsSection } from './components/protocol-attachments-section';
import { ExportReadinessIndicator } from './components/export-readiness-indicator';
import { ReviewModeEntry } from './components/review-mode-entry';
import { ReviewModeIndicator } from './components/review-mode-indicator';
import { ReviewModeConfirmation } from './components/review-mode-confirmation';
import { IssueFilterControl } from './components/issue-filter-control';
import { WorkflowProgressIndicator } from './components/workflow-progress-indicator';
import { AmendmentModal } from './components/AmendmentModal';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { useCurrentUser } from '@/shared/auth/CurrentUserContext';
import {
  listProtocolAttachments,
  uploadProtocolAttachment,
  removeProtocolAttachment,
  type ProtocolAttachment,
} from '@/shared/api/documents';
import { apiErrorMessage, apiFetch } from '@/shared/api/http';



export default function App() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['1', '6']);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('1');
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewCycle, setReviewCycle] = useState<number>(0);
  const [showReviewConfirmation, setShowReviewConfirmation] = useState<boolean>(false);
  const [issueFilter, setIssueFilter] = useState<'my-issues' | 'all-issues'>('my-issues');
  const { user: sessionUser } = useCurrentUser();
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  const { projectId } = useParams();
  const location = useLocation();
  const { snapshot } = useWorkflowSnapshot({ projectId });
  const { protocolFinalized, latestAmendment: statusLatestAmendment } = useProtocolStatus(projectId);

  const [projectData, setProjectData] = React.useState<any>(null);
  const [roles, setRoles] = React.useState<any[]>([]);
  const [protocol, setProtocol] = React.useState<any>(null);
  const [generatingProtocol, setGeneratingProtocol] = React.useState(false);
  // Covers the brief window between clicking Retry and generatingProtocol flipping true
  // (the initial GET that decides whether to generate at all) — without it, Retry gave
  // no visible feedback for that gap and looked like the click hadn't registered.
  const [checkingProtocol, setCheckingProtocol] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState<{ completed: number; total: number; currentLabel: string | null } | null>(null);
  const [protocolError, setProtocolError] = React.useState<string | null>(null);
const [wontFixDescriptions, setWontFixDescriptions] = React.useState<Record<string, string[]>>({});
  const [sectionAnalysisFailed, setSectionAnalysisFailed] = React.useState<Record<string, boolean>>({});
  const [sectionAnalyzing, setSectionAnalyzing] = React.useState<Record<string, boolean>>({});
  const [rightPanelWontFixModal, setRightPanelWontFixModal] = React.useState<{ sectionId: string; issueId: string } | null>(null);
  const [rightPanelWontFixComment, setRightPanelWontFixComment] = React.useState('');
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendments, setAmendments] = React.useState<any[]>([]);
  const [amendmentSuccessMessage, setAmendmentSuccessMessage] = React.useState<string | null>(null);
  const [synopsisConsistencyIssues, setSynopsisConsistencyIssues] = React.useState<any[]>([]);
  const [protocolMakeDeadline, setProtocolMakeDeadline] = React.useState<{ date: string; status: string } | null>(null);
  const [protocolAttachments, setProtocolAttachments] = React.useState<ProtocolAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = React.useState(false);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
  const apiBase = '';

  const loadProtocolAttachments = React.useCallback(async () => {
    if (!projectId) return;
    try {
      setProtocolAttachments(await listProtocolAttachments(projectId));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(apiErrorMessage(error, 'Could not load protocol attachments.'));
    }
  }, [projectId]);

  const runSynopsisConsistencyCheck = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/check-synopsis-consistency', {
        method: 'POST',
      });
      const data = await res.json();
      setSynopsisConsistencyIssues(data.issues || []);
    } catch (e) {
      console.error('Synopsis consistency check failed', e);
    }
  };

  const fetchAmendments = React.useCallback(() => {
    if (!projectId) return;
    fetch(apiBase + '/api/projects/' + projectId + '/amendments')
      .then(r => r.json())
      .then(data => setAmendments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [apiBase, projectId]);


  const protocolLoadInFlightRef = useRef<string | null>(null);

  const loadOrGenerateProtocol = React.useCallback((generateIfMissing = !import.meta.env.DEV) => {
    if (!projectId) return;
    // Guards against duplicate concurrent generation runs (e.g. React StrictMode's
    // double-invoked effect in dev), which doubles AI request volume and can trip
    // Azure OpenAI rate limits hard enough to exhaust the callAI retry budget.
    if (protocolLoadInFlightRef.current === projectId) return;
    protocolLoadInFlightRef.current = projectId;
    const clearInFlight = () => {
      if (protocolLoadInFlightRef.current === projectId) protocolLoadInFlightRef.current = null;
    };
    setProtocolError(null);
    setCheckingProtocol(true);
    apiFetch<any>(`/projects/${projectId}`, { cache: 'no-store' })
      .then(p => {
        if (p.data && p.data.projectData) {
          setProjectData({
            ...p.data.projectData,
            targetMarkets: p.targetMarkets || [],
            deviceCategory: p.deviceCategory || '',
          });
        }
        setRoles(p.roles || p.data?.roles || []);
        if (p.data?.protocol?.sections?.length) {
          setProtocol(p.data.protocol);
          p.data.protocol.sections?.forEach((s: any) => {
            if (s.content && s.approvalStatus !== 'approved' && s.aiGenerated !== false)
              analyzeSectionWithAI(s.title, s.content, s.id);
          });
          if (p.data.protocol.sections.some((s: any) => s.aiGenerated !== false)) {
            runSynopsisConsistencyCheck();
          }
          setCheckingProtocol(false);
          clearInFlight();
        } else {
          setCheckingProtocol(false);
          // Page entry in development only checks whether a protocol exists. A user
          // click passes generateIfMissing=true and must reach the real AI endpoint.
          if (!generateIfMissing) {
            clearInFlight();
            return;
          }
          setGeneratingProtocol(true);
          apiFetch<any>(`/projects/${projectId}/generate-protocol`, { method: 'POST' })
            .then(result => {
              if (!result?.sections?.length) throw new Error('Protocol generation returned no sections');
              setProtocol(result);
              setExpandedSections(result.sections.map((section: any) => section.id));
              result.sections?.forEach((s: any) => {
                if (s.content) analyzeSectionWithAI(s.title, s.content, s.id);
              });
              runSynopsisConsistencyCheck();
            })
            .catch((err: any) => {
              console.error('Protocol generation failed', err);
              setProtocolError(apiErrorMessage(
                err,
                err instanceof Error ? err.message : 'Protocol generation failed. Please try again.',
              ));
            })
            .finally(() => {
              setGeneratingProtocol(false);
              clearInFlight();
            });
        }
      })
      .catch((err: any) => {
        console.error('Failed to load project', err);
        setProtocolError('Failed to load project data. Please refresh the page.');
        setCheckingProtocol(false);
        clearInFlight();
      });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polls real backend progress ("3 of 9 sections done") while a protocol generation
  // run is in flight, so the spinner shown below can say something more useful than a
  // static "please wait" for a call that can legitimately take a couple of minutes.
  React.useEffect(() => {
    if (!generatingProtocol || !projectId) {
      setGenerationProgress(null);
      return;
    }
    let cancelled = false;
    const poll = () => {
      fetch(apiBase + '/api/projects/' + projectId + '/generate-protocol/progress')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled || !data) return;
          setGenerationProgress(data.active ? { completed: data.completed, total: data.total, currentLabel: data.currentLabel } : null);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [generatingProtocol, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!projectId) return;
    loadOrGenerateProtocol();
    loadProtocolAttachments();
    fetchAmendments();
    fetch(apiBase + '/api/projects/' + projectId + '/milestones')
      .then(r => r.json())
      .then((data: any) => {
        const m = data?.milestones?.find((m: any) => m.stepId === 'protocol-make');
        if (m?.deadline) setProtocolMakeDeadline({ date: m.deadline, status: m.status });
      })
      .catch(() => {});
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps


  // Current user context
  const analyzeSectionWithAI = async (sectionTitle: string, sectionContent: string, sectionId: string, prevOpenCount: number = 0): Promise<number> => {
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/analyze-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle, sectionId, sectionContent, requiredElements: protocol?.sections?.find((s: any) => s.id === sectionId)?.requiredElements || [] })
      });
      const result = await res.json();

      // A failed AI call/parse is an explicit error state, not an empty success.
      // Never merge it into issues/requiredElements — that would silently mask
      // the failure as "AI confirmed nothing/everything is missing."
      if (!res.ok || result?.error) {
        console.error('Section analysis failed', result?.message || res.statusText);
        setSectionAnalysisFailed(prev => ({ ...prev, [sectionId]: true }));
        return 0;
      }
      setSectionAnalysisFailed(prev => ({ ...prev, [sectionId]: Boolean(result.aiUnavailable) }));

      let issuesArr: any[] = result.issues || (Array.isArray(result) ? result : []);
      const elements = result.requiredElements || [];
      // Filter out won't-fix descriptions for this section
      const suppressed = wontFixDescriptions[sectionId] || [];
      if (suppressed.length > 0) {
        issuesArr = issuesArr.filter((iss: any) => !suppressed.includes(iss.description));
      }
      const newOpenCount = issuesArr.filter((iss: any) => iss.status === 'open' || !iss.status).length;
      const resolvedCount = Math.max(0, prevOpenCount - newOpenCount);
      // Always update protocol state (even if issuesArr is empty)
      await new Promise<void>((resolve) => {
        setProtocol((prev: any) => {
          const updatedSections = prev.sections.map((s: any) =>
            s.id === sectionId ? { ...s, issues: issuesArr, requiredElements: elements.length > 0 ? elements : s.requiredElements } : s
          );
          const updated = { ...prev, sections: updatedSections };
          fetch(apiBase + '/api/projects/' + projectId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { protocol: updated } })
          });
          resolve();
          return updated;
        });
      });
      return resolvedCount;
    } catch (e) {
      console.error('Section analysis failed', e);
      setSectionAnalysisFailed(prev => ({ ...prev, [sectionId]: true }));
      return 0;
    }
  };

  const handleSectionSaved = async (sectionId: string, newContent: string, prevContent: string, reason: string) => {
    const currentSection = protocol?.sections?.find((s: any) => s.id === sectionId);
    const prevOpenCount = (currentSection?.issues || []).filter((i: any) => i.status === 'open' || !i.status).length;

    // 1. Persist to backend — this also creates the audit trail entry with full
    //    user identity, before/after content, and reason for change.
    try {
      await fetch(apiBase + '/api/projects/' + projectId + '/protocol/sections/' + sectionId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          previousContent: prevContent,
          reason,
          userId: currentUser,
          userName: currentUser,
          // Explicitly carry approval fields so saving content never clears them
          approvalStatus: currentSection?.approvalStatus,
          approvedBy: currentSection?.approvedBy,
          approvedAt: currentSection?.approvedAt,
        }),
      });
    } catch (e) {
      console.error('Section save failed', e);
    }

    // 2. Update local state to reflect the saved content immediately
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId ? { ...s, content: newContent, updatedAt: new Date().toISOString() } : s
      );
      return { ...prev, sections: updatedSections };
    });

    // Development bypass sections remain fully editable without invoking the
    // unavailable AI provider. They can be analysed manually after AI is configured.
    if (currentSection?.aiGenerated === false) return;

    // 3. Re-analyse and surface any resolved issues
    const sectionTitle = currentSection?.title || '';
    const resolvedCount = await analyzeSectionWithAI(sectionTitle, newContent, sectionId, prevOpenCount);
    // resolved issues are reflected in the issues panel automatically
  };

  const canForceProtocolDraft = import.meta.env.DEV || sessionUser?.roles.includes('admin') === true;

  const handleForceProtocolDraft = async () => {
    if (!projectId) return;
    setCheckingProtocol(true);
    setProtocolError(null);
    try {
      const draft = await apiFetch<any>(`/projects/${projectId}/workflow/force-protocol-draft`, {
        method: 'POST',
      });
      setProtocol(draft);
      setExpandedSections(draft.sections?.map((section: any) => section.id) || ['1']);
    } catch (error) {
      setProtocolError(apiErrorMessage(error, 'Could not create the protocol development draft.'));
    } finally {
      setCheckingProtocol(false);
    }
  };

  const handleAddComment = async (sectionId: string, content: string, type: string) => {
    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: currentUser,
      authorRole: roles.find((r: any) => r.assignedTo?.some((a: any) => a.name === currentUser))?.title || 'Team Member',
      timestamp: new Date().toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      content,
      type: type as 'general' | 'issue' | 'approval-request',
      status: 'open' as const,
    };
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId ? { ...s, comments: [...(s.comments || []), newComment] } : s
      );
      const updated = { ...prev, sections: updatedSections };
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      });
      return updated;
    });
  };

  const handleResolveComment = async (sectionId: string, commentId: string) => {
    const now = new Date().toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId
          ? {
              ...s,
              comments: (s.comments || []).map((c: any) =>
                c.id === commentId
                  ? { ...c, status: 'resolved', resolvedBy: currentUser, resolvedDate: now }
                  : c
              ),
            }
          : s
      );
      const updated = { ...prev, sections: updatedSections };
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      });
      return updated;
    });
  };

  const handleApproveSection = async (sectionId: string, comment: string) => {
    const now = new Date().toISOString();
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId
          ? { ...s, approvalStatus: 'approved', approvedBy: currentUser, approvedAt: now }
          : s
      );
      const updated = { ...prev, sections: updatedSections };
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      });
      return updated;
    });
  };

  const handleUnlockSection = async (sectionId: string, reason: string) => {
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId
          ? { ...s, approvalStatus: 'draft', approvedBy: undefined, approvedAt: undefined }
          : s
      );
      const updated = { ...prev, sections: updatedSections };
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } }),
      });
      return updated;
    });
  };

  const handleWontFix = async (sectionId: string, issueId: string, comment: string) => {
    const currentSection = protocol?.sections?.find((s: any) => s.id === sectionId);
    const issue = (currentSection?.issues || []).find((i: any) => i.id === issueId);
    if (!issue) return;
    const issueDescription = issue.description;
    // Store won't-fix description
    setWontFixDescriptions((prev) => {
      const existing = prev[sectionId] || [];
      return { ...prev, [sectionId]: [...existing, issueDescription] };
    });
    // Remove issue from protocol state
    setProtocol((prev: any) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s: any) =>
        s.id === sectionId ? { ...s, issues: (s.issues || []).filter((i: any) => i.id !== issueId) } : s
      );
      const updated = { ...prev, sections: updatedSections };
      // Persist to backend
      fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { protocol: updated } })
      });
      return updated;
    });
  };

  const handleCreateAmendment = async (data: { title: string; reason: string; description: string; affectedProtocolSections: string[] }) => {
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/amendments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, createdBy: currentUser }),
      });
      const newAmendment = await res.json();
      setShowAmendmentModal(false);
      fetchAmendments();
      setAmendmentSuccessMessage(`Amendment ${newAmendment.number}: ${newAmendment.title} created. Report authoring is blocked until it's resolved.`);
      setTimeout(() => setAmendmentSuccessMessage(null), 6000);
    } catch (e) {
      console.error('Amendment creation failed', e);
    }
  };

  const handleAmendmentApproval = async (amendmentId: string, action: 'approve-protocol-lead' | 'approve-vp' | 'reject') => {
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/amendments/' + amendmentId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, by: currentUser }),
      });
      const updatedAmendment = await res.json();
      fetchAmendments();

      // If amendment is now fully approved, re-analyze affected protocol sections
      if (updatedAmendment.status === 'approved') {
        // Re-fetch and apply the freshly-approved protocol BEFORE analyzing any
        // section. analyzeSectionWithAI persists via setProtocol(prev => ...) and
        // PATCHes the whole `protocol` object back — if `prev` were the stale
        // pre-approval state instead, each per-section PATCH below would silently
        // overwrite the backend's just-set amended/needs-review flags.
        const freshProject = await fetch(apiBase + '/api/projects/' + projectId).then(r => r.json()).catch(() => null);
        const freshProtocol = freshProject?.data?.protocol;
        if (freshProtocol) setProtocol(freshProtocol);

        const affectedSectionIds: string[] = updatedAmendment.affectedProtocolSections || [];
        const sectionsToAnalyze = (freshProtocol?.sections || protocol?.sections || []).filter((s: any) =>
          affectedSectionIds.includes(s.id)
        );

        for (const section of sectionsToAnalyze) {
          if (section.content) {
            await analyzeSectionWithAI(section.title, section.content, section.id);
          }
        }

        // Trigger report re-analysis via custom event
        window.dispatchEvent(new CustomEvent('report:refresh-analysis'));

        setAmendmentSuccessMessage(`Amendment approved. AI re-analysis triggered on ${sectionsToAnalyze.length} affected protocol section(s). Report re-analysis also triggered.`);
        setTimeout(() => setAmendmentSuccessMessage(null), 8000);
      }
    } catch (e) {
      console.error('Amendment approval failed', e);
    }
  };

  // Derive current user from project roles (fallback until Microsoft SSO is integrated).
  // Priority: Protocol Lead → Principal Investigator → Medical Writer → Regulatory Affairs → first available.
  const currentUser = React.useMemo(() => {
    const priority = ['Protocol Lead', 'Principal Investigator', 'Medical Writer', 'Regulatory Affairs'];
    for (const roleTitle of priority) {
      const role = roles.find((r: any) => r.title === roleTitle);
      const person = role?.assignedTo?.[0];
      if (person?.name) return `${person.name} (${roleTitle})`;
    }
    // Fall back to the first person in any role
    for (const role of roles) {
      const person = role?.assignedTo?.[0];
      if (person?.name) return `${person.name} (${role.title})`;
    }
    return 'Unknown';
  }, [roles]);

  // Bare name for matching against owner/raisedBy fields, which store only the
  // person's name. Prefer the real logged-in session over the role-derived
  // guess above — otherwise "my issues" always matches whoever the project
  // happens to list as Protocol Lead/Medical Writer/etc., regardless of who
  // is actually signed in.
  const currentUserName = React.useMemo(
    () => sessionUser?.name || currentUser.replace(/\s*\([^)]*\)$/, ''),
    [sessionUser, currentUser]
  );

  const canManageProtocolAttachments = React.useMemo(() => {
    if (!sessionUser) return false;
    const allowedRoles = new Set(['Protocol Lead', 'Regulatory Affairs']);
    const sessionEmail = sessionUser.email?.trim().toLowerCase();
    return roles.some((role: any) =>
      allowedRoles.has(role.title) &&
      (role.assignedTo || []).some((person: any) => {
        const personEmail = person.email?.trim().toLowerCase();
        return sessionEmail && personEmail
          ? sessionEmail === personEmail
          : person.name === sessionUser.name;
      }),
    );
  }, [roles, sessionUser]);

  const handleProtocolAttachmentUpload = async (file: File, description: string): Promise<boolean> => {
    if (!projectId) return false;
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('File is too large. Protocol attachments must be 10 MB or smaller.');
      return false;
    }
    setAttachmentBusy(true);
    setAttachmentError(null);
    try {
      const attachments = await uploadProtocolAttachment({ projectId, file, description });
      setProtocolAttachments(attachments);
      return true;
    } catch (error) {
      setAttachmentError(apiErrorMessage(error, 'Could not upload this protocol attachment.'));
      return false;
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleProtocolAttachmentRemove = async (attachment: ProtocolAttachment) => {
    if (!projectId) return;
    if (!window.confirm(`Remove Appendix ${attachment.appendixNumber}: ${attachment.filename}?`)) return;
    setAttachmentBusy(true);
    setAttachmentError(null);
    try {
      setProtocolAttachments(await removeProtocolAttachment({
        projectId,
        attachmentId: attachment.id,
      }));
    } catch (error) {
      setAttachmentError(apiErrorMessage(error, 'Could not remove this protocol attachment.'));
    } finally {
      setAttachmentBusy(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateToSection = (sectionId: string, subsection?: string) => {
    // Set as active section
    setActiveSection(sectionId);
    
    // Expand the section if collapsed
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }

    // Wait for DOM update, then scroll and highlight
    setTimeout(() => {
      const sectionElement = sectionRefs.current[sectionId];
      if (sectionElement) {
        // Scroll to section
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight the section
        setHighlightedSection(sectionId);
        
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedSection(null), 3000);
      }
    }, 100);
  };

  const protocolSections = protocol?.sections?.map((s: any, idx: number) => ({
    id: s.id || String(idx + 1),
    number: s.id || String(idx + 1),
    title: s.title || '',
    status: s.status || 'draft',
    owner: roles.find((r: any) => r.title === 'Principal Investigator')?.assignedTo?.[0]?.name || '',
    updated: s.updatedAt || '',
    comments: s.comments || [],
    aiGenerated: s.aiGenerated !== false,
    reviewStatus: null,
    locked: false,
    reviewCycle: 0,
    reviewer: roles.find((r: any) => r.title === 'Medical Writer')?.assignedTo?.[0]?.name || '',
    approver: roles.find((r: any) => r.title === 'Clinical Affairs VP')?.assignedTo?.[0]?.name || '',
    approverRole: 'VP Clinical Affairs',
    ownerRole: 'Principal Investigator',
    issues: s.issues || [],
    requiredElements: s.requiredElements || [],
    content: s.content || '',
    approvalStatus: s.approvalStatus || 'draft',
    approvedBy: s.approvedBy || '',
    approvedAt: s.approvedAt || '',
  })) || [];

  // Helper function to get section status visualization
  const getSectionStatusIcon = (section: typeof protocolSections[0]) => {
    // Check if locked first
    if (section.locked) {
      return <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
    }

    // Check if complete - blue ring with checkmark
    if (section.status === 'complete') {
      return (
        <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0 bg-blue-500">
          <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      );
    }

    // Default: draft - yellow ring (empty)
    return (
      <div className="w-4 h-4 rounded-full border-2 border-yellow-500 flex-shrink-0" />
    );
  };

  // Review Mode handlers
  const handleEnterReview = () => {
    setShowReviewConfirmation(true);
  };

  const handleConfirmReview = async () => {
    const nextCycle = reviewCycle + 1;
    setIsReviewMode(true);
    setReviewCycle(nextCycle);
    setShowReviewConfirmation(false);

    // Transition protocol-make → approved so the sidebar unlocks Protocol Review.
    // Non-blocking: navigate even if the transition fails.
    advanceWorkflowStep({
      projectId: projectId!,
      stepId: 'protocol-make',
      to: 'approved',
      note: `Protocol review cycle ${nextCycle} started by ${currentUser}`,
    });

  };

  const handleExitReview = async () => {
    setIsReviewMode(false);
  };

  // Calculate review readiness metrics
  const totalBlockers = protocolSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'blocker' && i.status === 'open').length || 0), 0
  );
  const totalWarnings = protocolSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'warning' && i.status === 'open').length || 0), 0
  );
  const allOpenIssuesCount = totalBlockers + totalWarnings;
  const allSectionsComplete = protocolSections.length > 0 && protocolSections.every(s =>
    s.approvalStatus === 'approved' || s.status === 'approved'
  );
  const incompleteSections = protocolSections
    .filter(s => s.approvalStatus !== 'approved' && s.status !== 'approved')
    .map(s => s.number);
  const allSectionsApproved = protocolSections.length > 0 && protocolSections.every(s => s.approvalStatus === 'approved');
  const approvedCount = protocolSections.filter(s => s.approvalStatus === 'approved').length;

  // Issue filtering logic
  const getMyIssuesSections = () => {
    // Sections where current user is owner OR has assigned issues
    return protocolSections.filter(section => {
      // User is section owner
      if (section.owner === currentUserName) return true;

      // User has issues assigned in this section
      const hasAssignedIssue = section.issues?.some(issue =>
        issue.raisedBy?.includes(currentUserName) ||
        section.owner === currentUserName
      );

      return hasAssignedIssue;
    });
  };

  const getFilteredSections = () => {
    if (issueFilter === 'all-issues') {
      return protocolSections;
    }
    return getMyIssuesSections();
  };

  const filteredSections = getFilteredSections();

  // "My issues" count must always reflect the current user's subset,
  // regardless of which tab (issueFilter) is currently active.
  const myIssuesSections = getMyIssuesSections();
  const myIssuesBlockers = myIssuesSections.reduce((count, section) =>
    count + (section.issues?.filter(i => i.severity === 'blocker' && i.status === 'open').length || 0), 0
  );
  const myIssuesWarnings = myIssuesSections.reduce((count, section) =>
    count + (section.issues?.filter(i => i.severity === 'warning' && i.status === 'open').length || 0), 0
  );
  const myIssuesCount = myIssuesBlockers + myIssuesWarnings;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <MilestoneBanner projectId={projectId!} currentStepId="protocol-make" />
      {/* Review Mode Indicator */}
      <ReviewModeIndicator 
        isReviewMode={isReviewMode}
        reviewCycle={reviewCycle}
        onExitReview={handleExitReview}
        openIssuesCount={allOpenIssuesCount}
        blockerCount={totalBlockers}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Protocol Structure */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
          <div className="pt-6 px-5 pb-5">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">PROTOCOL SECTIONS</h3>
          </div>
          
          <div className="px-5 pb-4 flex-1 space-y-1">
            {protocolSections.map((section) => {
              const isActive = activeSection === section.id;
              const isComplete = section.status === 'complete';
              return (
                <div
                  key={section.id}
                  onClick={() => navigateToSection(section.id)}
                  className={`py-2 px-3 cursor-pointer flex items-center gap-3 rounded transition-colors ${
                    isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-orange-400" />
                  )}
                  <div className={`text-sm ${
                    isActive ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'
                  }`}>
                    {section.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {protocolFinalized && (
            <div className="mx-6 mt-4">
              <ProtocolFinalizedBanner
                projectId={projectId!}
                latestAmendment={statusLatestAmendment}
              />
            </div>
          )}
          {/* Workflow Progress Indicator */}
          <WorkflowProgressIndicator
            currentStep="protocol-authoring"
          />

          <div className="flex-1 flex overflow-hidden">
            {/* Center Workspace */}
            <div className="flex-1 overflow-y-scroll p-6 protocol-workspace-scroll" style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#64748b #e2e8f0'
            }} ref={mainContentRef}>
              <style>{`
                .protocol-workspace-scroll::-webkit-scrollbar {
                  width: 16px;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-track {
                  background: #e2e8f0;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-thumb {
                  background: #14b8a6;
                  border-radius: 0px;
                  border: 3px solid #e2e8f0;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-thumb:hover {
                  background: #0d9488;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button {
                  background: #e2e8f0;
                  height: 16px;
                  display: block;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:vertical:decrement {
                  background: #cbd5e1 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23475569" d="M8 5l-4 4h8z"/></svg>') center no-repeat;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:vertical:increment {
                  background: #cbd5e1 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23475569" d="M8 11l4-4H4z"/></svg>') center no-repeat;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:hover {
                  background-color: #94a3b8;
                }
              `}</style>
              <div className="max-w-4xl">
                {/* Project ID Header */}
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Clinical Investigation Protocol</div>
                  {projectId && <div className="text-lg font-semibold text-slate-900">{projectId}</div>}
                  <div className="text-sm text-slate-600 mt-1">{projectData ? (projectData.projectName + " | " + projectData.deviceName) : ""}</div>
                </div>

                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h2 className="text-lg font-semibold text-slate-900">Protocol Sections</h2>
                    {snapshot?.steps?.['protocol-pdf']?.state === 'final' && (
                      <button
                        onClick={() => setShowAmendmentModal(true)}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded transition-colors flex-shrink-0"
                      >
                        Initiate Amendment
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">Review, edit, and approve each section according to your role and responsibilities</p>

                  {amendmentSuccessMessage && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      {amendmentSuccessMessage}
                    </div>
                  )}

                  {protocolError && (
                    <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{protocolError}</span>
                      </div>
                      <button
                        onClick={() => loadOrGenerateProtocol(true)}
                        disabled={generatingProtocol || checkingProtocol}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-xs rounded flex-shrink-0 flex items-center gap-1.5"
                      >
                        {(generatingProtocol || checkingProtocol) && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                        {generatingProtocol || checkingProtocol ? 'Retrying…' : 'Retry'}
                      </button>
                    </div>
                  )}

                  {/* AI Disclaimer */}
                  <div className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
                    <div className="flex items-start gap-2">
                      <div className="w-3.5 h-3.5 bg-purple-600 text-white rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                        AI
                      </div>
                      <span className="text-xs text-purple-800">
                        AI continuously analyzes this protocol for completeness, consistency, and regulatory alignment.
                        All decisions and final responsibility remain with assigned human roles.
                      </span>
                    </div>
                  </div>
                </div>

                <ProtocolAttachmentsSection
                  attachments={protocolAttachments}
                  canManage={canManageProtocolAttachments}
                  busy={attachmentBusy}
                  error={attachmentError}
                  onUpload={handleProtocolAttachmentUpload}
                  onRemove={handleProtocolAttachmentRemove}
                />

                {generatingProtocol ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                    <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    {generationProgress && generationProgress.total > 0 ? (
                      <>
                        <p className="text-sm">
                          Generating section {Math.min(generationProgress.completed + 1, generationProgress.total)} of {generationProgress.total}
                          {generationProgress.currentLabel ? `: ${generationProgress.currentLabel}` : '...'}
                        </p>
                        <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${Math.round((generationProgress.completed / generationProgress.total) * 100)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">Generating protocol sections with AI...</p>
                    )}
                    <p className="text-xs text-slate-400">This can take up to 2–3 minutes for a full protocol. Please don't close this page — it hasn't frozen.</p>
                  </div>
                ) : protocolSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                    <FileText className="w-8 h-8 text-slate-300" />
                    <p className="text-sm">
                      {protocolError ? 'No protocol sections available.' : 'No protocol sections yet.'}
                    </p>
                    <button
                      onClick={() => loadOrGenerateProtocol(true)}
                      disabled={checkingProtocol}
                      className="mt-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-xs rounded transition-colors flex items-center gap-1.5"
                    >
                      {checkingProtocol && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      {checkingProtocol ? 'Checking…' : 'Generate Protocol'}
                    </button>
                    {canForceProtocolDraft && (
                      <button
                        onClick={handleForceProtocolDraft}
                        disabled={checkingProtocol || generatingProtocol}
                        className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                      >
                        Create Test Draft (No AI)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {protocolSections.map((section) => (
                      <ProtocolSection
                        key={section.id}
                        section={section}
                        targetMarkets={projectData?.targetMarkets || []}
                        deviceCategory={projectData?.deviceCategory || ''}
                        isExpanded={expandedSections.includes(section.id)}
                        onToggle={() => toggleSection(section.id)}
                        onNavigate={() => navigateToSection(section.id)}
                        ref={el => sectionRefs.current[section.id] = el}
                        isHighlighted={highlightedSection === section.id}
                        isReviewMode={isReviewMode}
                        onSaved={(newContent, prevContent, reason) => handleSectionSaved(section.id, newContent, prevContent, reason)}
                        onWontFix={(issueId, comment) => handleWontFix(section.id, issueId, comment)}
                        onAddComment={(content, type) => handleAddComment(section.id, content, type)}
                        onResolveComment={(commentId) => handleResolveComment(section.id, commentId)}
                        onApprove={(comment) => handleApproveSection(section.id, comment)}
                        onUnlock={(reason) => handleUnlockSection(section.id, reason)}
                        deadline={protocolMakeDeadline}
                        analysisFailed={!!sectionAnalysisFailed[section.id]}
                        analysisRetrying={!!sectionAnalyzing[section.id]}
                        onRetryAnalysis={() => {
                          setSectionAnalyzing(prev => ({ ...prev, [section.id]: true }));
                          analyzeSectionWithAI(section.title, section.content, section.id)
                            .finally(() => setSectionAnalyzing(prev => ({ ...prev, [section.id]: false })));
                        }}
                        attachments={protocolAttachments}
                      />
                    ))}
                  </div>
                )}

                {protocolSections.length > 0 && approvedCount > 0 ? (
                  <div className="mt-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-slate-500">{approvedCount} of {protocolSections.length} sections approved</span>
                  </div>
                ) : null}
              </div>

              {/* Review Mode Entry - shown after sections on gray background when not in review mode */}
              {!isReviewMode && (
                <div className="mt-8 max-w-4xl">
                  <ReviewModeEntry
                    onEnterReview={handleEnterReview}
                    hasBlockers={totalBlockers > 0}
                    blockerCount={totalBlockers}
                    allSectionsComplete={allSectionsComplete}
                    allSectionsApproved={allSectionsApproved}
                    userRole="Project Lead"
                    amendmentLink={amendments.some(a => a.status === 'approved') ? `/projects/${projectId}/workflow/protocol/amendment` : undefined}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Issues & Consistency */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
              {/* Protocol Amendments */}
              {amendments.length > 0 && (
                <div className="px-4 pt-4 pb-3 border-b border-slate-200 max-h-48 overflow-y-auto flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Protocol Amendments</h3>
                  </div>
                  {amendments.map((amendment: any) => {
                    // Same pill style as the section "Status Badges" in protocol-section.tsx —
                    // amber (needs action) matches ProtocolFinalizedBanner's 'approved' state;
                    // blue (terminal/complete) matches the section list's own "Approved" badge.
                    const statusBadges: Record<string, { label: string; className: string }> = {
                      draft:     { label: 'Draft',     className: 'bg-slate-100 text-slate-700 border border-slate-200' },
                      approved:  { label: 'Approved',  className: 'bg-amber-100 text-amber-700 border border-amber-200 font-medium' },
                      rejected:  { label: 'Rejected',  className: 'bg-rose-100 text-rose-700 border border-rose-200 font-medium' },
                      finalized: { label: 'Finalized', className: 'bg-blue-100 text-blue-700 border border-blue-200 font-medium' },
                    };
                    const statusBadge = statusBadges[amendment.status] || { label: amendment.status, className: 'bg-slate-100 text-slate-700 border border-slate-200' };
                    const protocolLeadApproved = !!amendment.approvals?.protocolLead?.approved;
                    const vpApproved = !!amendment.approvals?.clinicalAffairsVP?.approved;
                    const isDraft = amendment.status === 'draft';
                    return (
                      <div key={amendment.id} className="mb-3 last:mb-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-slate-800 leading-tight">
                                Amendment {amendment.number}: {amendment.title}
                              </p>
                              <span className={`px-2 py-0.5 text-xs rounded whitespace-nowrap flex-shrink-0 ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-tight line-clamp-2">{amendment.reason}</p>
                            {amendment.description && (
                              <p className="text-xs text-slate-600 mt-1 leading-tight line-clamp-2">{amendment.description}</p>
                            )}
                            {amendment.affectedProtocolSections?.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1">Affects: {amendment.affectedProtocolSections.join(', ')}</p>
                            )}
                            {isDraft && (
                              <div className="flex gap-2 mt-1.5 flex-wrap">
                                {!protocolLeadApproved && !vpApproved && (
                                  <button onClick={() => handleAmendmentApproval(amendment.id, 'approve-protocol-lead')} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAmendmentApproval(amendment.id, 'reject')}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {generatingProtocol || protocolSections.length === 0 ? (
                // Every check below is computed with .every()/.some() over protocolSections,
                // which is vacuously "all passed" on an empty array — showing "No issues
                // found" / "7/7 checks passed" while there's no content yet to check is
                // actively misleading, not just unhelpful. Show a neutral placeholder instead.
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="text-sm text-slate-500">Nothing to check yet</p>
                  <p className="text-xs text-slate-400 mt-1">Issues and export readiness will appear here once the protocol has been generated.</p>
                </div>
              ) : (
                <>
              {/* Fixed Header */}
              <div className="p-4 border-b border-slate-200 flex-shrink-0 sticky top-0 bg-white z-10">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Issues & Consistency</h3>
                <p className="text-xs text-slate-500 mb-3">System-detected inconsistencies and review flags</p>
                
                {/* Issue Filter Control */}
                <IssueFilterControl
                  filter={issueFilter}
                  onFilterChange={setIssueFilter}
                  myIssuesCount={myIssuesCount}
                  allIssuesCount={allOpenIssuesCount}
                />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-3">
                  {synopsisConsistencyIssues.length > 0 && (issueFilter === 'all-issues' || issueFilter === 'my-issues') && synopsisConsistencyIssues.map((issue: any, i: number) => (
                    <div key={'synopsis-' + i} className="p-3 border-b border-slate-100 hover:bg-slate-50">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${issue.severity === 'blocker' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${issue.severity === 'blocker' ? 'bg-rose-50 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                              {issue.severity === 'blocker' ? 'Blocker' : 'Warning'}
                            </span>
                            <span className="text-xs text-slate-500">Synopsis consistency</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{issue.description}</p>
                          <p className="text-xs text-slate-400 mt-1">Affected: Synopsis ↔ Protocol</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSections.map((section) => {
                    const openIssues = (section.issues || []).filter((issue: any) => issue.status === 'open');
                    if (openIssues.length === 0) return null;

                    return openIssues.map((issue: any) => {
                      const isBlocker = issue.severity === 'blocker';
                      const bgColor = isBlocker ? 'bg-rose-50' : 'bg-amber-50';
                      const borderColor = isBlocker ? 'border-rose-200' : 'border-amber-200';
                      const hoverColor = isBlocker ? 'hover:bg-rose-50' : 'hover:bg-amber-100';
                      const badgeBgColor = isBlocker ? 'bg-rose-50' : 'bg-amber-100';
                      const badgeTextColor = isBlocker ? 'text-rose-700' : 'text-amber-700';
                      const linkColor = isBlocker ? 'text-rose-700' : 'text-amber-700';
                      const linkHoverColor = isBlocker ? 'hover:text-rose-800' : 'hover:text-amber-900';

                      return (
                        <div
                          key={issue.id}
                          onClick={() => navigateToSection(section.id)}
                          className={`p-3 rounded border ${bgColor} ${borderColor} cursor-pointer ${hoverColor} transition-colors`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${badgeBgColor} ${badgeTextColor}`}>
                                  {isBlocker ? 'Blocker' : 'Warning'}
                                </span>
                                {issue.raisedBy?.toLowerCase().includes('system') && (
                                  <span className="text-xs text-slate-500">AI Regulatory Review</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-900 mb-1">{issue.subsection || 'Issue'}</div>
                              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                                {issue.description}
                              </p>

                              <div className={`pt-2 border-t ${borderColor} space-y-1.5`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Affected section</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigateToSection(section.id); }}
                                    className={`text-xs ${linkColor} ${linkHoverColor} hover:underline`}
                                  >
                                    {section.number}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Section owner</span>
                                  <span className="text-xs text-slate-700">{section.owner}</span>
                                </div>
                                {issue.dueDate && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Due in</span>
                                    <span className="text-xs text-slate-700 font-medium">{issue.dueDate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div
                              onClick={(e) => { e.stopPropagation(); navigateToSection(section.id); }}
                              className={`text-xs ${linkColor} ${linkHoverColor} flex items-center gap-1 font-medium cursor-pointer`}
                            >
                              <span>Navigate to Section {section.number}</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRightPanelWontFixModal({ sectionId: section.id, issueId: issue.id }); setRightPanelWontFixComment(''); }}
                              className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-2"
                            >
                              Won't fix
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })}

                  {filteredSections.every(s => (s.issues || []).filter((i: any) => i.status === 'open').length === 0) && (
                    <div className="p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-700 mb-1">No issues found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {issueFilter === 'my-issues' 
                          ? 'You have no open issues assigned to your sections.'
                          : 'All issues have been resolved.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200">
                <ExportReadinessIndicator
                  checks={[
                    {
                      category: 'All sections complete',
                      passed: protocolSections.every((s: any) => s.approvalStatus === 'approved'),
                      message: protocolSections.every((s: any) => s.approvalStatus === 'approved')
                        ? 'All sections approved'
                        : `${protocolSections.filter((s: any) => s.approvalStatus === 'approved').length} of ${protocolSections.length} sections approved`,
                      details: protocolSections.every(s => s.approvalStatus === 'approved')
                        ? undefined
                        : protocolSections.filter((s: any) => s.approvalStatus !== 'approved').map((s: any) => s.title).join(', '),
                    },
                    {
                      category: 'No open blockers',
                      passed: totalBlockers === 0,
                      message: totalBlockers === 0 ? 'No blockers found' : `${totalBlockers} blocker${totalBlockers > 1 ? 's' : ''} must be resolved`,
                    },
                    {
                      category: 'Required elements covered',
                      passed: protocolSections.every((s: any) => (s.requiredElements || []).every((e: any) => e.status === 'complete')),
                      message: protocolSections.every((s: any) => (s.requiredElements || []).every((e: any) => e.status === 'complete'))
                        ? 'All ISO 14155 elements present'
                        : 'Some required elements incomplete or missing',
                    },
                    {
                      category: 'Cross-section consistency',
                      passed: synopsisConsistencyIssues.length === 0,
                      message: synopsisConsistencyIssues.length === 0
                        ? 'No consistency issues detected'
                        : `${synopsisConsistencyIssues.length} consistency issue${synopsisConsistencyIssues.length > 1 ? 's' : ''} detected`,
                      details: synopsisConsistencyIssues.length > 0 ? synopsisConsistencyIssues.map((i: any) => `${i.section}: ${i.description}`).join(' · ') : undefined,
                    },
                    {
                      category: 'Regulatory compliance',
                      passed: true,
                      message: 'EU MDR requirements met',
                    },
                    {
                      category: 'Audit trail complete',
                      passed: true,
                      message: 'All changes logged and traceable',
                    },
                    {
                      category: 'No pending amendments',
                      passed: !amendments.some((a: any) => a.status === 'draft'),
                      message: amendments.some((a: any) => a.status === 'draft')
                        ? `Amendment #${amendments.find((a: any) => a.status === 'draft')?.number} pending approval — resolve before export`
                        : 'No pending amendments',
                    },
                  ]}
                />
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Mode Confirmation Modal */}
      <ReviewModeConfirmation
        isOpen={showReviewConfirmation}
        onClose={() => setShowReviewConfirmation(false)}
        onConfirm={handleConfirmReview}
        blockerCount={totalBlockers}
        warningCount={totalWarnings}
        incompleteSections={incompleteSections}
      />

      {/* Amendment Modal */}
      <AmendmentModal
        open={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        onSubmit={handleCreateAmendment}
        protocolSections={protocolSections.map((s: any) => ({ id: s.id, title: s.title }))}
        createdBy={currentUser}
      />

      {/* Right Panel Won't Fix Modal */}
      {rightPanelWontFixModal && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div style={{backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
            <h2 style={{margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a'}}>Mark as Won't Fix</h2>
            <p style={{margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b'}}>
              Provide a reason for suppressing this issue. This will be saved in the audit trail.
            </p>
            <textarea
              autoFocus
              value={rightPanelWontFixComment}
              onChange={(e) => setRightPanelWontFixComment(e.target.value)}
              placeholder="e.g. Risk accepted per sponsor decision, documented in risk management file"
              style={{width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => { setRightPanelWontFixModal(null); setRightPanelWontFixComment(''); }}
                style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
              >
                Cancel
              </button>
              <button
                disabled={!rightPanelWontFixComment.trim()}
                onClick={async () => {
                  if (rightPanelWontFixModal) {
                    await handleWontFix(rightPanelWontFixModal.sectionId, rightPanelWontFixModal.issueId, rightPanelWontFixComment.trim());
                  }
                  setRightPanelWontFixModal(null);
                  setRightPanelWontFixComment('');
                }}
                style={{padding: '0.5rem 1rem', backgroundColor: rightPanelWontFixComment.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: rightPanelWontFixComment.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500}}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
