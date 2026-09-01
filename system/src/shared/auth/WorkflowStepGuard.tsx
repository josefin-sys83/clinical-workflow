import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getWorkflowSnapshot } from '@/shared/services/workflowService';
import type { WorkflowSnapshot } from '@/shared/api/workflow';
import type { WorkflowStepId } from '@/shared/workflow/types';
import { isStepUnlocked, furthestUnlockedStep, stepPath } from '@/shared/workflow/gate';

// Prevents landing on a step whose prerequisites were never completed — e.g. a stale
// bookmark, a shared link, or typing the URL directly for a project that never finished
// Setup. Without this, the target page rendered anyway on empty/default data and could
// get stuck (protocol generation looping forever on a synopsis that was never written).
// Fails OPEN on snapshot-fetch errors: an unreachable backend or a not-found project is
// a different, already-handled failure mode (see each page's own load-error banner) —
// this guard only ever blocks a *known* locked step, never guesses.
export function WorkflowStepGuard({ stepId, children }: { stepId: WorkflowStepId; children: React.ReactNode }) {
  const { projectId } = useParams();
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [checkedRoute, setCheckedRoute] = useState<string | null>(null);
  const routeKey = projectId ? `${projectId}:${stepId}` : null;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setStatus('loading');
    getWorkflowSnapshot(projectId)
      .then(s => {
        if (!cancelled) {
          setSnapshot(s);
          setCheckedRoute(`${projectId}:${stepId}`);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckedRoute(`${projectId}:${stepId}`);
          setStatus('error');
        }
      });
    return () => { cancelled = true; };
  }, [projectId, stepId]);

  if (!projectId) return <>{children}</>;
  if (status === 'loading' || checkedRoute !== routeKey) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (status === 'error') return <>{children}</>;

  if (!isStepUnlocked(stepId, snapshot?.steps)) {
    const redirectTo = stepPath(furthestUnlockedStep(snapshot?.steps), projectId);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
