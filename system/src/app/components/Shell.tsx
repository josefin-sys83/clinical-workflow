import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  currentIndex: number;
  stepStates: Partial<Record<WorkflowStepId, DocumentLifecycleState>>;
}): boolean {
  const { index, currentIndex, stepStates } = args;
  if (index === 0) return false;
  if (index <= currentIndex) return false;
  for (let i = 1; i < index; i++) {
    const prevId = WORKFLOW_STEPS[i]?.id;
    if (!prevId) continue;
    const prevState = stepStates[prevId];
    if (!isDone(prevState)) return true;
  }
  return false;
}

export function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const projectId = params.projectId;
  const current = getStepByPathname(location.pathname);
  const { snapshot, refresh } = useWorkflowSnapshot({ projectId });
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === current?.id);

  useEffect(() => {
    if (projectId && current) {
      localStorage.setItem(`lastPage_${projectId}`, location.pathname);
    }
  }, [location.pathname, projectId, current]);

  const stepStates: Partial<Record<WorkflowStepId, DocumentLifecycleState>> = {};
  if (snapshot) {
    for (const s of WORKFLOW_STEPS) {
      stepStates[s.id] = snapshot.steps?.[s.id]?.state;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside style={{width: sidebarOpen ? "18rem" : "3rem", borderRight: "1px solid #e2e8f0", backgroundColor: "white", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s"}}>
        <div style={{padding: "0.5rem", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid #f1f5f9"}}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0.25rem", cursor: "pointer", color: "#64748b", background: "none", border: "1px solid #e2e8f0"}}
          >
            {sidebarOpen ? <ChevronLeft style={{width: "1rem", height: "1rem"}} /> : <ChevronRight style={{width: "1rem", height: "1rem"}} />}
          </button>
        </div>
        {sidebarOpen && (
          <div style={{padding: "1rem", flex: 1, overflowY: "auto"}}>
            <div style={{fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem"}}>Workflow Steps</div>
            <nav style={{display: "flex", flexDirection: "column", gap: "0.25rem"}}>
              {WORKFLOW_STEPS.map((s, idx) => {
                const active = current?.id === s.id;
                const state = stepStates[s.id];
                const locked = shouldLockStep({ stepId: s.id, index: idx, currentIndex, stepStates });
                const canNavigateToWorkflow = s.id === "dashboard" || Boolean(projectId);
                const href = s.id === "dashboard" ? s.path : projectId ? buildWorkflowPath(projectId, s.id) : "/dashboard";
                const isDisabled = locked || !canNavigateToWorkflow;
                return (
                  <Link
                    key={s.id}
                    to={isDisabled ? location.pathname : href}
                    aria-disabled={isDisabled}
                    onClick={(e) => { if (isDisabled) e.preventDefault(); }}
                    style={{padding: "0.5rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", backgroundColor: active ? "#f1f5f9" : "transparent", color: active ? "#0f172a" : isDisabled ? "#94a3b8" : "#334155", cursor: isDisabled ? "not-allowed" : "pointer"}}
                  >
                    <span style={{flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{s.label}</span>
                    {state ? <WorkflowStatusBadge state={state} className="shrink-0" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3">
          <div className="text-sm font-semibold truncate">
            {current?.label ?? "Clinical Platform"}
          </div>
          <div className="flex-1" />
          <button className="text-xs text-muted-foreground hover:underline" onClick={() => void refresh()} title="Refresh workflow">
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
