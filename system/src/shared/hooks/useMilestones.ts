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
}

export function useMilestones(projectId: string | undefined) {
  const [milestones, setMilestones] = useState<MilestonesResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const apiBase = '';
    fetch(`${apiBase}/api/projects/${projectId}/milestones`)
      .then(r => r.json())
      .then(data => setMilestones(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  return { milestones, loading };
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
