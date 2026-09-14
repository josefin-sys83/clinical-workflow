import { apiFetch } from './http';

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
