import type { Project } from '@/app/types/project';
import { apiFetch } from './http';

export type CreateProjectInput = {
  name: string;
  deviceName?: string;
};

export async function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export async function listCompletedProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects/completed');
}

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(projectId)}`);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      deviceName: input.deviceName,
    }),
  });
}