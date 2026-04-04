import type { WorkflowStepDefinition, WorkflowStepId } from './types';

// Single source of truth for the left navigation and route mapping.
// Per your spec: this is navigation only (no status, no completeness, no warnings).
// NOTE: Workflow steps are project-scoped and live under
// /projects/:projectId/workflow/...
// We store *relative* workflow paths here and build absolute paths with a projectId.
export const WORKFLOW_STEPS: WorkflowStepDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', domain: 'project' },

  { id: 'project-setup', label: 'Project Setup', path: 'project-setup', domain: 'project' },
  { id: 'synopsis', label: 'Synopsis', path: 'synopsis', domain: 'project' },
  { id: 'scope', label: 'Scope', path: 'scope', domain: 'project' },

  { id: 'protocol-make', label: 'Make Protocol', path: 'protocol/make', domain: 'protocol' },
  { id: 'protocol-review', label: 'Protocol Review', path: 'protocol/review', domain: 'protocol' },
  { id: 'protocol-pdf', label: 'PDF Protocol', path: 'protocol/pdf', domain: 'protocol' },

  { id: 'report-make', label: 'Make Report', path: 'report/make', domain: 'report' },
  { id: 'report-review', label: 'Report Review', path: 'report/review', domain: 'report' },
  { id: 'report-pdf', label: 'PDF Report', path: 'report/pdf', domain: 'report' },
];

export function buildWorkflowPath(projectId: string, stepId: WorkflowStepId): string {
  const step = getStepById(stepId);
  if (stepId === 'dashboard') return step.path; // absolute
  return `/projects/${projectId}/workflow/${step.path}`;
}

export function tryParseStepFromPathname(pathname: string): WorkflowStepDefinition | null {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return getStepById('dashboard');
  }
  const m = pathname.match(/^\/projects\/[^/]+\/workflow\/(.+)$/);
  if (!m) return null;
  const rel = m[1];
  const exact = WORKFLOW_STEPS.find((s) => s.id !== 'dashboard' && s.path === rel);
  if (exact) return exact;
  const byPrefix = WORKFLOW_STEPS.find((s) => s.id !== 'dashboard' && rel.startsWith(s.path));
  return byPrefix ?? null;
}

export function getStepById(id: WorkflowStepId): WorkflowStepDefinition {
  const found = WORKFLOW_STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown workflow step id: ${id}`);
  return found;
}

export function getStepByPathname(pathname: string): WorkflowStepDefinition | null {
  // Backwards-compatible helper.
  return tryParseStepFromPathname(pathname);
}
