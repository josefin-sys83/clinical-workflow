import { apiFetch } from './http';

export type GlobalAuditEvent = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  projectId: string | null;
  projectNumber: string | null;
  projectName: string | null;
  scope: 'system' | 'company' | 'project';
  stepId: string | null;
  type: string;
  message: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type GlobalAuditFilters = {
  companyId?: string;
  projectId?: string;
  scope?: 'system' | 'company' | 'project' | 'all';
  type?: string;
  entityType?: string;
  search?: string;
  limit?: number;
};

export async function listVisibleAuditEvents(
  filters: GlobalAuditFilters = {},
): Promise<GlobalAuditEvent[]> {
  const params = new URLSearchParams();
  if (filters.companyId) params.set('companyId', filters.companyId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.scope && filters.scope !== 'all') params.set('scope', filters.scope);
  if (filters.type) params.set('type', filters.type);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  params.set('limit', String(filters.limit ?? 300));
  const query = params.toString();
  return apiFetch<GlobalAuditEvent[]>(`/audit${query ? `?${query}` : ''}`);
}

export async function listVisibleAuditEntityTypes(
  filters: Pick<GlobalAuditFilters, 'companyId' | 'scope'> = {},
): Promise<string[]> {
  const params = new URLSearchParams();
  if (filters.companyId) params.set('companyId', filters.companyId);
  if (filters.scope && filters.scope !== 'all') params.set('scope', filters.scope);
  const query = params.toString();
  return apiFetch<string[]>(`/audit/entity-types${query ? `?${query}` : ''}`);
}
