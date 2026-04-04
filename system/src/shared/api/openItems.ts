import type { OpenItem } from '@/app/types/project';
import { apiFetch } from './http';

export async function listOpenItems(): Promise<OpenItem[]> {
  return apiFetch<OpenItem[]>('/open-items');
}
