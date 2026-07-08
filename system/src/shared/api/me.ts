import { apiFetch } from './http';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  must_reset_password: boolean;
};

export type RequiredAction = {
  id: string;
  projectId: string;
  projectName: string;
  document: string;
  description: string;
  action: string;
  actionType: 'signature' | 'review' | 'input' | 'blocker';
  myRole: string;
  priority: 'High' | 'Medium' | 'Low';
  link: string;
};

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/me');
}

export async function getMyActions(): Promise<RequiredAction[]> {
  return apiFetch<RequiredAction[]>('/me/actions');
}
