import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Info, AlertCircle, CheckCircle2, Clock, MessageSquare, History, ChevronDown, User, Lock, UserCheck, FileCheck, AlertTriangle, XCircle, Ban, Bold, Italic, Underline, Heading1, Heading2, Type, Table2, Image } from 'lucide-react';
import type { ProtocolAttachment } from '@/shared/api/documents';
import { AuditTrailModal } from './audit-trail-modal';
import { InlineIssueMarker } from './inline-issue-marker';
import { CommentsModal } from './comments-modal';
import { SectionCompletenessIndicator } from './section-completeness-indicator';
import { AmendmentWarning } from './amendment-warning';
import { ProtocolTextSeparator, MetadataSeparator } from './protocol-text-separator';
import { AIRoleClarityBanner } from './ai-role-clarity-banner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface ProtocolIssue {
  id: string;
  severity: 'blocker' | 'warning';
  subsection: string;
  description: string;
  reference?: string;
  raisedBy: string;
  raisedDate: string;
  status: 'open' | 'potentially-resolved' | 'resolved';
  dueDate?: string;
}

interface RequiredElement {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'missing';
  reference: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

interface AuditEntry {
  timestamp: string;
  timezone: string;
  user: string;
  userRole: string;
  action: string;
  affectedElement: string;
  details?: string;
  aiAssisted?: boolean;
}

interface SectionComment {
  id: string;
  author: string;
  authorRole: string;
  timestamp: string;
  content: string;
  type: 'general' | 'issue' | 'approval-request' | 'resolved';
  subsection?: string;
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedDate?: string;
}

interface ProtocolSectionProps {
  section: {
    id: string;
    number: string;
    title: string;
    status: string;
    owner: string;
    updated: string;
    comments: SectionComment[];
    aiGenerated: boolean;
    reviewStatus: string | null;
    locked?: boolean;
    reviewCycle?: number;
    reviewer?: string;
    approver?: string;
    approverRole?: string;
    ownerRole?: string;
    issues?: ProtocolIssue[];
    requiredElements?: RequiredElement[];
    content?: string;
    approvalStatus?: string;
    approvedBy?: string;
    approvedAt?: string;
    amended?: boolean;
    amendmentId?: string;
    amendmentNumber?: number;
  };
  targetMarkets?: string[];
  deviceCategory?: string;
  isExpanded: boolean;
  onToggle: () => void;
  isHighlighted?: boolean;
  isReviewMode?: boolean;
  onSaved?: (newContent: string, previousContent: string, reason: string) => Promise<void>;
  onWontFix?: (issueId: string, comment: string) => void;
  onAddComment?: (content: string, type: string) => void;
  onResolveComment?: (commentId: string) => void;
  onNavigate?: () => void;
  onApprove?: (comment: string) => Promise<void>;
  onUnlock?: (reason: string) => Promise<void>;
  deadline?: { date: string; status: string } | null;
  analysisFailed?: boolean;
  analysisRetrying?: boolean;
  onRetryAnalysis?: () => void;
  attachments?: ProtocolAttachment[];
}

/** Apply only inline markdown (bold, italic, underline, images) — safe inside table cells. */
function applyInlineMarkdown(text: string): string {
  console.log('applyInlineMarkdown input:', text.substring(0, 100));
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:0.5rem 0;border-radius:4px;display:block;" />')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
}

/** Parse a table row string "| a | b | c |" into trimmed cell strings. */
function parseTableRow(row: string): string[] {
  return row.split('|').slice(1, -1).map(c => c.trim());
}

/** Return true if the line looks like a markdown table separator: |---|---| */
function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+(\|[\s\-:|]+)+\|$/.test(line.trim());
}

function renderMarkdown(content: string): string {
  if (!content) return '';

  // Handle images before line splitting — data URLs can be very long, may
  // span multiple lines, and can contain ) characters that break [^)]+ patterns.
  // Using /gs (dotAll) with a lazy [^"]+? so the match is anchored by the
  // closing ) without being confused by any ) characters inside the URL itself.
  content = content.replace(
    /!\[([^\]]*)\]\((data:[^"]+?)\)/gs,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:0.5rem 0;border-radius:4px;display:block;" />\n'
  );
  // Also handle plain https?:// image URLs (these are safe with [^)]+)
  content = content.replace(
    /!\[([^\]]*)\]\((https?:[^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:0.5rem 0;border-radius:4px;display:block;" />\n'
  );

  const lines = content.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Markdown table block ────────────────────────────────────────────────
    // A table block is a consecutive run of lines that start AND end with '|'
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length > 2) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('|') && t.endsWith('|') && t.split('|').length > 2) {
          tableLines.push(lines[i]);
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 1) {
        const headers = parseTableRow(tableLines[0]);
        const hasSep = tableLines.length > 1 && isTableSeparator(tableLines[1]);
        const dataRows = tableLines.slice(hasSep ? 2 : 1);

        let html = '<table class="w-full border-collapse text-sm my-3"><thead><tr>';
        headers.forEach(h => {
          html += `<th class="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold">${applyInlineMarkdown(h)}</th>`;
        });
        html += '</tr></thead><tbody>';

        dataRows.forEach((row, idx) => {
          const cells = parseTableRow(row);
          const rowClass = idx % 2 === 1 ? ' class="bg-slate-50"' : '';
          html += `<tr${rowClass}>`;
          cells.forEach(cell => {
            html += `<td class="border border-slate-300 px-3 py-2">${applyInlineMarkdown(cell)}</td>`;
          });
          html += '</tr>';
        });

        html += '</tbody></table>';
        output.push(html);
      }
      continue;
    }

    // ── Block-level headings ────────────────────────────────────────────────
    if (trimmed.startsWith('# ')) {
      output.push(`<h1 class="text-xl font-bold mb-2">${applyInlineMarkdown(trimmed.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      output.push(`<h2 class="text-lg font-semibold mb-2">${applyInlineMarkdown(trimmed.slice(3))}</h2>`);
      i++;
      continue;
    }

    // ── Regular line ────────────────────────────────────────────────────────
    output.push(applyInlineMarkdown(line) + '<br/>');
    i++;
  }

  return output.join('');
}

function ProtocolSectionComponent(
  { section, targetMarkets = [], deviceCategory = '', isExpanded, onToggle, isHighlighted = false, isReviewMode = false, onSaved, onWontFix, onAddComment, onResolveComment, onNavigate, onApprove, onUnlock, deadline, analysisFailed = false, analysisRetrying = false, onRetryAnalysis, attachments = [] }: ProtocolSectionProps,
  ref: React.Ref<HTMLDivElement>
) {
  const issuesRef = useRef<HTMLDivElement>(null);
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showAmendmentWarning, setShowAmendmentWarning] = useState(false);
  const [completenessExpanded, setCompletenessExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [wontFixModal, setWontFixModal] = useState<string | null>(null); // issueId or null
  const [wontFixComment, setWontFixComment] = useState('');
  const [hoveredRoleTerm, setHoveredRoleTerm] = useState<'reviewer' | 'approver' | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set(['normal']));
  const editorRef = useRef<HTMLDivElement>(null);
  const editorSelectionRef = useRef<Range | null>(null);

  // Approval / unlock modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  const isApproved = section.approvalStatus === 'approved';
  const comments = Array.isArray(section.comments) ? section.comments : [];

  // Count open issues by severity
  const openIssues = section.issues?.filter(i => i.status === 'open') || [];
  const blockerCount = openIssues.filter(i => i.severity === 'blocker').length;
  const warningCount = openIssues.filter(i => i.severity === 'warning').length;
  const totalIssues = openIssues.length;
  const isBlocked = blockerCount > 0;

  // ─── contentEditable rich text editor ───────────────────────────────────

  // Populate editor HTML when entering edit mode
  useEffect(() => {
    if (isEditing && editorRef.current) {
      // Fix 19: previously assigned section.content to innerHTML directly, bypassing the
      // sanitizeForRender() DOMPurify pass used everywhere else in this file — a stray
      // <img onerror=...> or similar would execute the instant a user opened the section
      // for editing. Sanitize here too, exactly as the read-mode render path already does.
      editorRef.current.innerHTML = sanitizeForRender(section.content || '') || '<p><br></p>';
      editorRef.current.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WYSIWYG contentEditable toolbar helpers ────────────────────────────────

  const rememberEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      editorSelectionRef.current = range.cloneRange();
    }
  };

  /** Read current selection state and highlight the matching toolbar buttons. */
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
    rememberEditorSelection();
  };

  const insertAttachmentReference = (appendixNumber: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    const savedRange = editorSelectionRef.current;
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      selection.addRange(savedRange);
    } else {
      const endRange = document.createRange();
      endRange.selectNodeContents(editor);
      endRange.collapse(false);
      selection.addRange(endRange);
    }
    document.execCommand('insertText', false, `(see Appendix ${appendixNumber})`);
    rememberEditorSelection();
  };

  /** Focus the editor, run an execCommand, then resync toolbar state. */
  const execFmt = (cmd: string, value?: string) => {
    editorRef.current?.focus();
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
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    updateActiveFormats();
  };

  const handleImageInsert = () => {
    const MAX_BYTES = 200 * 1024; // 200 KB limit
    const MAX_DIM   = 1200;       // max pixel dimension before downscaling

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
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        let quality = 0.85;
        let base64  = canvas.toDataURL('image/jpeg', quality);
        while (base64.length > MAX_BYTES && quality > 0.15) {
          quality = Math.round((quality - 0.1) * 100) / 100;
          base64  = canvas.toDataURL('image/jpeg', quality);
        }

        if (base64.length > MAX_BYTES) {
          alert(
            `Image is too large (${Math.round(base64.length / 1024)} KB after compression). ` +
            `Please use a smaller image (max 200 KB).`
          );
          return;
        }

        const imgHTML = `<img src="${base64}" alt="${file.name}" style="max-width:100%;height:auto;margin:0.5rem 0;border-radius:4px;display:block;" />`;
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, imgHTML);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert('Could not load image. Please try a different file.');
      };

      img.src = objectUrl;
    };
    input.click();
  };

  /**
   * Render content for read mode.
   * HTML content (new) is rendered directly; legacy markdown is converted.
   */
  // Defense-in-depth: the backend sanitizes section content on the way in (see
  // sanitize-section-html.ts), but this renders straight into dangerouslySetInnerHTML,
  // so it must never trust that alone — sanitize again immediately before render.
  const sanitizeForRender = (html: string): string => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'mark', 'span', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['style', 'src', 'alt'],
  });

  const renderContent = (content: string): string => {
    if (!content) return '';
    if (/<[a-z][\s\S]*>/i.test(content)) return sanitizeForRender(content);
    // Legacy markdown fallback
    let h = content
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
    return sanitizeForRender(h);
  };

  return (
    <div 
      ref={ref}
      className={`bg-white border rounded transition-all duration-300 ${
        isHighlighted 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
          : 'border-slate-200'
      }`}
    >
      {/* Collapsed Header - Always Visible */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-slate-900 font-semibold">
                Section {section.number}: {section.title}
              </h3>
              
              {/* Status Badges */}
              {section.locked && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                  Locked
                </span>
              )}
              {isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-200 font-medium">
                  Approved
                </span>
              )}
              {!isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200">
                  Draft
                </span>
              )}
              {section.amended && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded border border-orange-200 font-medium">
                  Amended{section.amendmentNumber ? ` (#${section.amendmentNumber})` : ''}
                </span>
              )}
              {/* Issue Count Badges - clickable, expand issues list */}
              {totalIssues > 0 && (
                <>
                  {blockerCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isExpanded) onToggle();
                        setIssuesExpanded(true);
                        setTimeout(() => issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), isExpanded ? 50 : 300);
                      }}
                      className="px-2 py-0.5 bg-rose-50 text-xs rounded border border-rose-300 hover:bg-red-200 hover:border-red-400 transition-colors cursor-pointer" style={{color: '#991b1b'}}
                      title="Click to view blockers"
                    >
                      {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                    </button>
                  )}
                  {warningCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isExpanded) onToggle();
                        setIssuesExpanded(true);
                        setTimeout(() => issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), isExpanded ? 50 : 300);
                      }}
                      className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                      title="Click to view warnings"
                    >
                      {warningCount} Warning{warningCount > 1 ? 's' : ''}
                    </button>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{section.owner}</span>
              </div>
              {!!section.reviewCycle && (
                <div className="flex items-center gap-1">
                  <span>Review Cycle {section.reviewCycle}</span>
                </div>
              )}
              {deadline && (
                <div className={`flex items-center gap-1 ${deadline.status === 'overdue' ? 'text-rose-700' : ''}`}>
                  <span>Deadline: {deadline.date}</span>
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentsOpen(true);
                }}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{comments.filter(c => c.status === 'open').length} comment{comments.filter(c => c.status === 'open').length === 1 ? '' : 's'}</span>
              </button>
              
              {/* Completeness Indicator */}
              {section.requiredElements && section.requiredElements.length > 0 && (
                <div className="ml-auto">
                  <span className="text-xs text-slate-500">
                    {section.requiredElements.filter(e => e.status === 'complete').length}/{section.requiredElements.length} complete
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            <ChevronDown 
              className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 space-y-4">
            {/* 1. REVIEW HEADER */}
            <div className="p-4 bg-white border border-slate-200 rounded">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Review Cycle:</span>
                  <span className="ml-2 text-slate-900">Cycle {section.reviewCycle || 1}</span>
                </div>
                <div>
                  <span
                    className="relative inline-flex items-center gap-1 text-slate-500"
                    onMouseEnter={() => setHoveredRoleTerm('approver')}
                    onMouseLeave={() => setHoveredRoleTerm(null)}
                  >
                    Required Approver:
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    {hoveredRoleTerm === 'approver' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20 normal-case font-normal">
                        Gives formal sign-off on this section. Their approval is required
                        before the section can move forward — distinct from a Reviewer, who
                        can comment and flag issues but doesn't hold approval authority.
                      </div>
                    )}
                  </span>
                  <span className="ml-2 text-slate-900">{section.approver || ''}</span>
                </div>
                <div>
                  <span
                    className="relative inline-flex items-center gap-1 text-slate-500"
                    onMouseEnter={() => setHoveredRoleTerm('reviewer')}
                    onMouseLeave={() => setHoveredRoleTerm(null)}
                  >
                    Reviewer(s):
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    {hoveredRoleTerm === 'reviewer' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20 normal-case font-normal">
                        Can read, comment on, and raise issues against this section during
                        review. A Reviewer's feedback doesn't by itself move the section
                        forward — that requires the Required Approver's sign-off.
                      </div>
                    )}
                  </span>
                  <span className="ml-2 text-slate-900">{section.reviewer || ''}</span>
                </div>
                <div>
                  <span className="text-slate-500">Approval Status:</span>
                  <span className={`ml-2 font-medium ${isApproved ? 'text-blue-700' : 'text-slate-700'}`}>
                    {isApproved ? 'Approved' : 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Final Lock Role:</span>
                  <span className="ml-2 text-slate-900">Clinical Affairs VP</span>
                </div>
                <div>
                  <span className="text-slate-500">Last Updated:</span>
                  <span className="ml-2 text-slate-900">{section.updated ? new Date(section.updated).toLocaleString("sv-SE", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : ""}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setAuditTrailOpen(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <History className="w-3 h-3" />
                  View audit trail
                </button>
              </div>
            </div>

            {/* 2. ROLES & APPROVAL CARD */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Content Owner</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-900">{section.owner}</div>
                      <div className="text-xs text-slate-500">{section.ownerRole || ''}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-500 mb-1">Required Approver</div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-900">{section.approver || ''}</div>
                      <div className="text-xs text-slate-500">{section.approverRole || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. COMPLETENESS STATUS - INSPECTION CRITICAL */}
            {/* Always shown in a collapsible box */}
            {analysisFailed ? (
              <div className="px-3 py-2.5 border border-amber-200 bg-amber-50 rounded flex items-center justify-between gap-3">
                <span className="text-xs text-amber-800">
                  Completeness analysis unavailable — the last check failed, so results below may be out of date.
                </span>
                {onRetryAnalysis && (
                  <button
                    onClick={onRetryAnalysis}
                    disabled={analysisRetrying}
                    className="text-xs font-medium text-amber-800 hover:text-amber-900 disabled:text-amber-400 disabled:no-underline underline flex-shrink-0 flex items-center gap-1.5"
                  >
                    {analysisRetrying && <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-800 rounded-full animate-spin" />}
                    {analysisRetrying ? 'Retrying…' : 'Retry'}
                  </button>
                )}
              </div>
            ) : (
              section.requiredElements && section.requiredElements.length > 0 && (
                <SectionCompletenessIndicator
                  sectionNumber={section.number}
                  requiredElements={section.requiredElements}
                />
              )
            )}

            {/* 4. AI ROLE CLARITY - INSPECTION CRITICAL */}
            {/* Only show in REVIEW mode */}
            {section.aiGenerated && !isApproved && isReviewMode && (
              <AIRoleClarityBanner
                contentType="ai-draft"
                lastHumanReviewer={section.reviewer}
                lastReviewDate={section.updated}
              />
            )}

            {section.aiGenerated && isApproved && isReviewMode && (
              <AIRoleClarityBanner
                contentType="ai-edited"
                aiEditedBy={section.owner}
                lastHumanReviewer={section.approver}
                lastReviewDate={section.updated}
              />
            )}

            {/* AMENDMENT NEEDS-REVIEW WARNING */}
            {section.approvalStatus === 'needs-review' && (
              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-900 mb-1">
                      Section Needs Review After Amendment
                    </div>
                    <p className="text-xs text-orange-800 leading-relaxed">
                      This section was affected by an approved protocol amendment
                      {section.amendmentNumber ? ` (#${section.amendmentNumber})` : ''} and its prior approval no longer
                      applies. Review the content and re-approve before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. LOCKED SECTION BANNER - AMENDMENT REQUIRED */}
            {section.locked && (
              <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      Locked Section - Amendment Required for Changes
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      This section is approved and locked. Any changes will constitute a protocol amendment 
                      requiring formal change control, regulatory notification, and ethics committee review per 
                      ISO 14155:2020 § 6.11 and EU MDR Article 75.
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      <div className="text-xs text-slate-500 flex-1">
                        <strong>Locked by:</strong> {section.approver} on {section.updated}
                      </div>
                      <button 
                        onClick={() => setShowAmendmentWarning(true)}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded transition-colors"
                      >
                        Initiate Amendment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. WHAT THIS SECTION MUST INCLUDE (GUIDANCE) */}
            <div className={`border-2 rounded ${guidanceExpanded ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-slate-50'}`}>
              <button
                onClick={() => setGuidanceExpanded(!guidanceExpanded)}
                className={`w-full p-4 text-left transition-colors ${guidanceExpanded ? 'hover:bg-slate-200' : 'hover:bg-slate-100'}`}
              >
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${guidanceExpanded ? 'text-slate-600' : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">
                        What this section must include
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 ${guidanceExpanded ? 'text-slate-600' : 'text-slate-400'} transition-transform ${guidanceExpanded ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {!guidanceExpanded && (
                      <div className="text-xs text-slate-500 mt-1">
                        Click to view regulatory requirements and common pitfalls
                      </div>
                    )}
                  </div>
                </div>
              </button>
              
              {guidanceExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="p-3 bg-white border border-slate-200 rounded">
                    {getSectionGuidance(section.id, targetMarkets, deviceCategory)}
                  </div>

                  {/* Common Pitfalls */}
                  <div className="p-3 bg-white border border-slate-200 rounded">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs font-medium text-slate-900">Common pitfalls</div>
                    </div>
                    {getSectionPitfalls(section.id, targetMarkets, deviceCategory)}
                  </div>

                  {/* Amendment Info - Only shown if section is approved or locked */}
                  {(isApproved || section.locked) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900 mb-1">
                            {section.locked ? 'Locked Section' : 'Approved Section'}
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            Changes require formal amendment per ISO 14155:2020 § 6.11
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ISSUES / ERRORS AREA - System Controlled, Non-Editable */}
            {/* In AUTHORING mode: blockers always shown, warnings collapsible. In REVIEW mode: all expanded */}
            {openIssues.length > 0 && (
              <div ref={issuesRef} className="space-y-2">
                {/* Issues toggle row — subtle, full-width clickable */}
                <button
                  onClick={() => setIssuesExpanded(v => !v)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {blockerCount > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{color: '#991b1b'}}>
                        <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                        {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {blockerCount > 0 && warningCount > 0 && (
                      <span className="text-slate-300 text-xs select-none">·</span>
                    )}
                    {warningCount > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        {warningCount} Warning{warningCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${issuesExpanded ? '' : '-rotate-90'}`}
                  />
                </button>

                {/* Issue cards */}
                {openIssues.map((issue) => {
                  const isBlockerIssue = issue.severity === 'blocker';
                  const showCard = issuesExpanded;
                  if (!showCard) return null;
                  return (
                    <div
                      key={issue.id}
                      className={`border-l-4 rounded p-3 ${isBlockerIssue ? 'bg-rose-50 border-rose-500' : 'bg-amber-50 border-amber-500'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${isBlockerIssue ? 'bg-rose-50' : 'bg-amber-100 text-amber-800'}`} style={isBlockerIssue ? {color: '#991b1b'} : undefined}>
                          {issue.severity}
                        </span>
                        {issue.raisedBy?.toLowerCase().includes('system') && (
                          <span className="text-xs text-slate-500">AI Regulatory Review</span>
                        )}
                        <span className="text-xs font-medium text-slate-900">{issue.subsection}</span>
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
                        {onWontFix && (
                          <button
                            onClick={() => { setWontFixModal(issue.id); setWontFixComment(''); }}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-2"
                          >
                            Won't fix
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Re-analyzing banner */}
            {isAnalyzing && (
              <div style={{padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#1d4ed8'}}>
                Re-analyzing section for issues...
              </div>
            )}

            {/* 6. PROTOCOL CONTENT (EDITABLE) - Clearly Separated */}
            <ProtocolTextSeparator>
              {section.content ? (() => {
                if (isEditing) {
                  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: '#475569', flexShrink: 0 };
                  const btnActive: React.CSSProperties = { ...btnBase, backgroundColor: '#e2e8f0' };
                  const divider = <div style={{ width: 1, height: 20, backgroundColor: '#d1d5db', margin: '0 4px', flexShrink: 0 }} />;
                  return (
                    <div>
                      {/* ── Toolbar ── */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: '4px 6px', backgroundColor: '#f8fafc', borderRadius: '0.375rem 0.375rem 0 0', border: '2px solid #3b82f6', borderBottom: '1px solid #e2e8f0' }}>
                        {/* Text formatting group */}
                        <button title="Bold" style={activeFormats.has('bold') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('bold')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleBold}><Bold size={13} /></button>
                        <button title="Italic" style={activeFormats.has('italic') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('italic')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleItalic}><Italic size={13} /></button>
                        <button title="Underline" style={activeFormats.has('underline') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('underline')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleUnderline}><Underline size={13} /></button>
                        {divider}
                        {/* Heading group */}
                        <button title="Heading 1" style={activeFormats.has('h1') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('h1')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleH1}><Heading1 size={13} /></button>
                        <button title="Heading 2" style={activeFormats.has('h2') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('h2')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleH2}><Heading2 size={13} /></button>
                        <button title="Normal text" style={activeFormats.has('normal') ? btnActive : btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => { if (!activeFormats.has('normal')) e.currentTarget.style.backgroundColor = 'transparent'; }} onClick={handleNormal}><Type size={13} /></button>
                        {divider}
                        {/* Insert group */}
                        <button title="Insert table" style={btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')} onClick={handleInsertTable}><Table2 size={13} /></button>
                        <button title="Insert image" style={btnBase} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')} onClick={handleImageInsert}><Image size={13} /></button>
                        {attachments.length > 0 && (
                          <select
                            aria-label="Insert protocol attachment reference"
                            defaultValue=""
                            onMouseDown={rememberEditorSelection}
                            onChange={(event) => {
                              const appendixNumber = Number(event.target.value);
                              if (appendixNumber) insertAttachmentReference(appendixNumber);
                              event.target.value = '';
                            }}
                            style={{ height: 28, maxWidth: 240, border: '1px solid #cbd5e1', borderRadius: 4, backgroundColor: 'white', color: '#475569', fontSize: 12, padding: '0 6px' }}
                          >
                            <option value="">Insert attachment reference…</option>
                            {attachments.map((attachment) => (
                              <option key={attachment.id} value={attachment.appendixNumber}>
                                Appendix {attachment.appendixNumber}: {attachment.filename}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {/* ── WYSIWYG contentEditable editor ── */}
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        onSelect={updateActiveFormats}
                        onBlur={rememberEditorSelection}
                        style={{ width: '100%', minHeight: '200px', fontSize: '0.9rem', lineHeight: '1.7', padding: '0.75rem', border: '2px solid #3b82f6', borderTop: 'none', borderRadius: '0 0 0.375rem 0.375rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', overflowY: 'auto' }}
                      />
                      {/* ── Save / Cancel ── */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={() => { setChangeReason(''); setShowReasonModal(true); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>Save</button>
                        <button onClick={() => setIsEditing(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                      </div>
                    </div>
                  );
                }
                const issues = section.issues || [];
                const quotes = issues.filter((iss: any) => iss.textQuote);
                const editButton = (
                  <div key="edit-button" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem'}}>
                    <button onClick={() => setIsEditing(true)} style={{padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', color: '#374151'}}>Edit</button>
                  </div>
                );
                if (quotes.length === 0) return (
                  <div>
                    {editButton}
                    <div style={{lineHeight: '1.7', fontSize: '0.9rem'}} dangerouslySetInnerHTML={{__html: renderContent(section.content || '')}} />
                  </div>
                );
                // Quotes path: render markdown in plain text segments, highlight quoted spans
                const quoteParts: React.ReactNode[] = [editButton];
                console.log('quotes path - section content first 300:', (section.content || '').substring(0, 300));
                let remaining = section.content || '';
                quotes.forEach((iss: any) => {
                  const idx = remaining.indexOf(iss.textQuote);
                  if (idx === -1) return;
                  if (idx > 0) quoteParts.push(
                    <span key={`pre-${iss.id}`} dangerouslySetInnerHTML={{__html: renderContent(remaining.slice(0, idx))}} />
                  );
                  quoteParts.push(
                    <span
                      key={iss.id}
                      id={'quote-' + iss.id}
                      style={{
                        backgroundColor: iss.severity === 'blocker' ? '#fee2e2' : '#fef9c3',
                        borderBottom: iss.severity === 'blocker' ? '2px solid #ef4444' : '2px solid #f59e0b',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        padding: '0 2px'
                      }}
                      title={iss.description}
                    >{iss.textQuote}</span>
                  );
                  remaining = remaining.slice(idx + iss.textQuote.length);
                });
                if (remaining) quoteParts.push(
                  <span key="post" dangerouslySetInnerHTML={{__html: renderContent(remaining)}} />
                );
                console.log('quotes path rendering, quoteParts count:', quoteParts.length);
                return <div style={{lineHeight: '1.7', fontSize: '0.9rem'}}>{quoteParts}</div>;
              })() : getSectionContent(section.id, section.aiGenerated, section.issues || [])}
            </ProtocolTextSeparator>

            {/* 7. SECTION ACTIONS */}
            {/* In REVIEW mode: emphasize review actions. In AUTHORING mode: standard edit actions */}
            <div className={`flex items-center justify-between pt-4 border-t ${isReviewMode ? 'border-blue-200' : 'border-slate-200'}`}>
              <div className="text-xs text-slate-500">
                {isReviewMode 
                  ? 'Review mode active • Focus on issues and completeness'
                  : `${section.ownerRole || 'Owner'} can edit content • Reviewers can comment and raise issues`
                }
              </div>
              <div className="flex items-center gap-2">
                {isReviewMode ? (
                  <>
                    {section.locked && (
                      <button className="px-4 py-2 border-2 border-amber-400 bg-amber-50 text-amber-900 text-sm rounded hover:bg-amber-100 transition-colors font-medium">
                        Request Changes
                      </button>
                    )}
                    {isApproved ? (
                      <button
                        onClick={() => setShowUnlockConfirm(true)}
                        className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded hover:bg-slate-50 transition-colors font-medium flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Unlock Section
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Section
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {section.locked && (
                      <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors">
                        Request Changes
                      </button>
                    )}
                    {isApproved ? (
                      <button
                        onClick={() => setShowUnlockConfirm(true)}
                        className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Unlock Section
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Section
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Reason for Change Modal */}
      {showReasonModal && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div style={{backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
            <h2 style={{margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a'}}>Reason for change</h2>
            <p style={{margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b'}}>
              Describe why this section is being changed. This will be saved in the audit trail.
            </p>
            <textarea
              autoFocus
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Updated inclusion criteria based on updated regulatory guidance"
              style={{width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => setShowReasonModal(false)}
                style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
              >
                Cancel
              </button>
              <button
                disabled={!changeReason.trim() || isSaving}
                onClick={async () => {
                  const prevContent = section.content || '';
                  const newContent = editorRef.current?.innerHTML || '';
                  const reason = changeReason.trim();
                  // Close the modal and editing state immediately for responsive UX
                  setIsSaving(true);
                  setShowReasonModal(false);
                  setIsEditing(false);
                  // Delegate persist + audit to the parent — it owns user context and
                  // is the single source of truth for every content-change audit entry.
                  if (onSaved) {
                    setIsAnalyzing(true);
                    try {
                      await onSaved(newContent, prevContent, reason);
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }
                  setIsSaving(false);
                }}
                style={{padding: '0.5rem 1rem', backgroundColor: changeReason.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: changeReason.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500}}
              >
                {isSaving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Section Modal ─────────────────────────────────────────────── */}
      <AlertDialog
        open={showApproveModal}
        onOpenChange={(open) => { if (!approveLoading) { setShowApproveModal(open); if (!open) setApproveComment(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Section</AlertDialogTitle>
            <AlertDialogDescription>
              Section {section.number}: {section.title}. Approving marks this section as
              reviewed and compliant. Add an optional comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            autoFocus
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder="Optional approval comment (e.g. Reviewed against ISO 14155:2020 §6.3, content verified)"
            style={{width: '100%', minHeight: '80px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveLoading}
              onClick={async (e) => {
                e.preventDefault(); // keep the dialog open until the async approval settles
                if (!onApprove) return;
                setApproveLoading(true);
                try { await onApprove(approveComment.trim()); }
                finally { setApproveLoading(false); setShowApproveModal(false); setApproveComment(''); }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {approveLoading ? 'Approving…' : 'Approve Section'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Unlock Section Confirmation ────────────────────────────────────── */}
      <AlertDialog
        open={showUnlockConfirm}
        onOpenChange={(open) => { if (!unlockLoading) { setShowUnlockConfirm(open); if (!open) setUnlockReason(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Section</AlertDialogTitle>
            <AlertDialogDescription>
              Unlocking Section {section.number}: {section.title} will clear the approval and
              require re-approval after editing. This action is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem'}}>
            Reason for unlocking <span style={{color: '#ef4444'}}>*</span>
          </label>
          <textarea
            autoFocus
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="e.g. Updated regulatory guidance requires revision to inclusion criteria"
            style={{width: '100%', minHeight: '80px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlockLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!unlockReason.trim() || unlockLoading}
              onClick={async (e) => {
                e.preventDefault(); // keep the dialog open until the async unlock settles
                if (!onUnlock || !unlockReason.trim()) return;
                setUnlockLoading(true);
                try { await onUnlock(unlockReason.trim()); }
                finally { setUnlockLoading(false); setShowUnlockConfirm(false); setUnlockReason(''); }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {unlockLoading ? 'Unlocking…' : 'Unlock Section'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              style={{width: '100%', minHeight: '100px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => { setWontFixModal(null); setWontFixComment(''); }}
                style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
              >
                Cancel
              </button>
              <button
                disabled={!wontFixComment.trim()}
                onClick={() => {
                  if (onWontFix && wontFixModal) {
                    onWontFix(wontFixModal, wontFixComment.trim());
                  }
                  setWontFixModal(null);
                  setWontFixComment('');
                }}
                style={{padding: '0.5rem 1rem', backgroundColor: wontFixComment.trim() ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: wontFixComment.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500}}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={auditTrailOpen}
        onClose={() => setAuditTrailOpen(false)}
        sectionNumber={section.number}
        sectionTitle={section.title}
        entries={getSectionAuditTrail(section.id)}
      />

      {/* Comments Modal */}
      <CommentsModal
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        sectionNumber={section.number}
        sectionTitle={section.title}
        comments={comments}
        onAddComment={onAddComment}
        onResolveComment={onResolveComment}
      />

      {/* Amendment Warning Modal */}
      {showAmendmentWarning && (
        <AmendmentWarning
          sectionNumber={section.number}
          sectionTitle={section.title}
          lockedBy={section.approver}
          approvedDate={section.updated}
          onProceed={() => {
            setShowAmendmentWarning(false);
            console.log('Amendment initiated for section', section.number);
            // In production: Initiate amendment workflow with audit trail
          }}
          onCancel={() => setShowAmendmentWarning(false)}
        />
      )}
    </div>
  );
}

// Export with forwardRef to support ref forwarding
export const ProtocolSection = React.forwardRef<HTMLDivElement, ProtocolSectionProps>(ProtocolSectionComponent);

ProtocolSection.displayName = 'ProtocolSection';

function getSectionPurpose(sectionId: string): string {
  const purposes: Record<string, string> = {
    '1': 'Establish unique protocol identification and administrative accountability for regulatory traceability.',
    '2': 'Justify clinical need and define measurable objectives that drive study design and endpoint selection.',
    '3': 'Describe the investigational device, intended use, and clinical context to support risk-benefit assessment.',
    '4': 'Define study design and methodology appropriate to address stated objectives with scientific validity.',
    '5': 'Specify subject eligibility criteria that balance scientific objectives, safety, and enrollment feasibility.',
    '6': 'Detail all study procedures, assessments, and data collection to ensure protocol compliance and endpoint evaluation.',
    '7': 'Establish safety monitoring framework and adverse event management aligned with regulatory vigilance requirements.',
    '8': 'Define analysis approach and statistical considerations to support valid interpretation of study results.',
    '9': 'Document ethical principles, consent process, and regulatory compliance framework governing the investigation.',
  };
  return purposes[sectionId] || 'Define section content per regulatory requirements.';
}

function getSectionComments(sectionId: string) {
  // Example comments - in production, these would come from API
  const commentsData: Record<string, any[]> = {
    '1': [
      {
        id: 'c1',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 09:15 CET',
        content: 'Protocol title should include device commercial name per MDR requirements. Please revise to: "Clinical Investigation of the ValveTech TAVI System..."',
        type: 'issue',
        subsection: 'Protocol Title',
        status: 'open'
      },
      {
        id: 'c2',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-07 14:30 CET',
        content: 'Sponsor contact information is complete and complies with EU MDR Article 62 requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c3',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 11:20 CET',
        content: 'Please verify that the protocol identification code follows the sponsor\'s standard naming convention.',
        type: 'general',
        status: 'open'
      }
    ],
    '2': [
      {
        id: 'c2-1',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 13:45 CET',
        content: 'The clinical rationale section effectively establishes the medical need. Well done.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-2',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 10:30 CET',
        content: 'Primary objective needs to explicitly reference the 12-month timepoint.',
        type: 'issue',
        subsection: 'Primary Objective',
        status: 'open'
      },
      {
        id: 'c2-3',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-07 15:20 CET',
        content: 'Should we add a reference to recent PARTNER 3 trial data?',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-4',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 14:15 CET',
        content: 'Risk-benefit assessment is well structured and comprehensive.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-5',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-05 16:30 CET',
        content: 'Confirmed alignment with ISO 14155:2020 requirements for objectives.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-6',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-05 11:45 CET',
        content: 'Secondary objectives are clearly defined and measurable.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-7',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-04 09:20 CET',
        content: 'Literature review section provides solid scientific foundation.',
        type: 'general',
        status: 'open'
      }
    ],
    '3': [
      {
        id: 'c3-1',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-08 10:45 CET',
        content: 'Device classification rationale should be expanded to include explicit reference to Rule 8.',
        type: 'issue',
        subsection: 'Clinical Context',
        status: 'open'
      },
      {
        id: 'c3-2',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 13:30 CET',
        content: 'Device specifications are complete and accurate.',
        type: 'general',
        status: 'open'
      }
    ],
    '5': [
      {
        id: 'c5-1',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 11:20 CET',
        content: 'Critical concern: The inclusion/exclusion criteria appear too restrictive for the target sample size of N=120. Based on typical patient populations for this indication, we may struggle to enroll within the proposed 6-month timeline. Recommend either relaxing the eligibility criteria or extending the enrollment period to 9 months.',
        type: 'issue',
        subsection: 'Inclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-2',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 10:15 CET',
        content: 'Each exclusion criterion must include explicit justification per ISO 14155:2020 § 6.6.3. Current draft lists criteria but lacks rationale. Please add justification for each criterion (safety, scientific validity, or feasibility).',
        type: 'issue',
        subsection: 'Exclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-3',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 16:45 CET',
        content: 'I have updated the LVEF exclusion threshold from <25% to <30% to align with the device IFU contraindications. This ensures consistency with the approved intended use statement.',
        type: 'general',
        subsection: 'Exclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-4',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-06 13:20 CET',
        content: 'Confirmed: Age criterion of ≥65 years aligns with device intended use for elderly patients with intermediate surgical risk. No changes needed.',
        type: 'general',
        subsection: 'Inclusion Criteria',
        status: 'resolved',
        resolvedBy: 'Dr. Marcus Rivera',
        resolvedDate: '2026-02-07 09:00 CET'
      },
      {
        id: 'c5-5',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 09:45 CET',
        content: 'Please verify that contraindications align with the latest IFU version.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-6',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-05 14:30 CET',
        content: 'Screening procedures need to be detailed further.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-7',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-05 11:15 CET',
        content: 'Enrollment timeline appears aggressive - feasibility assessment needed.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-8',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-04 16:20 CET',
        content: 'Anatomical criteria are well-defined and measurable.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-9',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-04 10:50 CET',
        content: 'Inclusion criteria comply with MDR requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-10',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-03 15:30 CET',
        content: 'Consider adding comorbidity exclusions.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-11',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-03 09:15 CET',
        content: 'Subject eligibility documentation requirements should be specified.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-12',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-02 13:40 CET',
        content: 'Good progress on eligibility criteria definition.',
        type: 'general',
        status: 'open'
      }
    ],
    '6': [
      {
        id: 'c6-1',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 14:10 CET',
        content: 'Section 6.3 (Follow-up Schedule) references "clinical assessment at 6 months" but Section 4.8 (Primary Endpoint) specifies primary endpoint evaluation at 30 days. Please clarify if 6-month follow-up is for secondary endpoints only.',
        type: 'issue',
        subsection: 'Follow-up Schedule',
        status: 'open'
      },
      {
        id: 'c6-2',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 13:45 CET',
        content: 'Imaging assessment protocol should reference specific standardized endpoint definitions for consistency. Please add citation and independent imaging review requirements.',
        type: 'approval-request',
        subsection: 'Imaging Assessments',
        status: 'open'
      },
      {
        id: 'c6-3',
        author: 'Dr. Elena Kowalski',
        authorRole: 'Clinical Operations Lead',
        timestamp: '2026-02-08 10:30 CET',
        content: 'Visit windows need to be clearly defined for all timepoints.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-4',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-07 15:20 CET',
        content: 'Laboratory procedures are well documented.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-5',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 11:45 CET',
        content: 'Assessment schedule aligns with study objectives.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-6',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-06 14:30 CET',
        content: 'Procedure documentation meets ISO 14155 requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-7',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-06 09:15 CET',
        content: 'Clinical assessments are comprehensive and appropriate.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-8',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-05 16:50 CET',
        content: 'Good structure for study procedures section.',
        type: 'general',
        status: 'open'
      }
    ]
  };

  return commentsData[sectionId] || [];
}

function getSectionCompleteness(sectionId: string) {
  // Example completeness data - in production, this would be calculated from actual content analysis
  const completenessData: Record<string, any> = {
    '1': { complete: 8, partial: 0, missing: 0, total: 8 },
    '2': { complete: 4, partial: 1, missing: 0, total: 5 },
    '3': { complete: 6, partial: 0, missing: 1, total: 7 },
    '4': { complete: 5, partial: 2, missing: 1, total: 8 },
    '5': { complete: 5, partial: 1, missing: 2, total: 8 },
    '6': { complete: 7, partial: 2, missing: 3, total: 12 },
    '7': { complete: 8, partial: 1, missing: 1, total: 10 },
    '8': { complete: 6, partial: 0, missing: 0, total: 6 },
    '9': { complete: 9, partial: 1, missing: 0, total: 10 }
  };
  
  return completenessData[sectionId] || { complete: 0, partial: 0, missing: 0, total: 0 };
}

function getReferencedDocuments(sectionId: string, targetMarkets: string[] = [], deviceCategory: string = '') {
  // Example referenced documents - in production, this would come from API
  const allDocuments = [
    {
      id: 'rmf-001',
      title: 'Risk Management File - ValveTech TAVI System',
      type: 'risk-management' as const,
      version: '2.1',
      date: '2026-01-15',
      status: 'approved' as const,
      sections: ['3', '5', '6', '7']
    },
    {
      id: 'cer-001',
      title: 'Clinical Evaluation Report',
      type: 'clinical-evaluation' as const,
      version: '1.3',
      date: '2025-12-10',
      status: 'approved' as const,
      sections: ['2', '3', '4']
    },
    {
      id: 'ib-001',
      title: "Investigator's Brochure - ValveTech TAVI v3.2",
      type: 'investigators-brochure' as const,
      version: '3.2',
      date: '2026-01-20',
      status: 'approved' as const,
      sections: ['3', '5', '6', '7']
    },
    {
      id: 'ifu-001',
      title: 'Instructions for Use & Intended Purpose Statement',
      type: 'ifu' as const,
      version: '2.0',
      date: '2026-01-10',
      status: 'approved' as const,
      sections: ['3', '5']
    },
    {
      id: 'sap-001',
      title: 'Statistical Analysis Plan',
      type: 'sap' as const,
      version: '1.0-draft',
      date: '2026-02-01',
      status: 'draft' as const,
      sections: ['4', '8']
    },
    {
      id: 'pms-001',
      title: 'Post-Market Surveillance Plan',
      type: 'pms' as const,
      version: '1.1',
      date: '2025-11-30',
      status: 'approved' as const,
      sections: ['2', '9']
    }
  ];

  return allDocuments;
}

function getSectionGuidance(sectionId: string, targetMarkets: string[] = [], deviceCategory: string = '') {
  const isEU = targetMarkets.includes('EU');
  const isUS = targetMarkets.includes('US');
  const isUK = targetMarkets.includes('UK');
  const isJapan = targetMarkets.includes('Japan');
  const isChina = targetMarkets.includes('China');
  const isCanada = targetMarkets.includes('Canada');
  const isAustralia = targetMarkets.includes('Australia');
  const isSaMD = ['samd', 'SaMD', 'ai-ml', 'simd'].includes(deviceCategory);
  const isAIMD = ['aimd', 'AIMD'].includes(deviceCategory);
  const isIVD = ['ivd', 'IVD'].includes(deviceCategory);

  const guidance: Record<string, JSX.Element> = {
    '1': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.1</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Protocol title (full and abbreviated)</li>
          <li>Unique protocol identification code</li>
          <li>Protocol version and date</li>
          <li>Sponsor legal entity and regulatory contact</li>
          <li>Coordinating investigator (name, credentials, site affiliation)</li>
          <li>Study phase designation per EU MDR classification</li>
          <li>EudraCT or equivalent registry number</li>
          {isUS && <li>FDA 21 CFR 812.25(a) — Protocol identification requirements</li>}
          {isUK && <li>UK MDR 2002 — MHRA notification requirements</li>}
          {isJapan && <li>PMDA clinical trial notification (CTN) requirements</li>}
          {isEU && <li>EUDAMED registration required prior to study start per EU MDR Article 70</li>}
          {isUS && <li>ClinicalTrials.gov NCT number registration required per FDA Modernization Act</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: ClinicalTrials.gov registration, sponsor organization records, investigator site agreement
        </p>
      </>
    ),
    '2': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.3, 6.4</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Clinical background and unmet medical need</li>
          <li>Summary of existing evidence (clinical data, literature)</li>
          <li>Scientific rationale for the investigation</li>
          <li>Clear statement of primary objective (singular, measurable)</li>
          <li>Secondary objectives (exploratory, supporting)</li>
          <li>Alignment with device intended use and indications</li>
          {isUS && <li>FDA IDE success criteria and primary endpoint definition per 21 CFR 812.25(b)</li>}
          {isSaMD && <li>IMDRF SaMD N41 clinical evidence framework — intended use, clinical association, analytical validation</li>}
          {isJapan && <li>PMDA clinical rationale requirements for device clinical trials</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Synopsis objectives, endpoint definitions (Section 4.6), statistical analysis plan
        </p>
      </>
    ),
    '3': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.7 · MDR Annex XV</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Device description (design, materials, mechanism of action)</li>
          <li>Intended clinical use and target patient population</li>
          <li>Device classification and regulatory status</li>
          <li>Instructions for use and clinical administration</li>
          <li>Known or foreseeable risks</li>
          <li>Preclinical and prior clinical experience summary</li>
          {isSaMD && <li>SaMD definition per IMDRF N41 and software lifecycle per IEC 62304</li>}
          {isAIMD && <li>AIMD-specific requirements per ISO 14708 series</li>}
          {isIVD && <li>IVD performance evaluation per IVDR 2017/746</li>}
          {isUS && <li>FDA device classification and predicate device identification</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Instructions for Use (IFU), Clinical Evaluation Report, Investigator's Brochure
        </p>
      </>
    ),
    '4': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.5</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Study type (observational, interventional, randomized, etc.)</li>
          <li>Study design rationale (why this design addresses objectives)</li>
          <li>Number of sites and geographic scope</li>
          <li>Target enrollment and enrollment duration</li>
          <li>Randomization and stratification (if applicable)</li>
          <li>Blinding approach (subject, investigator, assessor)</li>
          <li>Study duration and follow-up schedule</li>
          {isUS && <li>Non-significant risk (NSR) or significant risk (SR) determination per 21 CFR 812.3(m)</li>}
          {isSaMD && <li>Algorithm lock date and version control per IEC 62304 and IMDRF N41</li>}
          {isJapan && <li>PMDA-specific study design requirements for medical device clinical trials</li>}
          {isChina && <li>NMPA clinical trial design — domestic data requirements</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Primary objective, endpoint timing, sample size justification
        </p>
      </>
    ),
    '5': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.6 · MDR Article 62(4)</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Inclusion criteria (population definition, disease characteristics)</li>
          <li>Exclusion criteria (safety, confounding factors, feasibility)</li>
          <li>Justification for each criterion</li>
          <li>Special population considerations (vulnerable subjects)</li>
          <li>Subject withdrawal and discontinuation rules</li>
          <li>Recruitment feasibility assessment</li>
          {isUS && <li>Vulnerable subject protection per 21 CFR 50 Subpart B and 21 CFR 56</li>}
          {isChina && <li>NMPA requirement for Chinese patient population representation</li>}
          {isJapan && <li>PMDA ethnic sensitivity — Japanese population subgroup requirements</li>}
          {isCanada && <li>Health Canada ICH E6(R2) GCP compliance for subject protection</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Device intended use, sample size target (Section 4.8), enrollment feasibility
        </p>
      </>
    ),
    '6': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.8</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Study flow diagram (screening through final follow-up)</li>
          <li>Screening and baseline assessments</li>
          <li>Index procedure or intervention specifications</li>
          <li>Follow-up visit schedule and assessment timing</li>
          <li>Clinical assessments, imaging, laboratory tests</li>
          <li>Endpoint measurement methods</li>
          <li>Source documentation and data collection forms</li>
          {isUS && <li>Visit schedule and assessment windows per 21 CFR 812.25(c)</li>}
          {isJapan && <li>PMDA GCP (MHLW Ordinance No. 169) procedure documentation</li>}
          {isAustralia && <li>TGA GCP requirements per TGA GCP guidance</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Endpoint definitions, assessment timing, statistical analysis windows
        </p>
      </>
    ),
    '7': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.12 · MDR Article 80-82</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Safety oversight structure (DSMB, safety committee)</li>
          <li>Definitions: AE, SAE, SADE, USADE, device deficiency</li>
          <li>Event assessment and causality determination</li>
          <li>Reporting timelines (sponsor, competent authority, ethics)</li>
          <li>Stopping rules and safety signals</li>
          <li>Post-market vigilance linkage</li>
          {isUS && <li>UADE reporting within 10 working days per 21 CFR 812.150(b)</li>}
          {isUS && <li>MDR (Medical Device Reporting) obligations per 21 CFR 803</li>}
          {isJapan && <li>PMDA safety reporting per MHLW Ministerial Ordinance</li>}
          {isChina && <li>NMPA adverse event reporting per Chinese medical device regulations</li>}
          {isUK && <li>MHRA vigilance reporting per UK MDR 2002 Schedule 8</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: EU MDR vigilance requirements, Sponsor SOPs, regulatory reporting obligations
        </p>
      </>
    ),
    '8': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.10 · ICH E9</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Analysis populations (ITT, mITT, per-protocol, safety)</li>
          <li>Primary endpoint analysis method</li>
          <li>Sample size justification with assumptions</li>
          <li>Statistical significance level and power</li>
          <li>Handling of missing data and dropouts</li>
          <li>Interim analysis plan (if applicable)</li>
          <li>Reference to detailed Statistical Analysis Plan (SAP)</li>
          {isUS && <li>FDA-compliant SAP per 21 CFR 812.25(h) — pre-specified before database lock</li>}
          {isJapan && <li>PMDA statistical requirements — Japanese regulatory SAP expectations</li>}
          {isSaMD && <li>Algorithm performance metrics — AUC, sensitivity/specificity, confidence intervals per IMDRF N41</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Primary objective, endpoint definitions, study design, enrollment target
        </p>
      </>
    ),
    '9': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.13 · MDR Article 62-63</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Ethical framework (Declaration of Helsinki, GCP)</li>
          <li>Informed consent process and documentation</li>
          <li>Ethics committee approval and ongoing reporting</li>
          <li>Competent authority authorization (EU MDR)</li>
          <li>Data protection and confidentiality (GDPR)</li>
          <li>Subject compensation for injury</li>
          <li>Protocol amendments and deviation management</li>
          {isUS && <li>FDA IDE application or NSR determination per 21 CFR 812.2</li>}
          {isUK && <li>MHRA notification and UK ethics committee approval</li>}
          {isJapan && <li>PMDA pre-submission meeting and ethics review</li>}
          {isChina && <li>NMPA clinical trial approval</li>}
          {isCanada && <li>Health Canada clinical trial application (CTA)</li>}
          {isAustralia && <li>TGA clinical trial notification (CTN) or approval (CTA)</li>}
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Local regulatory requirements, institutional policies, data management plan
        </p>
      </>
    ),
  };

  return guidance[sectionId] || null;
}

function getSectionPitfalls(sectionId: string, targetMarkets: string[] = [], deviceCategory: string = '') {
  const pitfalls: Record<string, JSX.Element> = {
    '1': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Protocol ID does not match sponsor numbering convention</li>
        <li>Coordinating PI credentials incomplete or unverifiable</li>
        <li>EudraCT number not yet obtained (delays submission)</li>
      </ul>
    ),
    '2': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Objectives vague or not measurable ("assess feasibility" without criteria)</li>
        <li>Primary objective misaligned with primary endpoint</li>
        <li>Rationale does not address known device risks or limitations</li>
        <li>Insufficient prior evidence to justify investigation</li>
      </ul>
    ),
    '3': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Device description conflicts with IFU or regulatory dossier</li>
        <li>Intended use broader than supported by preclinical data</li>
        <li>Known risks omitted or understated</li>
        <li>Device classification incorrect or not substantiated</li>
      </ul>
    ),
    '4': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Design inappropriate for primary objective (e.g., single-arm for superiority claim)</li>
        <li>Follow-up duration shorter than endpoint assessment window</li>
        <li>No justification for control group selection</li>
        <li>Site number unrealistic for enrollment target and timeline</li>
      </ul>
    ),
    '5': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Criteria too restrictive (enrollment infeasible within study timeline)</li>
        <li>Criteria too broad (heterogeneous population, confounded analysis)</li>
        <li>Exclusions omit contraindications from device IFU</li>
        <li>No feasibility assessment of target population prevalence</li>
      </ul>
    ),
    '6': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Assessment timing does not match endpoint definition windows</li>
        <li>Endpoint measurement methods not validated or standardized</li>
        <li>Missing procedures required for safety monitoring</li>
        <li>Source documentation requirements undefined</li>
      </ul>
    ),
    '7': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Reporting timelines conflict with regulatory requirements</li>
        <li>DSMB charter missing or not referenced</li>
        <li>Causality assessment criteria not defined</li>
        <li>No process for USADE determination</li>
      </ul>
    ),
    '8': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Sample size assumptions unrealistic (event rate, dropout rate)</li>
        <li>Analysis method inappropriate for data type (non-normal distribution)</li>
        <li>Missing data handling not specified</li>
        <li>No SAP reference or finalization timeline</li>
      </ul>
    ),
    '9': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Consent form not approved by local ethics committee</li>
        <li>GDPR compliance not addressed for cross-border data transfer</li>
        <li>Amendment process not defined</li>
        <li>Subject compensation for injury not specified or insufficient</li>
      </ul>
    ),
  };

  return pitfalls[sectionId] || null;
}

function getSectionContent(sectionId: string, aiGenerated: boolean, issues: ProtocolIssue[]) {
  return (
    <div className="text-xs text-slate-500 border border-dashed border-slate-300 rounded p-4 bg-slate-50 text-center">
      Content not yet generated. Click Generate to create this section.
    </div>
  );
}

function getSectionAuditTrail(sectionId: string): Array<{
  timestamp: string;
  timezone: string;
  user: string;
  userRole: string;
  action: string;
  affectedElement: string;
  details?: string;
  aiAssisted?: boolean;
}> {
  const auditTrails: Record<string, any[]> = {
    '1': [
      {
        timestamp: '2026-02-05 14:32:18',
        timezone: 'CET',
        user: 'Dr. Helena Schmidt',
        userRole: 'VP Clinical Affairs',
        action: 'Section locked for regulatory submission',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Section locked after final approval. Further changes require formal amendment process per protocol change control.',
      },
      {
        timestamp: '2026-02-05 14:30:45',
        timezone: 'CET',
        user: 'Dr. Helena Schmidt',
        userRole: 'VP Clinical Affairs',
        action: 'Section approved',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Final approval granted for Review Cycle 3. All protocol identifiers verified against sponsor records and registry.',
      },
      {
        timestamp: '2026-02-04 16:20:33',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'EudraCT Number',
        details: 'Confirmed EudraCT number 2026-000547-19 obtained from EU Clinical Trials Register. Status updated from "pending" to confirmed.',
      },
      {
        timestamp: '2026-02-04 11:15:22',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Protocol Version & Date',
        details: 'Version updated from 1.2 to 1.3 following incorporation of review comments from Cycle 2.',
      },
      {
        timestamp: '2026-02-03 09:45:10',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Coordinating Investigator',
        details: 'Added full institutional affiliation and contact details for Prof. Dr. Andreas Müller.',
      },
      {
        timestamp: '2026-02-01 10:30:05',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Section created',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Initial section created with administrative identifiers, sponsor information, and coordinating investigator details.',
        aiAssisted: false,
      },
    ],
    '2': [
      {
        timestamp: '2026-02-06 10:30:12',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Warning issue raised',
        affectedElement: 'Primary Objective',
        details: 'Primary objective statement should explicitly reference the 12-month timepoint to align with Section 4.8.',
      },
      {
        timestamp: '2026-02-05 16:18:45',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Primary Objective',
        details: 'Refined primary objective wording to clarify non-inferiority hypothesis and comparator device.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 15:50:22',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'Scientific Rationale',
        details: 'Rationale section appropriately addresses device design features and expected clinical benefits. Preclinical data adequately summarized.',
      },
      {
        timestamp: '2026-02-05 11:20:33',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Clinical Background',
        details: 'Expanded background with current device performance data and unmet clinical needs.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-03 14:15:08',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.2 (entire)',
        details: 'AI-generated initial draft based on device preclinical data, literature review, and regulatory templates. Content requires human review and approval.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-03 14:10:00',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Section created',
        affectedElement: 'Section 4.2 (entire)',
        details: 'Section initialized for rationale and objectives content development.',
      },
    ],
    '3': [
      {
        timestamp: '2026-02-06 12:15:40',
        timezone: 'CET',
        user: 'System Validation',
        userRole: 'Automated Consistency Check',
        action: 'Warning issue raised',
        affectedElement: 'Clinical Context & User Environment',
        details: 'Device classification rationale should be expanded with explicit reference to Rule 8 criteria.',
      },
      {
        timestamp: '2026-02-06 09:45:18',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Device Description',
        details: 'Added detailed specifications for sealing skirt geometry and repositioning mechanism.',
      },
      {
        timestamp: '2026-02-06 08:30:55',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'Intended Clinical Use',
        details: 'Intended use statement aligns with Synopsis and device IFU. Anatomical eligibility criteria appropriately restrictive.',
      },
      {
        timestamp: '2026-02-04 16:45:33',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Intended Clinical Use',
        details: 'Clarified target patient population and anatomical requirements for transfemoral delivery.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-04 10:20:12',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.3 (entire)',
        details: 'AI-generated device description based on technical documentation, IFU, and regulatory classification records.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-04 10:15:00',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Section created',
        affectedElement: 'Section 4.3 (entire)',
        details: 'Section initialized for device description and clinical use documentation.',
      },
    ],
    '5': [
      {
        timestamp: '2026-02-07 14:20:55',
        timezone: 'CET',
        user: 'System Consistency Check',
        userRole: 'Cross-Section Validator',
        action: 'Blocker issue raised',
        affectedElement: 'Inclusion Criteria & Sample Size Alignment',
        details: 'Enrollment feasibility concern: Current criteria may not support N=120 target within 6-month timeline.',
      },
      {
        timestamp: '2026-02-07 15:45:20',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Issue raised',
        affectedElement: 'Exclusion Criteria',
        details: 'LVEF <30% threshold should be cross-referenced with device IFU contraindications.',
      },
      {
        timestamp: '2026-02-07 13:55:30',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Inclusion Criteria',
        details: 'Added Heart Team consensus requirement and life expectancy criterion.',
        aiAssisted: false,
      },
      {
        timestamp: '2026-02-07 11:20:18',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Exclusion Criteria',
        details: 'Expanded exclusion criteria to include valve morphology, cardiac contraindications, and comorbidities.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 09:30:45',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.5 (entire)',
        details: 'AI-generated eligibility criteria based on device intended use, anatomical constraints from Section 4.3, and comparable studies.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 09:25:00',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Section created',
        affectedElement: 'Section 4.5 (entire)',
        details: 'Section initialized for subject eligibility criteria definition.',
      },
    ],
    '6': [
      {
        timestamp: '2026-02-07 17:30:10',
        timezone: 'CET',
        user: 'System Consistency Check',
        userRole: 'Cross-Section Validator',
        action: 'Blocker issue raised',
        affectedElement: 'Assessment Timing & Endpoint Windows',
        details: 'Primary endpoint assessment window not specified. Define visit window for 12-month primary endpoint.',
      },
      {
        timestamp: '2026-02-07 16:10:42',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Content updated',
        affectedElement: 'Imaging & Endpoint Measurements',
        details: 'Added independent imaging review requirement and standardized grading criteria.',
      },
      {
        timestamp: '2026-02-07 14:35:28',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Content updated',
        affectedElement: 'Study Flow',
        details: 'Defined screening window, visit schedule, and follow-up timepoints.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-06 16:20:15',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.6 (entire)',
        details: 'AI-generated procedures and assessments based on applicable clinical standards and endpoint requirements from Section 4.2.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-06 16:15:00',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Section created',
        affectedElement: 'Section 4.6 (entire)',
        details: 'Section initialized for study procedures and clinical assessments documentation.',
      },
    ],
  };

  return auditTrails[sectionId] || [
    {
      timestamp: '2026-02-01 10:00:00',
      timezone: 'CET',
      user: 'Dr. Sarah Chen',
      userRole: 'Principal Investigator',
      action: 'Section created',
      affectedElement: `Section ${sectionId} (entire)`,
      details: 'Section initialized for protocol development.',
    },
  ];
}
