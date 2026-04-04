import { apiFetch } from './http';

export type FinalizeResponse = {
  artifactId: string;
  sha256: string;
  fileName: string;
  finalizedBy?: { userId: string | null; roles: string[] | null };
  downloadUrl: string;
};

export async function finalizeDocument(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  note?: string;
}): Promise<FinalizeResponse> {
  return apiFetch<FinalizeResponse>(`/projects/${args.projectId}/documents/${args.docType}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ note: args.note }),
  });
}

export type VerifyResponse = {
  artifactId: string;
  sha256Stored: string;
  sha256Computed: string;
  match: boolean;
};

export async function verifyDocumentArtifact(args: {
  projectId: string;
  artifactId: string;
}): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>(
    `/projects/${args.projectId}/documents/artifacts/${args.artifactId}/verify`,
  );
}

export type SignatureRecord = {
  signatureId: string;
  artifactId?: string;
  signedAt: string;
  signedBy: { userId: string; roles: string[] };
  algorithm: string;
  keyId: string;
  match?: boolean;
};

export async function signArtifact(args: {
  projectId: string;
  artifactId: string;
}): Promise<SignatureRecord> {
  return apiFetch<SignatureRecord>(
    `/projects/${args.projectId}/documents/artifacts/${args.artifactId}/sign`,
    { method: 'POST' },
  );
}

export async function listArtifactSignatures(args: {
  projectId: string;
  artifactId: string;
}): Promise<SignatureRecord[]> {
  return apiFetch<SignatureRecord[]>(
    `/projects/${args.projectId}/documents/artifacts/${args.artifactId}/signatures`,
  );
}

export type VerifyChainResponse = {
  artifact: {
    artifactId: string;
    sha256Stored: string;
    sha256Computed: string;
    match: boolean;
  };
  signatures: Array<SignatureRecord & { match: boolean }>;
};

export async function verifySignatureChain(args: {
  projectId: string;
  artifactId: string;
}): Promise<VerifyChainResponse> {
  return apiFetch<VerifyChainResponse>(
    `/projects/${args.projectId}/documents/artifacts/${args.artifactId}/verify-chain`,
  );
}


// -------------------------
// Addendums (appendices)
// -------------------------

export type AddendumApproval = {
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  actorUserId?: string | null;
  actedAt?: string | null;
  comment?: string | null;
};

export type AddendumFile = {
  id: string;
  filename: string;
  mimeType: string;
  uploadedByUserId?: string | null;
  uploadedAt: string;
};

export type AddendumRecord = {
  id: string;
  projectId: string;
  docType: 'protocol' | 'report';
  releaseArtifactId: string;
  letter: string;
  title: string;
  description?: string | null;
  changeReason: string;
  status: 'draft' | 'in_review' | 'approved' | 'signed' | 'locked';
  signedArtifactId?: string | null;
  lockedAt?: string | null;
  approvals?: AddendumApproval[];
  files?: AddendumFile[];
};

export async function listAddendums(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  releaseArtifactId: string;
}): Promise<AddendumRecord[]> {
  return apiFetch<AddendumRecord[]>(
    `/projects/${args.projectId}/documents/${args.docType}/releases/${args.releaseArtifactId}/addendums`,
  );
}

export async function createAddendum(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  releaseArtifactId: string;
  title: string;
  description?: string;
  changeReason: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(
    `/projects/${args.projectId}/documents/${args.docType}/releases/${args.releaseArtifactId}/addendums`,
    { method: 'POST', body: JSON.stringify({ title: args.title, description: args.description, changeReason: args.changeReason }) },
  );
}

export async function getAddendum(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}`);
}

export async function updateAddendum(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
  title?: string;
  description?: string;
  changeReason?: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: args.title, description: args.description, changeReason: args.changeReason }),
  });
}

export async function startAddendumReview(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/start-review`, { method: 'POST' });
}

export async function approveAddendumReview(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
  approve: boolean;
  comment?: string;
}): Promise<AddendumRecord> {
  const path = args.approve ? 'approve' : 'reject';
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/review/${path}`, {
    method: 'POST',
    body: JSON.stringify({ comment: args.comment }),
  });
}

export async function signAddendum(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/sign`, { method: 'POST' });
}

export async function lockAddendum(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
}): Promise<AddendumRecord> {
  return apiFetch<AddendumRecord>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/lock`, { method: 'POST' });
}

export async function listAddendumFiles(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
}): Promise<AddendumFile[]> {
  return apiFetch<AddendumFile[]>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/files`);
}

export async function uploadAddendumFile(args: {
  projectId: string;
  docType: 'protocol' | 'report';
  addendumId: string;
  file: File;
}): Promise<AddendumFile[]> {
  const form = new FormData();
  form.append('file', args.file);
  return apiFetch<AddendumFile[]>(`/projects/${args.projectId}/documents/${args.docType}/addendums/${args.addendumId}/files`, {
    method: 'POST',
    body: form,
    headers: {}, // let browser set multipart boundary
  } as any);
}
