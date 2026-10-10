import { ApiError } from '@/shared/api/http';

export type SavedSection = { content: string; revision: number; updatedAt?: string };
export type SectionConflict = { sectionId: string; current: SavedSection | null; message: string };
export type SectionDraft = {
  content: string;
  baseContent: string;
  expectedRevision: number;
  reason?: string;
};

export function sectionConflict(error: unknown): SectionConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const payload = error.payload as any;
  if (payload?.code !== 'SECTION_REVISION_CONFLICT') return null;
  return payload;
}

/** Session storage keeps each tab's draft separate and restores it after refresh. */
export function sectionDraftKey(kind: 'protocol' | 'report', projectId: string, owner: string, sectionId: string) {
  return `section-draft:${JSON.stringify([kind, projectId, owner, sectionId])}`;
}

export function readSectionDraft(key: string): SectionDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    return value && typeof value.content === 'string' && typeof value.baseContent === 'string' &&
      Number.isInteger(value.expectedRevision) && value.expectedRevision >= 0 ? value : null;
  } catch { return null; }
}

export function writeSectionDraft(key: string, draft: SectionDraft) {
  // A storage failure must never prevent editing or replace the live draft.
  try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* The editor still holds the text. */ }
}

export function clearSectionDraft(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* The saved text remains authoritative. */ }
}
