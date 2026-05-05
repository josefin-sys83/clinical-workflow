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

function diffSummary(before: string, after: string): string {
  const b = before.trim().split(/\s+/).length;
  const a = after.trim().split(/\s+/).length;
  const diff = a - b;
  if (diff === 0) return 'Content modified, same length';
  return diff > 0 ? `Added ~${diff} words` : `Removed ~${Math.abs(diff)} words`;
}

function wordDiff(before: string, after: string): { before: JSX.Element[]; after: JSX.Element[] } {
  const bWords = before.split(/(\s+)/);
  const aWords = after.split(/(\s+)/);
  const bSet = new Set(bWords.filter(w => w.trim()));
  const aSet = new Set(aWords.filter(w => w.trim()));

  const beforeEl = bWords.map((w, i) => {
    if (!w.trim()) return <span key={i}>{w}</span>;
    return !aSet.has(w)
      ? <mark key={i} className="bg-red-100 text-red-800 rounded px-0.5 font-semibold">{w}</mark>
      : <span key={i}>{w}</span>;
  });

  const afterEl = aWords.map((w, i) => {
    if (!w.trim()) return <span key={i}>{w}</span>;
    return !bSet.has(w)
      ? <mark key={i} className="bg-green-100 text-green-800 rounded px-0.5 font-semibold">{w}</mark>
      : <span key={i}>{w}</span>;
  });

  return { before: beforeEl, after: afterEl };
}

function DetailModal(props: { event: AuditEvent; onClose: () => void }) {
  const { event: e } = props;
  const parts = e.details ? e.details.split('|||AFTER|||') : [];
  const before = parts[0] ? parts[0].replace('|||BEFORE|||', '').trim() : '';
  const after = parts[1] ? parts[1].trim() : '';
  const summary = before && after ? diffSummary(before, after) : null;
  const step = WORKFLOW_STEPS.find(s => s.id === e.stepId)?.label ?? e.stepId ?? '—';
  const diff = before && after ? wordDiff(before, after) : null;

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{e.summary}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 border-b pb-3 mb-1">
          <div><span className="font-medium text-slate-700">Date & Time</span><br />{new Date(e.at).toLocaleString('sv-SE')}</div>
          <div><span className="font-medium text-slate-700">User</span><br />{e.actor?.name ?? 'Unknown'}</div>
          <div><span className="font-medium text-slate-700">Step</span><br />{step}</div>
          {summary && <div><span className="font-medium text-slate-700">Change</span><br />{summary}</div>}
        </div>

        {diff ? (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Before</span>
              </div>
              <ScrollArea className="h-52">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">{diff.before}</div>
              </ScrollArea>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-600">After</span>
              </div>
              <ScrollArea className="h-52">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">{diff.after}</div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 mt-1 whitespace-pre-wrap">{e.details || 'No details available.'}</div>
        )}

        <div className="flex justify-end mt-3">
          
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditTrailModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projectId } = useParams();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepFilter, setStepFilter] = useState<WorkflowStepId | 'all'>('all');
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
    return events.filter((e) => e.stepId === stepFilter);
  }, [events, stepFilter]);

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit trail</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-56">
              <Select value={stepFilter} onValueChange={(v) => setStepFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All steps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All steps</SelectItem>
                  {WORKFLOW_STEPS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-40">Date & Time</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">User</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Event</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">Step</th>
                </tr>
              </thead>
            </table>
            <ScrollArea className="h-[55vh]">
              <table className="w-full text-sm">
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-400">No audit events yet.</td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(e)}
                      >
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{new Date(e.at).toLocaleString('sv-SE')}</td>
                        <td className="px-3 py-2.5 text-slate-700">{e.actor?.name ?? 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-medium">{e.summary}</td>
                        <td className="px-3 py-2.5 text-slate-500">{WORKFLOW_STEPS.find((s) => s.id === e.stepId)?.label ?? e.stepId ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <DetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}