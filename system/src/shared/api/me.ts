import { apiFetch } from './http';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/me');
}
