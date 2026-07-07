import { Outlet, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  Target,
  FilePen,
  Eye,
  FileCheck,
  BarChart2,
  Search,
  FileText,
  ScrollText,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { WORKFLOW_STEPS, buildWorkflowPath, getStepByPathname } from '@/shared/workflow/steps';
import { useWorkflowSnapshot } from '@/shared/hooks/useWorkflowSnapshot';
import type { DocumentLifecycleState, WorkflowStepId } from '@/shared/workflow/types';
import { AuditTrailButton } from '@/shared/components/AuditTrailButton';
import { Button } from '@/app/components/ui/button';
import { getToken, isAdmin, logout } from '@/shared/auth/token';

function isDone(state: DocumentLifecycleState | undefined): boolean {
  return state === 'approved' || state === 'signed' || state === 'final';
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

  const maxDoneIndex = WORKFLOW_STEPS.reduce((max, s, i) => {
    return isDone(stepStates[s.id]) ? i : max;
  }, 0);

  if (index <= maxDoneIndex + 1) return false;
  return true;
}

// Icon map for each workflow step
const STEP_ICONS: Record<string, React.ReactNode> = {
  dashboard:      <LayoutDashboard className="w-4 h-4 flex-shrink-0" />,
  'project-setup': <FolderOpen    className="w-4 h-4 flex-shrink-0" />,
  synopsis:        <BookOpen      className="w-4 h-4 flex-shrink-0" />,
  scope:           <Target        className="w-4 h-4 flex-shrink-0" />,
  'protocol-make': <FilePen       className="w-4 h-4 flex-shrink-0" />,
  'protocol-review': <Eye         className="w-4 h-4 flex-shrink-0" />,
  'protocol-pdf':  <FileCheck     className="w-4 h-4 flex-shrink-0" />,
  'report-make':   <FileText      className="w-4 h-4 flex-shrink-0" />,
  'report-review': <Search        className="w-4 h-4 flex-shrink-0" />,
  'report-pdf':    <BarChart2     className="w-4 h-4 flex-shrink-0" />,
};

// Domain section labels shown as dividers in the sidebar
const DOMAIN_LABELS: Partial<Record<string, string>> = {
  'project-setup':  'Project',
  'protocol-make':  'Protocol',
  'report-make':    'Report',
};

export function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasApprovedAmendments, setHasApprovedAmendments] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const projectId = params.projectId;
  const current = getStepByPathname(location.pathname);
  const { snapshot, refresh } = useWorkflowSnapshot({ projectId });

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((u: { name: string } | null) => { if (u) setCurrentUser(u); })
      .catch(() => {});
  }, []);

  const handleSignOut = () => {
    void logout();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === current?.id);

  useEffect(() => {
    if (projectId && current) {
      localStorage.setItem(`lastPage_${projectId}`, location.pathname);
    }
  }, [location.pathname, projectId, current]);

  // Re-fetch workflow snapshot on every navigation so the sidebar reflects
  // transitions that fired on the previous page before the user navigated away.
  useEffect(() => {
    if (projectId) void refresh();
  }, [location.pathname, projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/amendments`)
      .then(r => r.json())
      .then((amds: any[]) => {
        setHasApprovedAmendments(Array.isArray(amds) && amds.some(a => a.status === 'approved' || a.status === 'finalized'));
      })
      .catch(() => {});
  }, [projectId, location.pathname]);

  const stepStates: Partial<Record<WorkflowStepId, DocumentLifecycleState>> = {};
  if (snapshot) {
    for (const s of WORKFLOW_STEPS) {
      stepStates[s.id] = snapshot.steps?.[s.id]?.state;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className="border-r bg-white flex flex-col flex-shrink-0 transition-all duration-200"
        style={{ width: sidebarOpen ? '14rem' : '3rem' }}
      >
        {/* Toggle button */}
        <div className="px-2 py-2.5 flex justify-end border-b border-slate-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {sidebarOpen
              ? <ChevronLeft className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Dashboard link — only shown on settings when sidebar is expanded */}
        {sidebarOpen && location.pathname === '/settings' && (
          <div className="py-3 px-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-slate-400" />
              Dashboard
            </Link>
          </div>
        )}

        {/* Navigation — only visible when expanded and not on settings */}
        {sidebarOpen && location.pathname !== '/settings' && (
          <div className="flex-1 overflow-y-auto py-3">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Workflow
              </span>
            </div>

            <nav className="flex flex-col gap-0.5 px-2">
              {WORKFLOW_STEPS.map((s, idx) => {
                const active = current?.id === s.id;
                const locked = shouldLockStep({ stepId: s.id, index: idx, currentIndex, stepStates });
                const canNavigateToWorkflow = s.id === 'dashboard' || Boolean(projectId);
                const href = s.id === 'dashboard' ? s.path : projectId ? buildWorkflowPath(projectId, s.id) : '/dashboard';
                const isDisabled = locked || !canNavigateToWorkflow;
                const icon = STEP_ICONS[s.id];
                const domainLabel = DOMAIN_LABELS[s.id];

                const amendmentHref = projectId
                  ? `/projects/${projectId}/workflow/protocol/amendment`
                  : '/dashboard';
                const isAmendmentActive = location.pathname.endsWith('/protocol/amendment');

                return (
                  <span key={s.id}>
                    {domainLabel && (
                      <div className="mt-3 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          {domainLabel}
                        </span>
                      </div>
                    )}

                    <Link
                      to={isDisabled ? location.pathname : href}
                      aria-disabled={isDisabled}
                      onClick={(e) => { if (isDisabled) e.preventDefault(); }}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : isDisabled
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      ].join(' ')}
                    >
                      <span className={active ? 'text-slate-900' : isDisabled ? 'text-slate-300' : 'text-slate-400'}>
                        {icon}
                      </span>
                      <span className="flex-1 truncate">{s.label}</span>
                    </Link>

                    {s.id === 'protocol-pdf' && hasApprovedAmendments && projectId && (
                      <Link
                        to={amendmentHref}
                        className={[
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                          isAmendmentActive
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        ].join(' ')}
                      >
                        <span className={isAmendmentActive ? 'text-slate-900' : 'text-slate-400'}>
                          <ScrollText className="w-4 h-4 flex-shrink-0" />
                        </span>
                        <span className="flex-1 truncate">Amendment Form</span>
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header – matches Make Protocol's header exactly */}
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3 flex-shrink-0">
          <div className="text-sm font-semibold truncate text-slate-900">
            {current?.label ?? 'Clinical Platform'}
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
              if (current?.id === 'report-make') {
                window.dispatchEvent(new CustomEvent('report:refresh-analysis'));
              }
            }}
            title="Refresh workflow status"
          >
            Refresh
          </Button>
          <AuditTrailButton />
          {currentUser && (
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
              {isAdmin() && (
                <Link
                  to="/admin"
                  title="Admin panel"
                  className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </Link>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-600 max-w-[120px] truncate hidden sm:block">
                    {currentUser.name}
                  </span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-gray-200" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 text-gray-500" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
