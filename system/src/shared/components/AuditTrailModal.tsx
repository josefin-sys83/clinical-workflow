import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { WorkflowStatusBadge } from '@/shared/components/WorkflowStatusBadge';
import type { AuditEvent } from '@/shared/workflow/audit';
import type { WorkflowStepId } from '@/shared/workflow/types';
import { WORKFLOW_STEPS } from '@/shared/workflow/steps';
import { useParams } from 'react-router-dom';
import { listProjectAuditEvents } from '@/shared/services/auditService';

export function AuditTrailModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projectId } = useParams();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepFilter, setStepFilter] = useState<WorkflowStepId | 'all'>('all');

  async function load() {
    setLoading(true);
    try {
      if (!projectId) {
        setEvents([]);
        return;
      }
      const data = await listProjectAuditEvents(projectId);
      // newest first
      setEvents([...data].sort((a, b) => (a.at < b.at ? 1 : -1)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (props.open) void load();
  }, [props.open]);

  const filtered = useMemo(() => {
    if (stepFilter === 'all') return events;
    return events.filter((e) => e.stepId === stepFilter);
  }, [events, stepFilter]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Audit trail</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="w-64">
            <Select value={stepFilter} onValueChange={(v) => setStepFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by step" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All steps</SelectItem>
                {WORKFLOW_STEPS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No audit events yet.</div>
            ) : (
              filtered.map((e) => (
                <div key={e.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold">{e.summary}</div>
                        {e.toState ? <WorkflowStatusBadge state={e.toState} /> : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(e.at).toLocaleString()} · {e.actor?.name ?? 'Unknown'}
                      </div>
                      {e.details ? <div className="text-sm mt-2 whitespace-pre-wrap">{e.details}</div> : null}
                      {e.fromState && e.toState ? (
                        <div className="text-xs text-muted-foreground mt-2">
                          {e.fromState} → {e.toState}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {WORKFLOW_STEPS.find((s) => s.id === e.stepId)?.label ?? e.stepId}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
