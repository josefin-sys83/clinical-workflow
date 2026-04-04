import { mockProjects, mockCompletedProjects, mockOpenItems, currentUser } from '@/app/data/mockData';
import type { Project, OpenItem } from '@/app/types/project';
import type { WorkflowStepId, DocumentLifecycleState } from '@/shared/workflow/types';
import { WORKFLOW_STEPS } from '@/shared/workflow/steps';
import { assertTransition } from '@/shared/workflow/stateMachine';
import type { AuditEvent } from '@/shared/workflow/audit';

// A lightweight in-browser mock API.
// This avoids service-worker setup and keeps the UI fully data-driven during Step 3.

type Json = any;

let projects: Project[] = structuredClone(mockProjects);
let completedProjects: Project[] = structuredClone(mockCompletedProjects);
let openItems: OpenItem[] = structuredClone(mockOpenItems);

type StepState = { state: DocumentLifecycleState; updatedAt: string };
type WorkflowSnapshot = { projectId: string; steps: Record<WorkflowStepId, StepState> };

let activeProjectId: string | null = projects[0]?.id ?? null;

const workflowsByProject: Record<string, Record<WorkflowStepId, StepState>> = {};
const auditByProject: Record<string, AuditEvent[]> = {};

function ensureWorkflow(projectId: string): Record<WorkflowStepId, StepState> {
  if (!workflowsByProject[projectId]) {
    const now = new Date().toISOString();
    const steps = {} as Record<WorkflowStepId, StepState>;
    for (const s of WORKFLOW_STEPS) {
      // Dashboard isn't a document, but we keep it in the snapshot for a consistent shape.
      let state: DocumentLifecycleState = 'draft';

      // Give the demo sensible defaults so UI actions map to valid transitions.
      if (s.id === 'protocol-review' || s.id === 'report-review') state = 'in_review';
      if (s.id === 'protocol-pdf' || s.id === 'report-pdf') state = 'signed';

      steps[s.id] = { state, updatedAt: now };
    }
    workflowsByProject[projectId] = steps;
  }
  if (!auditByProject[projectId]) auditByProject[projectId] = [];
  return workflowsByProject[projectId];
}

function ensureProjectExists(projectId: string): boolean {
  return (
    projects.some((p) => p.id === projectId) ||
    completedProjects.some((p) => p.id === projectId)
  );
}

function makeAuditEvent(args: Omit<AuditEvent, 'id' | 'at' | 'actor'> & { actor?: AuditEvent['actor'] }): AuditEvent {
  const now = new Date();
  return {
    id: `audit-${String(Math.floor(Math.random() * 900000) + 100000)}-${now.getTime()}`,
    at: now.toISOString(),
    actor: args.actor ?? { name: currentUser.name, email: currentUser.email },
    ...args,
  };
}

function jsonResponse(body: Json, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function notFound(message = 'Not found') {
  return jsonResponse({ message }, { status: 404 });
}

export function enableMockApi() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? new URL(input, window.location.origin) : new URL(String((input as any).url ?? input), window.location.origin);

    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input as any, init);
    }

    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api\//, '');

    // Simulate a tiny bit of network latency for realism.
    await new Promise((r) => setTimeout(r, 150));

    // Routes
    if (method === 'GET' && path === 'me') {
      return jsonResponse(currentUser);
    }

    // Context
    if (method === 'GET' && path === 'context') {
      return jsonResponse({ activeProjectId });
    }

    if (method === 'POST' && path === 'context/active-project') {
      const bodyText = init?.body ? String(init.body) : '';
      let body: { projectId?: string } | null = null;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = null;
      }
      if (!body?.projectId) {
        return jsonResponse({ message: 'projectId is required' }, { status: 400 });
      }
      if (!ensureProjectExists(body.projectId)) {
        return notFound('Project not found');
      }
      activeProjectId = body.projectId;
      ensureWorkflow(body.projectId);
      return jsonResponse({ activeProjectId });
    }

    if (method === 'GET' && path === 'projects') {
      return jsonResponse(projects);
    }

    if (method === 'GET' && path === 'projects/completed') {
      return jsonResponse(completedProjects);
    }

    if (path.startsWith('projects/')) {
      const projectId = decodeURIComponent(path.split('/')[1] ?? '');

      // Nested routes: workflow + audit
      // GET /api/projects/:id/workflow
      if (method === 'GET' && path.endsWith('/workflow')) {
        if (!ensureProjectExists(projectId)) return notFound('Project not found');
        const steps = ensureWorkflow(projectId);
        const snapshot: WorkflowSnapshot = { projectId, steps };
        return jsonResponse(snapshot);
      }

      // POST /api/projects/:id/workflow/:stepId/transition
      if (method === 'POST' && path.includes('/workflow/') && path.endsWith('/transition')) {
        if (!ensureProjectExists(projectId)) return notFound('Project not found');
        const parts = path.split('/');
        const stepId = decodeURIComponent(parts[3] ?? '') as WorkflowStepId; // projects/:id/workflow/:stepId/transition
        const steps = ensureWorkflow(projectId);
        if (!steps[stepId]) return notFound('Unknown step');

        const bodyText = init?.body ? String(init.body) : '';
        let body: { to?: DocumentLifecycleState; note?: string } | null = null;
        try {
          body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          body = null;
        }

        const to = body?.to;
        if (!to) return jsonResponse({ message: 'to is required' }, { status: 400 });

        const from = steps[stepId].state;
        try {
          assertTransition(from, to);
        } catch (e: any) {
          return jsonResponse({ message: e?.message ?? 'Invalid transition' }, { status: 409 });
        }

        const now = new Date().toISOString();
        steps[stepId] = { state: to, updatedAt: now };

        const domain = WORKFLOW_STEPS.find((s) => s.id === stepId)?.domain ?? 'project';
        const auditEvent = makeAuditEvent({
          projectId,
          domain,
          stepId,
          type: 'lifecycle_transition',
          summary: `Lifecycle transition: ${from} → ${to}`,
          details: body?.note,
          fromState: from,
          toState: to,
        });
        auditByProject[projectId] = [auditEvent, ...(auditByProject[projectId] ?? [])];

        const snapshot: WorkflowSnapshot = { projectId, steps };
        return jsonResponse({ ok: true, snapshot, auditEvent });
      }

      // GET /api/projects/:id/audit
      if (method === 'GET' && path.endsWith('/audit')) {
        if (!ensureProjectExists(projectId)) return notFound('Project not found');
        ensureWorkflow(projectId);
        return jsonResponse(auditByProject[projectId] ?? []);
      }

      // POST /api/projects/:id/audit
      if (method === 'POST' && path.endsWith('/audit')) {
        if (!ensureProjectExists(projectId)) return notFound('Project not found');
        ensureWorkflow(projectId);

        const bodyText = init?.body ? String(init.body) : '';
        let body:
          | {
              domain?: any;
              stepId?: any;
              type?: any;
              summary?: string;
              details?: string;
            }
          | null = null;
        try {
          body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          body = null;
        }

        if (!body?.domain || !body?.stepId || !body?.type || !body?.summary) {
          return jsonResponse({ message: 'domain, stepId, type and summary are required' }, { status: 400 });
        }

        const auditEvent = makeAuditEvent({
          projectId,
          domain: body.domain,
          stepId: body.stepId,
          type: body.type,
          summary: body.summary,
          details: body.details,
        });

        auditByProject[projectId] = [auditEvent, ...(auditByProject[projectId] ?? [])];
        return jsonResponse(auditEvent, { status: 201 });
      }

      // Fall back: return project.
      if (method === 'GET') {
        const project = projects.find((p) => p.id === projectId) ?? completedProjects.find((p) => p.id === projectId);
        if (!project) return notFound('Project not found');
        return jsonResponse(project);
      }
    }

    if (method === 'POST' && path === 'projects') {
      const bodyText = init?.body ? String(init.body) : '';
      let body: { name?: string; deviceName?: string } | null = null;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = null;
      }

      if (!body?.name || !body?.deviceName) {
        return jsonResponse({ message: 'name and deviceName are required' }, { status: 400 });
      }

      const newProject: Project = {
        id: `proj-${String(Math.floor(Math.random() * 900000) + 100000)}`,
        name: body.name,
        deviceName: body.deviceName,
        myRole: ['Project Manager'],
        phase: 'Setup',
        status: 'On track',
        blockers: 0,
        warnings: 0,
        primaryAction: 'Complete project setup',
      };

      projects = [newProject, ...projects];

      // Make this new project active and initialize workflow/audit state.
      activeProjectId = newProject.id;
      ensureWorkflow(newProject.id);

      openItems = [
        {
          id: `item-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          projectId: newProject.id,
          projectName: newProject.name,
          document: 'Project Setup',
          description: 'Add study synopsis and scope before protocol authoring can start.',
          myRole: 'Project Manager',
          action: 'Edit',
          priority: 'Medium',
          link: `/projects/${newProject.id}`,
        },
        ...openItems,
      ];

      return jsonResponse(newProject, { status: 201 });
    }

    if (method === 'GET' && path === 'open-items') {
      return jsonResponse(openItems);
    }

    return notFound();
  };

  return () => {
    window.fetch = originalFetch;
  };
}
