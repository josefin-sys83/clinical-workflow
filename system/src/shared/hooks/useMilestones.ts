import { useState, useEffect } from 'react';

export interface MilestoneStatus {
  stepId: string;
  stepName: string;
  responsibleRole: string;
  responsibleName: string;
  deadline: string | null;
  daysUntil: number | null;
  status: 'complete' | 'on_track' | 'soon' | 'urgent' | 'overdue' | 'no_date';
  anchorLabel?: string;
  anchorDate?: string;
}

export interface MilestonesResult {
  complexity: string;
  complexityLabel: string;
  complexityPoints: number;
  milestones: MilestoneStatus[];
  warnings: MilestoneWarning[];
}

export interface MilestoneWarning {
  code: 'anchor_order' | 'timeline_not_feasible';
  message: string;
  affectedMilestones?: string[];
}

export function useMilestones(projectId: string | undefined, refreshKey?: unknown) {
  const [milestones, setMilestones] = useState<MilestonesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    const apiBase = '';
    fetch(`${apiBase}/api/projects/${projectId}/milestones`)
      .then(async (r) => {
        if (!r.ok) {
          // A 4xx/5xx body (e.g. {statusCode, message, error}) is not a MilestonesResult
          // — treating it as one crashed MilestoneBanner's `.milestones.find(...)` on
          // every failed fetch (wrong project, no access, transient server error, ...).
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.message || `Failed to load milestones (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setMilestones(data))
      .catch((e) => {
        setMilestones(null);
        setError(e instanceof Error ? e.message : 'Failed to load milestones');
      })
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  return { milestones, loading, error };
}

export function getMilestoneStatusIcon(status: MilestoneStatus['status']): string {
  switch (status) {
    case 'complete': return '–';
    case 'on_track': return '○';
    case 'soon': return '🟡';
    case 'urgent': return '🔴';
    case 'overdue': return '⛔';
    default: return '⚪';
  }
}

export function getMilestoneDaysLabel(m: MilestoneStatus): string {
  if (m.status === 'complete') return 'Complete';
  if (m.daysUntil === null) return '';
  if (m.daysUntil < 0) return `${Math.abs(m.daysUntil)} days overdue`;
  if (m.daysUntil === 0) return 'Today';
  return `${m.daysUntil} days remaining`;
}
