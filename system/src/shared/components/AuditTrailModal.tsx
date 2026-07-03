import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { AuditEvent } from '@/shared/workflow/audit';
import type { WorkflowStepId } from '@/shared/workflow/types';
import { WORKFLOW_STEPS } from '@/shared/workflow/steps';
import { useParams } from 'react-router-dom';
import { listProjectAuditEvents } from '@/shared/services/auditService';
import {
  FileEdit, Users, Settings2, Sparkles, ArrowRightLeft, ShieldCheck,
  MessageSquare, Eye, Activity, ChevronRight, Clock, User as UserIcon,
  Tag, FileText, RefreshCw, AlertCircle, CheckCircle2, X,
} from 'lucide-react';

// ── Event type config ──────────────────────────────────────────────────────────

type EventConfig = { Icon: React.ElementType; iconBg: string; iconColor: string; label: string };

function getEventConfig(type: string): EventConfig {
  const map: Record<string, EventConfig> = {
    'section.content.updated':   { Icon: FileEdit,        iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    label: 'Content updated'    },
    'project.roles.updated':     { Icon: Users,           iconBg: 'bg-purple-100',  iconColor: 'text-purple-600',  label: 'Roles updated'      },
    'project.setup.completed':   { Icon: Settings2,       iconBg: 'bg-slate-100',   iconColor: 'text-slate-600',   label: 'Setup completed'    },
    'protocol.generated':        { Icon: Sparkles,        iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   label: 'Protocol generated' },
    lifecycle_transition:        { Icon: ArrowRightLeft,  iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', label: 'Status change'      },
    risk_accepted:               { Icon: ShieldCheck,     iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  label: 'Risk accepted'      },
    changes_requested:           { Icon: MessageSquare,   iconBg: 'bg-rose-50',     iconColor: 'text-rose-700',     label: 'Changes requested'  },
    note:                        { Icon: FileText,        iconBg: 'bg-slate-100',   iconColor: 'text-slate-500',   label: 'Note'               },
    viewed:                      { Icon: Eye,             iconBg: 'bg-slate-50',    iconColor: 'text-slate-400',   label: 'Viewed'             },
  };
  return map[type] ?? { Icon: Activity, iconBg: 'bg-slate-100', iconColor: 'text-slate-500', label: type };
}

function getStepBadgeStyle(stepId: string): string {
  const domain = WORKFLOW_STEPS.find(s => s.id === stepId)?.domain ?? 'project';
  if (domain === 'protocol') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (domain === 'report')   return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('sv-SE'),
    time: d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
  };
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

// ── Word-level diff ────────────────────────────────────────────────────────────

/**
 * LCS-based word diff — respects word order and position so that moved or
 * repeated words are correctly flagged as removed/added rather than ignored.
 *
 * Algorithm:
 *   1. Split each text into tokens (words + whitespace) preserving spacing.
 *   2. Build the LCS DP table over the word-only tokens.
 *   3. Backtrack to mark which words are in the common subsequence (unchanged).
 *   4. Render: unchanged → plain, removed → red + strikethrough, added → green.
 */
function wordDiff(before: string, after: string) {
  // Split into alternating [word, whitespace, word, …] tokens
  const bTokens = before.split(/(\s+)/);
  const aTokens = after.split(/(\s+)/);

  // Word-only arrays (indices into bTokens/aTokens minus whitespace positions)
  const bWords = bTokens.filter(t => t.trim());
  const aWords = aTokens.filter(t => t.trim());
  const m = bWords.length, n = aWords.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = bWords[i - 1] === aWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Backtrack — mark words that are part of the LCS (unchanged)
  const bInLCS = new Array(m).fill(false);
  const aInLCS = new Array(n).fill(false);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (bWords[i - 1] === aWords[j - 1]) {
      bInLCS[i - 1] = true;
      aInLCS[j - 1] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // Render Before: removed words get red + strikethrough
  let bWordIdx = 0;
  const beforeEl = bTokens.map((token, idx) => {
    if (!token.trim()) return <span key={idx}>{token}</span>;
    const unchanged = bInLCS[bWordIdx++];
    return unchanged
      ? <span key={idx}>{token}</span>
      : <mark key={idx} className="bg-rose-50 text-rose-800 line-through decoration-red-400 rounded-sm px-0.5">{token}</mark>;
  });

  // Render After: added words get green highlight
  let aWordIdx = 0;
  const afterEl = aTokens.map((token, idx) => {
    if (!token.trim()) return <span key={idx}>{token}</span>;
    const unchanged = aInLCS[aWordIdx++];
    return unchanged
      ? <span key={idx}>{token}</span>
      : <mark key={idx} className="bg-emerald-100 text-emerald-800 rounded-sm px-0.5 font-medium">{token}</mark>;
  });

  return { beforeEl, afterEl };
}

function netWordChange(before: string, after: string): string {
  const b = before.trim().split(/\s+/).filter(Boolean).length;
  const a = after.trim().split(/\s+/).filter(Boolean).length;
  const diff = a - b;
  if (diff === 0) return 'No length change';
  return diff > 0 ? `+${diff} words` : `${diff} words`;
}

// ── Unified modal ─────────────────────────────────────────────────────────────

export function AuditTrailModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projectId } = useParams();
  const [events, setEvents]               = useState<AuditEvent[]>([]);
  const [loading, setLoading]             = useState(false);
  const [stepFilter, setStepFilter]       = useState<WorkflowStepId | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  async function load() {
    setLoading(true);
    try {
      if (!projectId) { setEvents([]); return; }
      const data = await listProjectAuditEvents(projectId);
      setEvents([...data].sort((a, b) => (a.at < b.at ? 1 : -1)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (props.open) void load(); }, [props.open]);

  // Escape: close detail view first, then close the whole modal
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedEvent) setSelectedEvent(null);
      else props.onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props.open, selectedEvent]);

  const filtered = useMemo(() => {
    if (stepFilter === 'all') return events;
    return events.filter(e => e.stepId === stepFilter);
  }, [events, stepFilter]);

  // ── Derived detail-view data (safe to compute even when selectedEvent is null) ──
  const detailConfig    = getEventConfig((selectedEvent?.type ?? '') as string);
  const DetailIcon      = detailConfig.Icon;
  const detailStep      = WORKFLOW_STEPS.find(s => s.id === selectedEvent?.stepId);
  const detailDt        = selectedEvent ? formatDateTime(selectedEvent.at) : null;
  const detailParts     = selectedEvent?.details?.split('|||AFTER|||') ?? [];
  const detailBefore    = detailParts[0] ? detailParts[0].replace('|||BEFORE|||', '').trim() : '';
  const detailAfter     = detailParts[1] ? detailParts[1].trim() : '';
  const detailIdentical = Boolean(detailBefore && detailAfter && detailBefore === detailAfter);
  const detailHasDiff   = Boolean(detailBefore && detailAfter && detailBefore !== detailAfter);
  const detailDiff      = detailHasDiff ? wordDiff(detailBefore, detailAfter) : null;
  const detailChange    = detailHasDiff ? netWordChange(detailBefore, detailAfter) : null;
  const detailChangePos = detailChange?.startsWith('+');
  const detailChangeNeu = detailChange === 'No length change';

  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => { setSelectedEvent(null); props.onOpenChange(false); }}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header (always visible, never scrolls) ── */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200">
          {selectedEvent ? (
            /* Detail header */
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                title="Back to list"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${detailConfig.iconBg}`}>
                <DetailIcon size={15} className={detailConfig.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-widest ${detailConfig.iconColor}`}>
                  {detailConfig.label}
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">{selectedEvent.summary}</div>
              </div>
              <button
                onClick={() => props.onOpenChange(false)}
                className="flex-shrink-0 text-slate-300 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* List header */
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Audit Trail</h2>
                  {events.length > 0 && (
                    <span className="text-xs text-slate-400 font-normal">{events.length} events</span>
                  )}
                </div>
              </div>
              <div className="w-44 flex-shrink-0">
                <Select value={stepFilter} onValueChange={v => setStepFilter(v as WorkflowStepId | 'all')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All steps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All steps</SelectItem>
                    {WORKFLOW_STEPS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs flex-shrink-0"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Loading…' : 'Refresh'}
              </Button>
              <button
                onClick={() => props.onOpenChange(false)}
                className="flex-shrink-0 text-slate-300 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        {selectedEvent ? (

          /* Detail view */
          <div className="flex-1 overflow-y-auto p-4">

            {/* Metadata strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pb-4 mb-4 border-b border-slate-100 text-xs">
              <div>
                <div className="flex items-center gap-1 text-slate-400 mb-1.5">
                  <Clock size={10} strokeWidth={2.5} />
                  <span className="font-medium uppercase tracking-wide text-[10px]">Date &amp; Time</span>
                </div>
                <div className="font-semibold text-slate-800">{detailDt?.date}</div>
                <div className="text-slate-500">{detailDt?.time}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-slate-400 mb-1.5">
                  <UserIcon size={10} strokeWidth={2.5} />
                  <span className="font-medium uppercase tracking-wide text-[10px]">Actor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {getInitials(selectedEvent.actor?.name ?? 'Unknown')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{selectedEvent.actor?.name ?? 'Unknown'}</div>
                    {selectedEvent.actor?.role && (
                      <div className="text-[10px] text-slate-400 truncate">{selectedEvent.actor.role}</div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-slate-400 mb-1.5">
                  <Tag size={10} strokeWidth={2.5} />
                  <span className="font-medium uppercase tracking-wide text-[10px]">Step</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded border font-medium text-[11px] ${getStepBadgeStyle(selectedEvent.stepId as string)}`}>
                  {detailStep?.label ?? selectedEvent.stepId ?? '—'}
                </span>
                {selectedEvent.sectionTitle && (
                  <div className="text-[10px] text-slate-400 mt-1 truncate" title={selectedEvent.sectionTitle}>
                    {selectedEvent.sectionTitle}
                  </div>
                )}
              </div>
              {(selectedEvent.reason || detailHasDiff) && (
                <div>
                  {selectedEvent.reason ? (
                    <>
                      <div className="text-slate-400 mb-1.5 font-medium uppercase tracking-wide text-[10px]">Reason for change</div>
                      <div className="font-medium text-slate-800 leading-snug">{selectedEvent.reason}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-slate-400 mb-1.5 font-medium uppercase tracking-wide text-[10px]">Net change</div>
                      <div className={`font-bold ${detailChangePos ? 'text-emerald-700' : detailChangeNeu ? 'text-slate-500' : 'text-rose-700'}`}>
                        {detailChange}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Diff / details */}
            {detailDiff ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 border-b-0 rounded-t-lg">
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Before</span>
                  </div>
                  <div className="border border-rose-200 rounded-b-lg max-h-64 overflow-y-auto">
                    <div className="p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
                      {detailDiff.beforeEl}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 border-b-0 rounded-t-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">After</span>
                  </div>
                  <div className="border border-emerald-200 rounded-b-lg max-h-64 overflow-y-auto">
                    <div className="p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
                      {detailDiff.afterEl}
                    </div>
                  </div>
                </div>
              </div>
            ) : detailIdentical ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={14} className="text-slate-400 flex-shrink-0" />
                No text changes detected — before and after content are identical.
              </div>
            ) : selectedEvent.details ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedEvent.details}
              </div>
            ) : (
              <div className="py-6 text-xs text-slate-400 italic text-center">
                No additional details recorded.
              </div>
            )}
          </div>

        ) : (

          /* Event list */
          <div className="flex-1 overflow-y-auto">
            {loading && events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw size={22} className="animate-spin mb-3 opacity-40" />
                <p className="text-sm">Loading audit events…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle size={22} className="mb-3 opacity-40" />
                <p className="text-sm">No events found.</p>
              </div>
            ) : (
              <div className="relative py-1">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-200 pointer-events-none" />

                {filtered.map((e) => {
                  const config    = getEventConfig(e.type as string);
                  const { date, time } = formatDateTime(e.at);
                  const step      = WORKFLOW_STEPS.find(s => s.id === e.stepId);
                  const actorName = e.actor?.name ?? 'Unknown';

                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="w-full flex items-start gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors group"
                    >
                      {/* Icon bubble */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow-sm ${config.iconBg}`}>
                        <config.Icon size={15} className={config.iconColor} />
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
                              {e.summary}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                              {step && (
                                <span className={`inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded border font-medium text-[11px] ${getStepBadgeStyle(e.stepId as string)}`}>
                                  {step.label}
                                </span>
                              )}
                              {e.sectionTitle && (
                                <span className="text-[11px] text-slate-400 flex-shrink-0 truncate max-w-[140px]" title={e.sectionTitle}>
                                  {e.sectionTitle}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 flex-shrink-0">{actorName}</span>
                              {e.reason && (
                                <span className="text-[11px] text-slate-400 italic flex-shrink-0">
                                  &ldquo;{e.reason.length > 20 ? e.reason.slice(0, 20) + '…' : e.reason}&rdquo;
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Timestamp + chevron */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-[11px] font-semibold text-slate-600">{date}</div>
                              <div className="text-[11px] text-slate-400">{time}</div>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0"
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
