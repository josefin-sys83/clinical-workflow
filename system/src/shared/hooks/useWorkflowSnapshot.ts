import { useCallback, useEffect, useState } from 'react';
import type { WorkflowSnapshot } from '@/shared/api/workflow';
import { getWorkflowSnapshot } from '@/shared/services/workflowService';

export function useWorkflowSnapshot(opts?: { refreshOnMount?: boolean; projectId?: string }) {
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!opts?.projectId) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await getWorkflowSnapshot(opts.projectId);
      setSnapshot(s);
    } catch (e) {
      setError(e);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [opts?.projectId]);

  useEffect(() => {
    if (opts?.refreshOnMount === false) return;
    void refresh();
  }, [opts?.refreshOnMount, refresh]);

  return { snapshot, setSnapshot, loading, error, refresh };
}
