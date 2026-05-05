import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { ScrollArea } from '@/shared/ui/scroll-area';
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
  Tag, FileText, RefreshCw, AlertCircle,
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
    changes_requested:           { Icon: MessageSquare,   iconBg: 'bg-red-100',     iconColor: 'text-red-600',     label: 'Changes requested'  },
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

function wordDiff(before: string, after: string) {
  const bWords = before.split(/(\s+)/);
  const aWords = after.split(/(\s+)/);
  const bSet = new Set(bWords.filter(w => w.trim()));
  const aSet = new Set(aWords.filter(w => w.trim()));

  const beforeEl = bWords.map((w, i) =>
    !w.trim() ? <span key={i}>{w}</span>
    : !aSet.has(w) ? <mark key={i} className="bg-red-100 text-red-800 line-through decoration-red-300 rounded-sm px-0.5">{w}</mark>
    : <span key={i}>{w}</span>
  );

  const afterEl = aWords.map((w, i) =>
    !w.trim() ? <span key={i}>{w}</span>
    : !bSet.has(w) ? <mark key={i} className="bg-emerald-100 text-emerald-800 rounded-sm px-0.5 font-medium">{w}</mark>
    : <span key={i}>{w}</span>
  );

  return { beforeEl, afterEl };
}

function netWordChange(before: string, after: string): string {
  const b = before.trim().split(/\s+/).filter(Boolean).length;
  const a = after.trim().split(/\s+/).filter(Boolean).length;
  const diff = a - b;
  if (diff === 0) return 'No length change';
  return diff > 0 ? `+${diff} words` : `${diff} words`;
}

// ── Detail modal ───────────────────────────────────────────────────────────────

function DetailModal({ event: e, onClose }: { event: AuditEvent; onClose: () => void }) {
  const config = getEventConfig(e.type as string);
  const step   = WORKFLOW_STEPS.find(s => s.id === e.stepId);
  const { date, time } = formatDateTime(e.at);
  const actorName = e.actor?.name ?? 'Unknown';

  const parts  = e.details ? e.details.split('|||AFTER|||') : [];
  const before = parts[0] ? parts[0].replace('|||BEFORE|||', '').trim() : '';
  const after  = parts[1] ? parts[1].trim() : '';
  const hasDiff = Boolean(before && after);
  const diff   = hasDiff ? wordDiff(before, after) : null;
  const change = hasDiff ? netWordChange(before, after) : null;
  const changePositive = change?.startsWith('+');
  const changeNeutral  = change === 'No length change';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">

        {/* Header */}
        <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
            <config.Icon size={18} className={config.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${config.iconColor}`}>
              {config.label}
            </div>
            <div className="text-sm font-semibold text-slate-900 leading-snug">
              {e.summary}
            </div>
          </div>
        </div>

        {/* Metadata strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 py-4 border-b border-slate-100 text-xs">
          <div>
            <div className="flex items-center gap-1 text-slate-400 mb-1.5">
              <Clock size={10} strokeWidth={2.5} />
              <span className="font-medium uppercase tracking-wide text-[10px]">Date &amp; Time</span>
            </div>
            <div className="font-semibold text-slate-800">{date}</div>
            <div className="text-slate-500">{time}</div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-400 mb-1.5">
              <UserIcon size={10} strokeWidth={2.5} />
              <span className="font-medium uppercase tracking-wide text-[10px]">Actor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {getInitials(actorName)}
              </div>
              <span className="font-semibold text-slate-800 truncate">{actorName}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-400 mb-1.5">
              <Tag size={10} strokeWidth={2.5} />
              <span className="font-medium uppercase tracking-wide text-[10px]">Step</span>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded border font-medium text-[11px] ${getStepBadgeStyle(e.stepId as string)}`}>
              {step?.label ?? e.stepId ?? '—'}
            </span>
          </div>

          {(e.reason || hasDiff) && (
            <div>
              {e.reason ? (
                <>
                  <div className="text-slate-400 mb-1.5 font-medium uppercase tracking-wide text-[10px]">Reason for change</div>
                  <div className="font-medium text-slate-800 leading-snug">{e.reason}</div>
                </>
              ) : (
                <>
                  <div className="text-slate-400 mb-1.5 font-medium uppercase tracking-wide text-[10px]">Net change</div>
                  <div className={`font-bold ${changePositive ? 'text-emerald-700' : changeNeutral ? 'text-slate-500' : 'text-red-700'}`}>
                    {change}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {diff ? (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {/* Before */}
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 border-b-0 rounded-t-lg">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Before</span>
              </div>
              <ScrollArea className="h-56 border border-red-200 rounded-b-lg">
                <div className="p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
                  {diff.beforeEl}
                </div>
              </ScrollArea>
            </div>
            {/* After */}
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 border-b-0 rounded-t-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">After</span>
              </div>
              <ScrollArea className="h-56 border border-emerald-200 rounded-b-lg">
                <div className="p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
                  {diff.afterEl}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : e.details ? (
          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {e.details}
          </div>
        ) : (
          <div className="mt-2 py-6 text-xs text-slate-400 italic text-center">
            No additional details recorded.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function AuditTrailModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projectId } = useParams();
  const [events, setEvents]           = useState<AuditEvent[]>([]);
  const [loading, setLoading]         = useState(false);
  const [stepFilter, setStepFilter]   = useState<WorkflowStepId | 'all'>('all');
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

  const filtered = useMemo(() => {
    if (stepFilter === 'all') return events;
    return events.filter(e => e.stepId === stepFilter);
  }, [events, stepFilter]);

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-4xl">

          {/* Header */}
          <DialogHeader>
            <div className="flex items-baseline gap-2">
              <DialogTitle className="text-base font-semibold text-slate-900">Audit Trail</DialogTitle>
              {events.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">{events.length} events</span>
              )}
            </div>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <div className="w-52">
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
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          {/* Event list */}
          <ScrollArea className="h-[55vh]">
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
                  const config     = getEventConfig(e.type as string);
                  const { date, time } = formatDateTime(e.at);
                  const step       = WORKFLOW_STEPS.find(s => s.id === e.stepId);
                  const actorName  = e.actor?.name ?? 'Unknown';

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
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {step && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border font-medium text-[11px] ${getStepBadgeStyle(e.stepId as string)}`}>
                                  {step.label}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">{actorName}</span>
                              {e.reason && (
                                <span className="text-[11px] text-slate-400 italic truncate max-w-[180px]">
                                  &ldquo;{e.reason}&rdquo;
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
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <DetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}
