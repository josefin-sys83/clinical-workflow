import { apiFetch } from './http';
import type { AuditEvent } from '@/shared/workflow/audit';
import type { WorkflowDomain } from '@/shared/workflow/types';

function formatCommentDetails(metadata: { sectionTitle?: string; commentType?: string; commentText?: string; comment?: string; author?: string }): string {
  const parts: string[] = [];
  if (metadata.sectionTitle) parts.push(`Section: ${metadata.sectionTitle}`);
  if (metadata.commentType) parts.push(`Type: ${metadata.commentType}`);
  if (metadata.author) parts.push(`Author: ${metadata.author}`);
  parts.push('');
  parts.push(metadata.commentText ?? metadata.comment ?? '');
  return parts.join('\n');
}

/**
 * Parse an actorUserId that may be in "Name (Role)" format.
 * Returns { name, role } — if no parenthetical role is found, role is undefined.
 */
function parseActorId(actorUserId: string): { name: string; role?: string } {
  const match = actorUserId.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { name: match[1].trim(), role: match[2].trim() };
  return { name: actorUserId };
}

export async function listAuditEvents(projectId: string): Promise<AuditEvent[]> {
  const raw = await apiFetch<any[]>(`/projects/${encodeURIComponent(projectId)}/audit`);
  return raw.map((e) => {
    const actorParsed = e.actorName
      ? { name: e.actorName, role: e.actorRole ?? undefined }
      : e.actorUserId
        ? parseActorId(e.actorUserId)
        : undefined;
    return {
      id: e.id,
      projectId: e.projectId,
      domain: (e.domain ?? 'project') as WorkflowDomain,
      stepId: e.stepId ?? null,
      type: e.type,
      summary: e.message,
      details: e.metadata && (e.metadata.previousContent || e.metadata.newContent)
        ? ("|||BEFORE|||" + (e.metadata.previousContent || "") + "|||AFTER|||" + (e.metadata.newContent || ""))
        : e.metadata?.roles
          ? e.metadata.roles
          : (e.metadata?.commentText || e.metadata?.comment)
            ? formatCommentDetails(e.metadata)
            : undefined,
      at: e.createdAt,
      actor: actorParsed
        ? {
            id: e.actorUserId,
            name: actorParsed.name,
            email: e.actorEmail ?? '',
            role: actorParsed.role,
          }
        : undefined,
      reason: e.metadata?.reason ?? undefined,
      sectionTitle: e.metadata?.sectionTitle ?? undefined,
    };
  }) as unknown as AuditEvent[];
}
