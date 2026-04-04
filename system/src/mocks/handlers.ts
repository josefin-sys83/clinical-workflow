import { http, HttpResponse } from 'msw';
import { mockProjects, mockCompletedProjects, mockOpenItems, currentUser } from '@/app/data/mockData';
import type { Project } from '@/app/types/project';

// In-memory copies so the mock API can mutate state during a dev session.
let projects: Project[] = structuredClone(mockProjects);
let completedProjects: Project[] = structuredClone(mockCompletedProjects);
let openItems = structuredClone(mockOpenItems);

function json(data: unknown, init?: { status?: number }) {
  return HttpResponse.json(data, { status: init?.status ?? 200 });
}

export const handlers = [
  http.get('/api/me', () => json(currentUser)),

  http.get('/api/projects', () => json(projects)),

  http.get('/api/projects/completed', () => json(completedProjects)),

  http.get('/api/projects/:projectId', ({ params }) => {
    const projectId = String(params.projectId);
    const project = projects.find((p) => p.id === projectId) ?? completedProjects.find((p) => p.id === projectId);
    if (!project) return json({ message: 'Project not found' }, { status: 404 });
    return json(project);
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { name?: string; deviceName?: string } | null;
    if (!body?.name || !body?.deviceName) {
      return json({ message: 'name and deviceName are required' }, { status: 400 });
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

    // Add a starter open item so the dashboard becomes immediately meaningful.
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

    return json(newProject, { status: 201 });
  }),

  http.get('/api/open-items', () => json(openItems)),
];
