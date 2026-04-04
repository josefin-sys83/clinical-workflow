import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { WORKFLOW_STEPS, buildWorkflowPath, getStepByPathname } from '@/shared/workflow/steps';
import { useWorkflowSnapshot } from '@/shared/hooks/useWorkflowSnapshot';
import type { DocumentLifecycleState, WorkflowStepId } from '@/shared/workflow/types';
import { WorkflowStatusBadge } from '@/shared/components/WorkflowStatusBadge';
import { AuditTrailButton } from '@/shared/components/AuditTrailButton';

function isDone(state: DocumentLifecycleState | undefined): boolean {
  return state === 'approved' || state === 'signed' || state === 'finalized';
}

function shouldLockStep(args: {
  stepId: WorkflowStepId;
  index: number;
  stepStates: Partial<Record<WorkflowStepId, DocumentLifecycleState>>;
}): boolean {
  const { index, stepStates } = args;
  // Always allow Dashboard.
  if (index === 0) return false;

  // Enforce sequential flow: all previous steps must be "done".
  for (let i = 1; i < index; i++) {
    const prevId = WORKFLOW_STEPS[i]?.id;
    if (!prevId) continue;
    const prevState = stepStates[prevId];
    if (!isDone(prevState)) return true;
  }

  return false;
}

export function Shell() {
  const location = useLocation();
  const params = useParams();
  const projectId = params.projectId;
  const current = getStepByPathname(location.pathname);
  const { snapshot, refresh } = useWorkflowSnapshot({ projectId });

  const stepStates: Partial<Record<WorkflowStepId, DocumentLifecycleState>> = {};
  if (snapshot) {
    for (const s of WORKFLOW_STEPS) {
      stepStates[s.id] = snapshot.steps?.[s.id]?.state;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-72 border-r bg-card">
        <div className="p-4">
          <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">
            Report Sections
          </div>
          <nav className="flex flex-col gap-1">
            {WORKFLOW_STEPS.map((s, idx) => {
              const active = current?.id === s.id;
              const state = stepStates[s.id];
              const locked = shouldLockStep({ stepId: s.id, index: idx, stepStates });

              const canNavigateToWorkflow = s.id === 'dashboard' || Boolean(projectId);
              const href = s.id === 'dashboard'
                ? s.path
                : projectId
                  ? buildWorkflowPath(projectId, s.id)
                  : '/dashboard';

              const isDisabled = locked || !canNavigateToWorkflow;

              return (
                <Link
                  key={s.id}
                  to={isDisabled ? location.pathname : href}
                  aria-disabled={isDisabled}
                  onClick={(e) => {
                    if (isDisabled) e.preventDefault();
                  }}
                  className={
                    'px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ' +
                    (active
                      ? 'bg-slate-100 text-slate-900'
                      : isDisabled
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-50')
                  }
                  title={
                    !canNavigateToWorkflow
                      ? 'Select a project first'
                      : locked
                        ? 'Complete previous steps first'
                        : undefined
                  }
                >
                  <span className="flex-1 min-w-0 truncate">{s.label}</span>
                  {state ? (
                    <WorkflowStatusBadge state={state} className="shrink-0" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3">
          <div className="text-sm font-semibold truncate">
            {current?.label ?? 'Clinical Platform'}
          </div>
          <div className="flex-1" />
          <button
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => void refresh()}
            title="Refresh workflow"
          >
            Refresh
          </button>
          <AuditTrailButton />
        </header>
        <div className="p-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
