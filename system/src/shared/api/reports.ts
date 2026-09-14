import { apiFetch } from './http';

type GeneratedSection = { sectionId: string; content: string };
const generationRequests = new Map<string, Promise<GeneratedSection>>();

export function hasReportText(value: unknown): boolean {
  return typeof value === 'string' && !!value.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim();
}

// Share an in-flight request across StrictMode effects and page remounts.
export function generateReportSectionDraft(projectId: string, section: { id: string; title: string; order: number }): Promise<GeneratedSection> {
  const key = JSON.stringify([projectId, section.id]);
  const existing = generationRequests.get(key);
  if (existing) return existing;
  const request = apiFetch<GeneratedSection>(`/projects/${encodeURIComponent(projectId)}/generate-report-section`, {
    method: 'POST', body: JSON.stringify({ sectionId: section.id, sectionTitle: section.title, sectionNumber: section.order }),
  }).then(result => {
    if (result?.sectionId !== section.id || !hasReportText(result?.content)) throw new Error('AI returned no text for this section. Please retry.');
    return result;
  }).finally(() => generationRequests.delete(key));
  generationRequests.set(key, request);
  return request;
}

export async function saveReportSections(projectId: string, sections: Record<string, Record<string, unknown>>) {
  return apiFetch<Record<string, any>>(`/projects/${encodeURIComponent(projectId)}/report/sections`, {
    method: 'PATCH', body: JSON.stringify({ sections }),
  });
}

export async function saveReportConsistencyDismissals(projectId: string, findingKeys: string[]) {
  return apiFetch(`/projects/${encodeURIComponent(projectId)}/report/consistency-dismissals`, {
    method: 'PATCH', body: JSON.stringify({ findingKeys }),
  });
}

export async function addReportComment(projectId: string, sectionKey: string, content: string, type = 'general', parentCommentKey?: string) {
  return apiFetch<any[]>(`/projects/${encodeURIComponent(projectId)}/report/sections/${encodeURIComponent(sectionKey)}/comments`, {
    method: 'POST', body: JSON.stringify({ content, type, parentCommentKey }),
  });
}

export function toReviewComment(comment: any, sectionId: string): any {
  return { ...comment, sectionId, author: comment.author?.name ?? '', authorRole: comment.author?.role ?? '',
    content: comment.text, type: comment.commentType,
    replies: (comment.replies ?? []).map((reply: any) => toReviewComment(reply, sectionId)) };
}
