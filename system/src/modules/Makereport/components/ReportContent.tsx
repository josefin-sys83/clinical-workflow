import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function highlightPlaceholders(html: string): string {
  return html.replace(
    /\[(RESULT|TABLE|DATE|CONFIRM):([^\]]+)\]/g,
    '<mark style="background:#fed7aa;color:#9a3412;border-radius:3px;padding:1px 4px;font-size:0.85em;font-weight:500;">[<strong>$1</strong>:$2]</mark>'
  );
}

function stripCodeFences(content: string): string {
  return content.replace(/^```html\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
}

function renderContent(content: string): string {
  if (!content) return '';
  const cleaned = stripCodeFences(content);
  if (/<[a-z][\s\S]*>/i.test(cleaned)) return highlightPlaceholders(cleaned);
  // Legacy markdown fallback
  let h = cleaned
    .replace(/(\|[^\n]+\|\n?)+/g, (block) => {
      const lines = block.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length < 3) return block;
      const cols = (line: string) =>
        line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
      const headers = cols(lines[0]);
      const rows = lines.slice(2).map(cols);
      const hRow = `<tr>${headers.map(c => `<th style="border:1px solid #d1d5db;padding:5px 10px;background:#f8fafc;font-weight:600;text-align:left">${c}</th>`).join('')}</tr>`;
      const dRows = rows.map((r, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">${r.map(c => `<td style="border:1px solid #d1d5db;padding:5px 10px;">${c}</td>`).join('')}</tr>`
      ).join('');
      return `<table style="border-collapse:collapse;width:100%;margin:0.75rem 0;">${hRow}${dRows}</table>`;
    })
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:0.5rem 0;border-radius:4px;" />')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:600;margin:0.625rem 0 0.375rem;color:#0f172a;">$1</h2>')
    .replace(/^# (.+)$/gm,  '<h1 style="font-size:1.25rem;font-weight:700;margin:0.75rem 0 0.5rem;color:#0f172a;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/gs, '<em>$1</em>');
  h = h.split('\n').map(line =>
    /^<(h[12]|table|tr|th|td|img|strong|em|u)/.test(line) ? line : line + '<br />'
  ).join('\n');
  return highlightPlaceholders(h);
}
import { ReportSection, DataAsset, User, ReportCompletenessStatus } from '../types';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { AlertCircle, Table2, BarChart3, FileSpreadsheet, ChevronDown, UserIcon, MessageSquare, Check, X, Plus, Info, CheckCircle, Bold, Italic, Underline, Heading1, Heading2, Type, Image, Paperclip, Sparkles } from 'lucide-react';
import { SectionCompletenessStatus } from './SectionCompletenessStatus';
import { SectionGuidancePanel } from './SectionGuidancePanel';
import { AssetSelectorModal } from './AssetSelectorModal';
import { CommentsPanel } from './CommentsPanel';
import { SectionApprovalsModal } from './SectionApprovalsModal';
import { AppendicesSection } from './AppendicesSection';
import { EnterReviewModeModal } from './EnterReviewModeModal';
import aiDraftBanner from '../assets/ai-draft-banner.png';

interface ReportContentProps {
  sections: ReportSection[];
  currentSection: string;
  onSectionUpdate: (sectionId: string, content: string) => void;
  dataAssets: DataAsset[];
  onAssetToggle: (assetId: string) => void;
  currentUser: User;
  projectData?: any;
  onAddComment: (sectionId: string, text: string, commentType?: 'general' | 'issue' | 'approval-request', regarding?: string) => void;
  onAcceptAIDraft: (sectionId: string) => void;
  onDismissAIDraft: (sectionId: string) => void;
  onInsertAsset: (sectionId: string, assetId: string) => void;
  onRemoveAsset: (sectionId: string, insertedAssetId: string) => void;
  onAcceptNarrative: (sectionId: string, insertedAssetId: string) => void;
  onEditNarrative: (sectionId: string, insertedAssetId: string, text: string) => void;
  onResolveComment: (sectionId: string, commentId: string) => void;
  onApproveSection: (sectionId: string, approvalId: string, comment?: string) => void;
  onRejectSection: (sectionId: string, approvalId: string, comment: string) => void;
  onMarkSectionReady: (sectionId: string) => void;
  onMoveSectionToDraft: (sectionId: string) => void;
  onEditSection: (sectionId: string) => void;
  canAssembleReport: boolean;
  assemblyBlockers: string[];
  completenessStatus: ReportCompletenessStatus;
  onVerifyCompletenessElement: (elementId: string) => void;
  sectionAiIssues: Record<string, any[]>;
  onSectionAiIssuesChange: (sectionId: string, issues: any[]) => void;
  forceAnalyzeVersion: number;
  savedWontFixIssues?: Record<string, string[]>;
  onWontFixSave?: (sectionId: string, descriptions: string[]) => void;
  isReportBlocked?: boolean;
  onInitiateAmendment?: () => void;
  scrollTrigger?: number;
  /** Id of the section currently awaiting an AI-generated draft from the backend. */
  generatingSectionId?: string | null;
}

export function ReportContent({
  sections,
  currentSection,
  onSectionUpdate,
  dataAssets,
  onAssetToggle,
  currentUser,
  projectData,
  onAddComment,
  onAcceptAIDraft,
  onDismissAIDraft,
  onInsertAsset,
  onRemoveAsset,
  onAcceptNarrative,
  onEditNarrative,
  onResolveComment,
  onApproveSection,
  onRejectSection,
  onMarkSectionReady,
  onMoveSectionToDraft,
  onEditSection,
  canAssembleReport,
  assemblyBlockers,
  completenessStatus,
  onVerifyCompletenessElement,
  sectionAiIssues,
  onSectionAiIssuesChange,
  forceAnalyzeVersion,
  savedWontFixIssues,
  onWontFixSave,
  isReportBlocked,
  onInitiateAmendment,
  scrollTrigger,
  generatingSectionId,
}: ReportContentProps) {
  const { projectId } = useParams();
  const apiBase = '';

  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const editorRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set(['normal']));
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ sectionId: string; newContent: string; previousContent: string } | null>(null);
  const [commentingSection, setCommentingSection] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [selectedSectionForAsset, setSelectedSectionForAsset] = useState<string | null>(null);
const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [selectedSectionForComments, setSelectedSectionForComments] = useState<string | null>(null);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [selectedSectionForApprovals, setSelectedSectionForApprovals] = useState<string | null>(null);
  const [reviewModeModalOpen, setReviewModeModalOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Record<string, Array<{ name: string }>>>({});
  const [issuesExpanded, setIssuesExpanded] = useState<Record<string, boolean>>({});
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [wontFixModal, setWontFixModal] = useState<{ sectionId: string; issueId: string } | null>(null);
  const [wontFixComment, setWontFixComment] = useState('');
  const wontFixDescRef = useRef<Record<string, string[]>>({});
  // Track sectionId → content fingerprint to detect changes and avoid redundant calls
  const analyzedSectionsRef = useRef<Record<string, string>>({});

  const [reportMakeDeadline, setReportMakeDeadline] = useState<{ date: string; status: string } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(apiBase + '/api/projects/' + projectId + '/milestones')
      .then(r => r.json())
      .then((data: any) => {
        const m = data?.milestones?.find((m: any) => m.stepId === 'report-make');
        if (m?.deadline) setReportMakeDeadline({ date: m.deadline, status: m.status });
      })
      .catch(() => {});
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore persisted won't-fix suppressions on mount
  useEffect(() => {
    if (savedWontFixIssues) {
      wontFixDescRef.current = { ...savedWontFixIssues };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ref = sectionRefs.current[currentSection];
    if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentSection, scrollTrigger]);

  // Run AI analysis whenever content changes or a forced refresh is requested
  useEffect(() => {
    // Forced refresh: clear all tracked fingerprints so every section re-analyzes
    if (forceAnalyzeVersion > 0) {
      analyzedSectionsRef.current = {};
    }

    // Mark fingerprints synchronously (before any async work) so a StrictMode
    // double-invoke of this effect sees them already recorded and no-ops,
    // and collect only the sections that actually need (re-)analysis.
    const toAnalyze: { id: string; title: string; content: string }[] = [];
    sections.forEach(s => {
      const isAppendices = s.id === 'section-appendices';
      const hasContent = !!s.content?.trim();
      if (!hasContent && !isAppendices) return;
      // For appendices: fingerprint on the appendices list so re-analysis fires if the list changes
      const fingerprint = isAppendices
        ? `appendices:${(s as any).appendices?.length ?? 0}:${(s as any).appendices?.map((a: any) => a.id).join(',') ?? ''}`
        : `${s.content.length}:${s.content.slice(0, 80)}`;
      if (analyzedSectionsRef.current[s.id] !== fingerprint) {
        analyzedSectionsRef.current[s.id] = fingerprint;
        toAnalyze.push({ id: s.id, title: s.title, content: s.content });
      }
    });
    if (toAnalyze.length === 0) return;

    // Batched (not all-at-once) so a first load with many sections needing
    // analysis doesn't fire a large burst of concurrent requests against the
    // same rate-limited Azure OpenAI deployment.
    const ANALYZE_BATCH_SIZE = 3;
    (async () => {
      for (let i = 0; i < toAnalyze.length; i += ANALYZE_BATCH_SIZE) {
        const batch = toAnalyze.slice(i, i + ANALYZE_BATCH_SIZE);
        await Promise.all(batch.map(item => analyzeSectionWithAI(item.id, item.title, item.content)));
      }
    })();
  }, [sections, forceAnalyzeVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table2 className="w-3.5 h-3.5" />;
      case 'graph':
        return <BarChart3 className="w-3.5 h-3.5" />;
      default:
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
    }
  };

  // ── Populate editor when entering edit mode ────────────────────────────────
  useEffect(() => {
    if (editingSection) {
      const el = editorRefs.current.get(editingSection);
      const sec = sections.find(s => s.id === editingSection);
      if (el && sec) {
        el.innerHTML = sec.content || '<p><br></p>';
        el.focus();
      }
    }
  }, [editingSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WYSIWYG toolbar helpers ────────────────────────────────────────────────
  const updateActiveFormats = () => {
    const active = new Set<string>();
    try {
      if (document.queryCommandState('bold'))      active.add('bold');
      if (document.queryCommandState('italic'))    active.add('italic');
      if (document.queryCommandState('underline')) active.add('underline');
      const block = document.queryCommandValue('formatBlock').toLowerCase().replace(/[^a-z0-9]/g, '');
      if      (block === 'h1') active.add('h1');
      else if (block === 'h2') active.add('h2');
      else                     active.add('normal');
    } catch { active.add('normal'); }
    setActiveFormats(active);
  };

  const execFmt = (cmd: string, value?: string) => {
    if (editingSection) editorRefs.current.get(editingSection)?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
  };

  const handleBold      = () => execFmt('bold');
  const handleItalic    = () => execFmt('italic');
  const handleUnderline = () => execFmt('underline');
  const handleH1        = () => execFmt('formatBlock', 'h1');
  const handleH2        = () => execFmt('formatBlock', 'h2');
  const handleNormal    = () => execFmt('formatBlock', 'p');

  const handleInsertTable = () => {
    const th = (n: number) =>
      `<th style="border:1px solid #d1d5db;padding:6px 12px;background:#f8fafc;font-weight:600;text-align:left;">Column ${n}</th>`;
    const td = () =>
      `<td style="border:1px solid #d1d5db;padding:6px 12px;min-width:80px;">Cell</td>`;
    const html =
      `<table style="border-collapse:collapse;width:100%;margin:0.75rem 0;table-layout:fixed;">` +
      `<thead><tr>${[1, 2, 3].map(th).join('')}</tr></thead>` +
      `<tbody>` +
      `<tr>${[1, 2, 3].map(td).join('')}</tr>` +
      `<tr style="background:#f8fafc">${[1, 2, 3].map(td).join('')}</tr>` +
      `</tbody></table><p><br></p>`;
    if (editingSection) editorRefs.current.get(editingSection)?.focus();
    document.execCommand('insertHTML', false, html);
    updateActiveFormats();
  };

  const handleImageInsert = () => {
    const MAX_BYTES = 200 * 1024;
    const MAX_DIM   = 1200;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file: File = e.target.files[0];
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        let quality = 0.92;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.5) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        const html = `<img src="${dataUrl}" style="max-width:100%;height:auto;display:block;margin:0.5rem 0;" />`;
        if (editingSection) editorRefs.current.get(editingSection)?.focus();
        document.execCommand('insertHTML', false, html);
        updateActiveFormats();
      };
      img.src = objectUrl;
    };
    input.click();
  };

  const handleFileAttach = (sectionId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAttachedFiles(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), { name: file.name }],
      }));
    };
    input.click();
  };

  const analyzeSectionWithAI = async (sectionId: string, sectionTitle: string, sectionContent: string) => {
    if (!projectId) return;
    const section = sections.find(s => s.id === sectionId);
    const isAppendices = sectionId === 'section-appendices';
    // For appendices, the section content may be empty — still analyze using the appendices list
    if (!isAppendices && !sectionContent?.trim()) return;
    const appendicesList = isAppendices && section?.appendices
      ? section.appendices.map((a: any) => `${a.name}${a.category === 'recommended' ? ' (recommended)' : ''}`)
      : undefined;
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/analyze-report-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle, sectionContent, ...(appendicesList ? { appendicesList } : {}) }),
      });
      const result = await res.json();
      let issues: any[] = result.issues || (Array.isArray(result) ? result : []);
      const suppressed = wontFixDescRef.current[sectionId] || [];
      if (suppressed.length > 0) {
        issues = issues.filter((i: any) => !suppressed.includes(i.description));
      }
      onSectionAiIssuesChange(sectionId, issues);
    } catch {
      // silently fail
    }
  };

  const handleSaveSection = async (sectionId: string, newContent: string, previousContent: string, reason: string) => {
    setIsSaving(true);
    try {
      const projectRes = await fetch(apiBase + '/api/projects/' + projectId).then(r => r.json());
      const existingReport = projectRes.data?.report || {};
      const existingSections = existingReport.sections || {};

      await fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...projectRes.data,
            report: {
              ...existingReport,
              sections: {
                ...existingSections,
                [sectionId]: { ...(existingSections[sectionId] || {}), content: newContent },
              },
            },
          },
        }),
      });

      const sec = sections.find(s => s.id === sectionId);
      await fetch(apiBase + '/api/projects/' + projectId + '/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report.section.content.updated',
          message: `Section '${sec?.title ?? sectionId}' content updated`,
          stepId: 'report-make',
          actorUserId: currentUser.id,
          metadataJson: JSON.stringify({ previousContent, newContent, reason }),
        }),
      });

      onSectionUpdate(sectionId, newContent);
      // Re-run analysis on the updated content
      const sec2 = sections.find(s => s.id === sectionId);
      analyzeSectionWithAI(sectionId, sec2?.title || sectionId, newContent);
    } catch (err) {
      console.error('Failed to save section', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isContentOwner = (section: ReportSection) => {
    return section.roles.contentOwner.some(u => u.id === currentUser.id);
  };

  const isReviewer = (section: ReportSection) => {
    return section.roles.reviewer.some(u => u.id === currentUser.id);
  };

  const isApprover = (section: ReportSection) => {
    return section.roles.requiredApprover.some(u => u.id === currentUser.id);
  };

  const canEdit = (section: ReportSection) => {
    return isContentOwner(section) && (section.state === 'draft' || section.state === 'under-review');
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'draft':
        return { label: 'Draft', color: '#9CA3AF' };
      case 'under-review':
        return { label: 'Draft', color: '#9CA3AF' };
      case 'approved':
        return { label: 'Approved', color: '#2563EB' };
      case 'locked':
        return { label: 'Locked', color: '#6B7280' };
      default:
        return { label: 'Draft', color: '#9CA3AF' };
    }
  };

  const handleSubmitComment = (sectionId: string) => {
    if (commentText.trim()) {
      onAddComment(sectionId, commentText);
      setCommentText('');
      setCommentingSection(null);
    }
  };

  // Track figure/table numbers
  let tableCount = 0;
  let figureCount = 0;

  return (
    <main className="flex-1 bg-[#F9FAFB] overflow-y-auto border-r border-[#E5E7EB]">
      <div className="max-w-[920px] mx-auto px-4 py-6">
        {/* Project Header */}
        <div className="mb-6 pb-4 border-b border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Clinical Investigation Report</div>
          {projectId && <div className="text-lg font-semibold text-slate-900">{projectId}</div>}
          <div className="text-sm text-slate-600 mt-1">{projectData?.projectName}{projectData?.deviceName ? ' | ' + projectData.deviceName : ''}</div>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-[#111827] mb-1" style={{ fontSize: '17px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
            Report Sections
          </h2>
          <p className="text-[#6B7280]" style={{ fontSize: '13px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
            Review, edit, and approve each section according to your role and responsibilities
          </p>
        </div>

        {/* AI Disclaimer */}
        <div className="mb-6 flex items-start gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-purple-700">
            This system continuously uses AI to analyze content for completeness, consistency, and regulatory alignment. All decisions, approvals, and final responsibility remain with assigned human roles.
          </span>
        </div>

        {/* Section Cards */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const includedAssets = dataAssets.filter(a => 
              a.selected && a.suggestedSections?.includes(section.id)
            );

            const hasContent = section.content && section.content.trim().length > 0;
            const isEditing = editingSection === section.id;
            const sectionNumber = section.order ?? (sections.indexOf(section) + 1);
            const stateBadge = getStateBadge(section.state);
            const isLocked = section.state === 'approved' || section.state === 'locked';
            const unresolvedComments = section.comments.filter(c => !c.resolved);
            
            // Count blockers and warnings from AI analysis
            const openAiIssues = (sectionAiIssues[section.id] || []).filter((i: any) => i.status === 'open' || !i.status);
            const blockerCount = openAiIssues.filter((i: any) => i.severity === 'blocker').length;
            const issueCount = openAiIssues.filter((i: any) => i.severity === 'warning').length;
            const hasBlockers = blockerCount > 0 || issueCount > 0;

            // Calculate completeness progress
            const totalElements = section.completenessElements?.length || 0;
            const verifiedElements = section.completenessElements?.filter(el => el.status === 'verified').length || 0;
            const completenessText = totalElements > 0 ? `${verifiedElements}/${totalElements}` : (hasContent ? '1/1' : '0/1');
            const isExpanded = sectionExpanded[section.id] !== false;

            return (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className="border border-[#E5E7EB] rounded bg-white scroll-mt-16"
              >
                {/* Card Header - New Structure */}
                <div className={`px-5 py-3 bg-white${isExpanded ? ' border-b border-[#E5E7EB]' : ''}`}>
                  {/* Top Row: Title, Badges, Toggle */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2
                          className="text-[#111827]"
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            lineHeight: '1.3',
                            fontFamily: 'system-ui, sans-serif'
                          }}
                        >
                          Section {sectionNumber}: {section.title}
                        </h2>

                        {/* State Badge */}
                        <span
                          className="px-2 py-0.5 rounded border"
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            fontFamily: 'system-ui, sans-serif',
                            backgroundColor: section.state === 'approved' ? '#EFF6FF' : '#F9FAFB',
                            borderColor: section.state === 'approved' ? '#3B82F6' : '#E5E7EB',
                            color: section.state === 'approved' ? '#2563EB' : '#6B7280'
                          }}
                        >
                          {stateBadge.label}
                        </span>

                        {/* Issue count badges — clickable, expand issues list (exact match to protocol-section.tsx) */}
                        {blockerCount > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setIssuesExpanded(prev => ({ ...prev, [section.id]: true })); }}
                            className="px-2 py-0.5 bg-rose-50 text-xs rounded border border-rose-300 hover:bg-red-200 hover:border-red-400 transition-colors cursor-pointer"
                            style={{color: '#991b1b'}}
                            title="Click to view blockers"
                          >
                            {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                          </button>
                        )}

                        {issueCount > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setIssuesExpanded(prev => ({ ...prev, [section.id]: true })); }}
                            className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                            title="Click to view warnings"
                          >
                            {issueCount} Warning{issueCount > 1 ? 's' : ''}
                          </button>
                        )}


                      </div>
                    </div>

                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => setSectionExpanded(prev => ({ ...prev, [section.id]: !isExpanded }))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
                      aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                    >
                      <ChevronDown className={`w-5 h-5 text-[#6B7280] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </button>
                  </div>

                  {/* Second Row: Owner, Review Cycle, Deadline, Comments */}
                  <div className="flex items-center gap-4 text-[#6B7280] mb-3" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{section.roles.contentOwner[0]?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Review Cycle 1</span>
                    </div>
                    {reportMakeDeadline && (
                      <div className={`flex items-center gap-1.5 ${reportMakeDeadline.status === 'overdue' ? 'text-rose-700' : ''}`}>
                        <span>Deadline: {reportMakeDeadline.date}</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSectionForComments(section.id);
                        setCommentsPanelOpen(true);
                      }}
                      className="flex items-center gap-1.5 hover:text-[#111827] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{section.comments.length} comment{section.comments.length !== 1 ? 's' : ''}</span>
                    </button>
                  </div>

                  {isExpanded && <><div className="mb-3">
                    <div className="bg-white border border-[#E5E7EB] rounded p-3">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-3">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Review Cycle:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              Cycle 1
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Reviewer(s):
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {section.roles.reviewer.map(u => u.name).join(', ')}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Final Lock Role:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              Clinical Affairs VP
                            </span>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Required Approver:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {section.roles.requiredApprover.map(u => u.name).join(', ')}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Approval Status:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {stateBadge.label}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Last Updated:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              2026-02-07 13:55
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Roles Card - White Background with Border */}
                  <div className="bg-white border border-[#E5E7EB] rounded p-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Content Owner */}
                      <div className="flex items-start gap-2">
                        <UserIcon className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[#6B7280] mb-0.5" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Content Owner
                          </div>
                          <div className="text-[#111827]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {section.roles.contentOwner[0]?.name || 'Unassigned'}
                          </div>
                          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Medical Device Specialist
                          </div>
                        </div>
                      </div>

                      {/* Required Approver */}
                      <div className="flex items-start gap-2">
                        <UserIcon className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[#6B7280] mb-0.5" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Required Approver
                          </div>
                          <div className="text-[#111827]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {section.roles.requiredApprover[0]?.name || 'Unassigned'}
                          </div>
                          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            VP Clinical Affairs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>}

                </div>

                {isExpanded && <div className="px-5 py-4">
                  {/* Issues / AI Regulatory Analysis */}
                  {hasBlockers && (
                    <div className="mb-4 space-y-2">
                      {/* Toggle row */}
                      <button
                        onClick={() => setIssuesExpanded(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {blockerCount > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-medium" style={{color: '#991b1b'}}>
                              <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                              {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {blockerCount > 0 && issueCount > 0 && (
                            <span className="text-slate-300 text-xs select-none">·</span>
                          )}
                          {issueCount > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                              {issueCount} Warning{issueCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${issuesExpanded[section.id] ? '' : '-rotate-90'}`} />
                      </button>

                      {/* Issue cards */}
                      {issuesExpanded[section.id] && openAiIssues.map((issue: any) => {
                        const isBlockerIssue = issue.severity === 'blocker';
                        return (
                          <div
                            key={issue.id}
                            className={`border-l-4 rounded p-3 ${isBlockerIssue ? 'bg-rose-50 border-rose-500' : 'bg-amber-50 border-amber-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${isBlockerIssue ? 'bg-rose-50' : 'bg-amber-100 text-amber-800'}`}
                                style={isBlockerIssue ? {color: '#991b1b'} : undefined}
                              >
                                {issue.severity}
                              </span>
                              <span className="text-xs text-slate-500">AI Regulatory Review</span>
                              {issue.subsection && (
                                <span className="text-xs font-medium text-slate-900">{issue.subsection}</span>
                              )}
                            </div>
                            <p className={`text-xs leading-relaxed mb-1 ${isBlockerIssue ? '' : 'text-amber-800'}`} style={isBlockerIssue ? {color: '#991b1b'} : undefined}>
                              {issue.description}
                            </p>
                            {issue.reference && (
                              <div className="text-xs text-slate-500 italic mb-1">{issue.reference}</div>
                            )}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 mt-1.5">
                              <span className="text-xs text-slate-500">
                                {issue.raisedBy} · {issue.raisedDate}
                                {issue.dueDate && <span className="font-medium" style={{color: '#991b1b'}}> · Due in {issue.dueDate}</span>}
                              </span>
                              <button
                                onClick={() => { setWontFixModal({ sectionId: section.id, issueId: issue.id }); setWontFixComment(''); }}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-2"
                              >
                                Won't fix
                              </button>
                            </div>
                          </div>
                        );
                      })}


                    </div>
                  )}

                  {/* Completeness Status */}
                  <SectionCompletenessStatus
                    elements={section.completenessElements}
                    sectionTitle={section.title}
                  />

                  {/* Guidance Panel - What this section must include */}
                  <SectionGuidancePanel
                    guidance={section.guidance}
                    onViewDocument={(docName) => {
                      console.log('View document:', docName);
                    }}
                  />

                  {/* AI draft generation in progress (real backend AI call) */}
                  {generatingSectionId === section.id && !hasContent && !section.aiDraft && (
                    <div className="mb-4 flex items-center gap-2 text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-[#D1D5DB] border-t-[#2563EB] rounded-full animate-spin" />
                      Generating AI draft…
                    </div>
                  )}

                  {/* AI-Generated Draft Banner */}
                  {section.aiDraft && !hasContent && canEdit(section) && (
                    <div className="mb-4">
                      {/* Banner Image */}
                      <img 
                        src={aiDraftBanner} 
                        alt="AI-generated draft – editable until approved" 
                        className="w-full mb-3 rounded"
                      />
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onAcceptAIDraft(section.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors"
                          style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          <Check className="w-3 h-3" />
                          Acceptera & Redigera
                        </button>
                        <button
                          onClick={() => onDismissAIDraft(section.id)}
                          className="flex items-center gap-1 px-2 py-1 border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F9FAFB] transition-colors"
                          style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          <X className="w-3 h-3" />
                          Avvisa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Draft Content (Read-Only Preview) */}
                  {section.aiDraft && !hasContent && (
                    <div 
                      className="text-[#374151] mb-4 bg-[#F9FAFB] rounded p-3 border-l-2 border-[#2563EB]"
                      style={{ 
                        fontSize: '14px', 
                        lineHeight: '1.6',
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 400,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {section.aiDraft}
                    </div>
                  )}

                  {/* Section Content */}
                  {section.id === 'section-9' && section.appendices ? (
                    <div className="mb-4">
                      <AppendicesSection
                        appendices={section.appendices}
                        onUploadAppendix={(appendixId, file) => {
                          console.log('Upload appendix:', appendixId, file.name);
                        }}
                        canEdit={canEdit(section)}
                      />
                    </div>
                  ) : isEditing ? (() => {
                    const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: '#475569', flexShrink: 0 };
                    const btnActive: React.CSSProperties = { ...btnBase, backgroundColor: '#e2e8f0' };
                    const divider = <div style={{ width: 1, height: 20, backgroundColor: '#d1d5db', margin: '0 4px', flexShrink: 0 }} />;
                    return (
                      <div className="mb-4">
                        {/* Toolbar */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: '4px 6px', backgroundColor: '#f8fafc', borderRadius: '0.375rem 0.375rem 0 0', border: '2px solid #3b82f6', borderBottom: '1px solid #e2e8f0' }}>
                          <button title="Bold" style={activeFormats.has('bold') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('bold')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleBold}><Bold size={13} /></button>
                          <button title="Italic" style={activeFormats.has('italic') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('italic')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleItalic}><Italic size={13} /></button>
                          <button title="Underline" style={activeFormats.has('underline') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('underline')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleUnderline}><Underline size={13} /></button>
                          {divider}
                          <button title="Heading 1" style={activeFormats.has('h1') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('h1')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleH1}><Heading1 size={13} /></button>
                          <button title="Heading 2" style={activeFormats.has('h2') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('h2')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleH2}><Heading2 size={13} /></button>
                          <button title="Normal text" style={activeFormats.has('normal') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('normal')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleNormal}><Type size={13} /></button>
                          {divider}
                          <button title="Insert table" style={btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')} onClick={handleInsertTable}><Table2 size={13} /></button>
                          <button title="Insert image" style={btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')} onClick={handleImageInsert}><Image size={13} /></button>
                          <button title="Attach file (.pdf, .doc, .docx)" style={btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')} onClick={() => handleFileAttach(section.id)}><Paperclip size={13} /></button>
                        </div>
                        {/* contentEditable editor */}
                        <div
                          ref={(el) => editorRefs.current.set(section.id, el)}
                          contentEditable
                          suppressContentEditableWarning
                          onKeyUp={updateActiveFormats}
                          onMouseUp={updateActiveFormats}
                          onSelect={updateActiveFormats}
                          style={{ width: '100%', minHeight: '200px', fontSize: '0.9rem', lineHeight: '1.7', padding: '0.75rem', border: '2px solid #3b82f6', borderTop: 'none', borderRadius: '0 0 0.375rem 0.375rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', overflowY: 'auto' }}
                        />
                        {/* Attached files (edit mode) */}
                        {(attachedFiles[section.id] || []).length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {(attachedFiles[section.id] || []).map((f, i) => (
                              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
                                <Paperclip size={11} />
                                {f.name}
                                <button
                                  onClick={() => setAttachedFiles(prev => ({ ...prev, [section.id]: (prev[section.id] || []).filter((_, j) => j !== i) }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, lineHeight: 1 }}
                                >×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Save / Cancel */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={() => {
                              const el = editorRefs.current.get(section.id);
                              const newContent = el?.innerHTML || '';
                              setPendingSave({ sectionId: section.id, newContent, previousContent: section.content || '' });
                              setChangeReason('');
                              setShowReasonModal(true);
                            }}
                            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                          >Save</button>
                          <button
                            onClick={() => setEditingSection(null)}
                            style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                          >Cancel</button>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="mb-4">
                      {/* Edit button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button
                          disabled={isLocked}
                          onClick={() => setEditingSection(section.id)}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: isLocked ? 'not-allowed' : 'pointer', color: isLocked ? '#9CA3AF' : '#374151', opacity: isLocked ? 0.6 : 1 }}
                        >Edit</button>
                      </div>
                      {/* Content — bordered container matching Make Protocol's ProtocolTextSeparator */}
                      <div className="border-2 border-slate-300 rounded bg-white relative">
                        <div className="absolute -top-2.5 left-3 px-2 bg-white border border-slate-300 rounded">
                          <span className="text-xs font-medium text-slate-700">REPORT TEXT</span>
                        </div>
                        <div className="p-4">
                          {hasContent ? (
                            <div
                              style={{ lineHeight: '1.7', fontSize: '0.9rem' }}
                              dangerouslySetInnerHTML={{ __html: renderContent(section.content || '') }}
                            />
                          ) : (
                            <div className="text-[#9CA3AF] italic" style={{ fontSize: '14px', fontFamily: 'system-ui, sans-serif' }}>
                              No content yet
                            </div>
                          )}
                          {/* Attached files (read mode) */}
                          {(attachedFiles[section.id] || []).length > 0 && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                              {(attachedFiles[section.id] || []).map((f, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
                                  <Paperclip size={11} />
                                  {f.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                          <p className="text-xs text-slate-600">
                            <strong>For regulatory inspection:</strong> Only content within "REPORT TEXT" boundaries is included in official report documents and regulatory submissions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insert Data Asset Button */}
                  {isContentOwner(section) && !isLocked && section.id !== 'section-9' && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setSelectedSectionForAsset(section.id);
                          setAssetSelectorOpen(true);
                        }}
                        className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors flex items-center gap-1.5"
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert data asset
                      </button>
                    </div>
                  )}

                  {/* Approve Section or Request Changes Button - Always at Bottom */}
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex justify-end items-center gap-3">
                    {blockerCount > 0 && !isLocked && (
                      <span className="text-xs text-slate-500">
                        Resolve {blockerCount} blocker{blockerCount > 1 ? 's' : ''} before approving
                      </span>
                    )}
                    {!isLocked && (
                      <button
                        disabled={blockerCount > 0 || isReportBlocked}
                        onClick={() => {
                          setSelectedSectionForApprovals(section.id);
                          setApprovalsModalOpen(true);
                        }}
                        className={`px-3 py-1.5 text-white rounded transition-colors ${(blockerCount > 0 || isReportBlocked) ? 'bg-[#93C5FD] cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1D4ED8] cursor-pointer'}`}
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        title={isReportBlocked ? 'Report authoring is blocked pending protocol amendment approval/rejection' : blockerCount > 0 ? 'Resolve all blockers before approving' : undefined}
                      >
                        Approve Section
                      </button>
                    )}
                    
                    {isLocked && (
                      <button
                        onClick={() => {
                          // Unlock section and move to draft for editing
                          onEditSection(section.id);
                        }}
                        className="px-3 py-1.5 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors bg-white"
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        disabled={!isContentOwner(section)}
                      >
                        Request Changes
                      </button>
                    )}
                  </div>
                </div>}
              </div>
            );
          })}
        </div>

        {/* Ready for Review Section */}
        <div className="mt-8 border-t border-[#E5E7EB] pt-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-[#111827] mb-2" style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                Ready for Review?
              </h3>
              <p className="text-[#6B7280] mb-4" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>
                Enter Review Mode to initiate formal review and approval process. Reviewers will assess completeness, consistency, and regulatory compliance. You can return to editing at any time based on feedback.
              </p>

              {/* Blocker Alert */}
              {(() => {
                const totalBlockers = Object.values(sectionAiIssues).flat().filter((i: any) => i.severity === 'blocker').length;
                const hasBlockers = totalBlockers > 0;
                return (
                  <div className={`p-3 mb-3 rounded border ${hasBlockers ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#F0FDF4] border-[#86EFAC]'}`}>
                    <div className={`mb-1 ${hasBlockers ? 'text-[#991B1B]' : 'text-[#166534]'}`} style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                      {totalBlockers} open {totalBlockers === 1 ? 'blocker' : 'blockers'} detected
                    </div>
                    <div className={hasBlockers ? 'text-[#991B1B]' : 'text-[#166534]'} style={{ fontSize: '12px', fontWeight: 400, lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
                      {hasBlockers
                        ? 'You can still enter review mode. Reviewers will be notified of outstanding blockers and may request resolution before approval.'
                        : 'No blockers detected. All sections are clear for review.'}
                    </div>
                  </div>
                );
              })()}

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-3 bg-[#DBEAFE] border border-[#93C5FD] rounded">
                <Info className="w-5 h-5 text-[#1E40AF] flex-shrink-0 mt-0.5" />
                <div className="text-[#1E3A8A]" style={{ fontSize: '12px', fontWeight: 400, lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
                  Some sections are not yet complete. Review can proceed, but incomplete sections will be flagged for reviewers.
                </div>
              </div>
            </div>

            <button
              className="px-5 py-2.5 bg-[#3B4A5C] text-white rounded hover:bg-[#2C3A48] transition-colors flex items-center gap-2 flex-shrink-0"
              style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
              onClick={() => setReviewModeModalOpen(true)}
            >
              Enter Review Mode
            </button>
          </div>

          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600 mb-3">
              If protocol conditions or assumptions have changed during the investigation, initiate a formal protocol amendment to maintain regulatory traceability.
            </p>
            <button
              onClick={onInitiateAmendment}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Add Protocol Amendment
            </button>
          </div>
        </div>
      </div>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={assetSelectorOpen}
        onClose={() => setAssetSelectorOpen(false)}
        dataAssets={dataAssets}
        uploadedFiles={[]}
        sectionId={selectedSectionForAsset || ''}
        onInsertAsset={(assetId) => {
          if (selectedSectionForAsset) {
            onInsertAsset(selectedSectionForAsset, assetId);
          }
          setAssetSelectorOpen(false);
        }}
      />

{/* Comments Panel */}
      <CommentsPanel
        isOpen={commentsPanelOpen}
        onClose={() => setCommentsPanelOpen(false)}
        sectionTitle={selectedSectionForComments ? sections.find(s => s.id === selectedSectionForComments)?.title || '' : ''}
        sectionNumber={selectedSectionForComments ? (sections.findIndex(s => s.id === selectedSectionForComments) + 1).toString() : ''}
        comments={selectedSectionForComments ? sections.find(s => s.id === selectedSectionForComments)?.comments || [] : []}
        currentUser={currentUser}
        onAddComment={(text, commentType, regarding) => {
          if (selectedSectionForComments) {
            onAddComment(selectedSectionForComments, text, commentType, regarding);
          }
        }}
        onResolveComment={(commentId) => {
          if (selectedSectionForComments) {
            onResolveComment(selectedSectionForComments, commentId);
          }
        }}
      />

      {/* Section Approvals Modal */}
      <SectionApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
        sectionTitle={selectedSectionForApprovals ? sections.find(s => s.id === selectedSectionForApprovals)?.title || '' : ''}
        approvals={selectedSectionForApprovals ? sections.find(s => s.id === selectedSectionForApprovals)?.approvals || [] : []}
        currentUser={currentUser}
        onApprove={(approvalId, comment) => {
          if (selectedSectionForApprovals) {
            onApproveSection(selectedSectionForApprovals, approvalId, comment);
          }
        }}
        onReject={(approvalId, comment) => {
          if (selectedSectionForApprovals) {
            onRejectSection(selectedSectionForApprovals, approvalId, comment);
          }
        }}
      />

      {/* Enter Review Mode Modal */}
      <EnterReviewModeModal
        isOpen={reviewModeModalOpen}
        onClose={() => setReviewModeModalOpen(false)}
        onProceed={() => {
          setReviewModeModalOpen(false);
          // Transition report-make → approved so the sidebar unlocks Report Review.
          if (projectId) {
            transitionWorkflow({
              projectId,
              stepId: 'report-make',
              to: 'approved',
              note: 'Report entered review mode',
            }).catch(() => {});
          }
        }}
        sections={sections}
      />

      {/* Won't Fix Modal */}
      {wontFixModal && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div style={{backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
            <h2 style={{margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a'}}>Mark as Won't Fix</h2>
            <p style={{margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b'}}>
              Provide a reason for suppressing this issue. This will be saved in the audit trail.
            </p>
            <textarea
              autoFocus
              value={wontFixComment}
              onChange={(e) => setWontFixComment(e.target.value)}
              placeholder="e.g. Risk accepted per sponsor decision, documented in risk management file"
              style={{width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => { setWontFixModal(null); setWontFixComment(''); }}
                style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
              >Cancel</button>
              <button
                disabled={!wontFixComment.trim()}
                onClick={() => {
                  const { sectionId, issueId } = wontFixModal;
                  const issueDesc = (sectionAiIssues[sectionId] || []).find((i: any) => i.id === issueId)?.description || '';
                  const updated = [...(wontFixDescRef.current[sectionId] || []), issueDesc];
                  wontFixDescRef.current = { ...wontFixDescRef.current, [sectionId]: updated };
                  onSectionAiIssuesChange(sectionId, (sectionAiIssues[sectionId] || []).filter((i: any) => i.id !== issueId));
                  onWontFixSave?.(sectionId, updated);
                  setWontFixModal(null);
                  setWontFixComment('');
                }}
                style={{padding: '0.5rem 1rem', backgroundColor: wontFixComment.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: wontFixComment.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500}}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reason for Change Modal */}
      {showReasonModal && pendingSave && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Reason for change</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b' }}>
              Describe why this section is being changed. This will be saved in the audit trail.
            </p>
            <textarea
              autoFocus
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Updated content based on reviewer feedback"
              style={{ width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowReasonModal(false); setPendingSave(null); }}
                style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >Cancel</button>
              <button
                disabled={!changeReason.trim() || isSaving}
                onClick={async () => {
                  const { sectionId, newContent, previousContent } = pendingSave;
                  const reason = changeReason.trim();
                  setShowReasonModal(false);
                  setEditingSection(null);
                  setPendingSave(null);
                  await handleSaveSection(sectionId, newContent, previousContent, reason);
                }}
                style={{ padding: '0.5rem 1rem', backgroundColor: changeReason.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: changeReason.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500 }}
              >{isSaving ? 'Saving…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}