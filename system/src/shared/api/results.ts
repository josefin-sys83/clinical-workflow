import { apiFetch, ApiError } from './http';
import { getToken } from '@/shared/auth/token';

export type ResultStatus = 'draft' | 'accepted' | 'in-appendix' | 'rejected';
export type ResultType = 'table' | 'figure' | 'listing';
export type ResultInput = {
  title: string;
  type: ResultType;
  content: Record<string, unknown>;
  description?: string;
  sourceFilename: string;
  sourceLocation?: string;
  reportSectionId?: string | null;
};
export type StudyResult = ResultInput & {
  id: string;
  version: number;
  status: ResultStatus;
  reportNumber: number;
  placement: 'unplaced' | 'main' | 'appendix' | 'both';
  titleOrigin: 'ai' | 'human';
  sectionOrigin: 'ai' | 'human';
  descriptionOrigin: 'ai' | 'human';
  lastDecision: {
    decision: string;
    reason: string | null;
    userId: string;
    decidedAt: string;
  } | null;
};
export type SupportingDocument = {
  id: string;
  type: 'sap' | 'tfl';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  uploaderName: string;
  uploadedAt: string;
};
export type ResultsWorkspace = {
  results: StudyResult[];
  supportingDocuments: SupportingDocument[];
  sections: { id: string; title: string }[];
  locked: boolean;
};

const base = (projectId: string) =>
  `/projects/${encodeURIComponent(projectId)}/results`;
export const getResultsWorkspace = (projectId: string) =>
  apiFetch<ResultsWorkspace>(`${base(projectId)}/workspace`, {
    cache: 'no-store',
  });
export const createResult = (projectId: string, body: ResultInput) =>
  apiFetch<StudyResult>(base(projectId), {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const updateResult = (
  projectId: string,
  result: StudyResult,
  body: Partial<Omit<ResultInput, 'type'>> & {
    placement?: StudyResult['placement'];
  },
) =>
  apiFetch<StudyResult>(`${base(projectId)}/${result.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...body, expectedVersion: result.version }),
  });
export const decideResult = (
  projectId: string,
  result: StudyResult,
  decision: 'accept' | 'appendix' | 'reject',
  reason: string,
  both: boolean,
) =>
  apiFetch<StudyResult>(`${base(projectId)}/${result.id}/decisions`, {
    method: 'POST',
    body: JSON.stringify({
      decision,
      expectedVersion: result.version,
      reason,
      ...(decision === 'accept' && both ? { placement: 'both' } : {}),
    }),
  });
export const assignResultSection = (
  projectId: string,
  result: StudyResult,
  reportSectionId: string | null,
) =>
  apiFetch<StudyResult>(`${base(projectId)}/${result.id}/section`, {
    method: 'PATCH',
    body: JSON.stringify({ expectedVersion: result.version, reportSectionId }),
  });
export const parseResultTable = (projectId: string, text: string) =>
  apiFetch<{ headers: string[]; rows: string[][] }>(
    `${base(projectId)}/parse-table`,
    { method: 'POST', body: JSON.stringify({ text }) },
  );
export function previewResultUpload(projectId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<{ drafts: ResultInput[]; issues: string[] }>(
    `${base(projectId)}/preview`,
    {
      method: 'POST',
      body,
    },
  );
}
export function uploadSupportingDocument(
  projectId: string,
  type: 'sap' | 'tfl',
  file: File,
  description: string,
) {
  const body = new FormData();
  body.append('file', file);
  body.append('type', type);
  body.append('description', description);
  return apiFetch<{ id: string }>(`${base(projectId)}/supporting-documents`, {
    method: 'POST',
    body,
  });
}
export const removeSupportingDocument = (projectId: string, id: string) =>
  apiFetch<void>(`${base(projectId)}/supporting-documents/${id}`, {
    method: 'DELETE',
  });
export async function downloadSupportingDocument(
  projectId: string,
  document: SupportingDocument,
) {
  const response = await fetch(
    `/api${base(projectId)}/supporting-documents/${document.id}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  if (!response.ok) throw new ApiError('Download failed', response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
