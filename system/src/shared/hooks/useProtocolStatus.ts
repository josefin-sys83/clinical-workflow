import { useState, useEffect } from 'react';

interface AmendmentApproval {
  approved: boolean;
  by: string | null;
  at: string | null;
}

export interface LatestAmendment {
  id: string;
  number: number;
  title: string;
  /** 'pending' = draft, 'approved' = approved but not both-signed, 'finalized' = both signed */
  state: 'pending' | 'approved' | 'finalized';
}

interface Amendment {
  id: string;
  number: number;
  title: string;
  status: 'draft' | 'approved' | 'finalized' | 'rejected';
  reason: string;
  description: string;
  affectedProtocolSections: string[];
  createdAt: string;
  createdBy: string;
  approvals?: {
    protocolLead?: AmendmentApproval;
    clinicalAffairsVP?: AmendmentApproval;
  };
}

interface ProtocolStatus {
  protocolFinalized: boolean;
  isLocked: boolean;
  amendments: Amendment[];
  latestAmendment: LatestAmendment | null;
  loading: boolean;
}

function amendmentState(a: Amendment): 'pending' | 'approved' | 'finalized' | null {
  if (a.status === 'draft') return 'pending';
  if (a.status === 'finalized') return 'finalized';
  if (a.status === 'approved') return 'approved';
  return null;
}

export function useProtocolStatus(projectId: string | undefined): ProtocolStatus {
  const [protocolFinalized, setProtocolFinalized] = useState(false);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = '';

  useEffect(() => {
    if (!projectId) return;

    Promise.all([
      fetch(`${apiBase}/api/projects/${projectId}/workflow`).then(r => r.json()).catch(() => null),
      fetch(`${apiBase}/api/projects/${projectId}/amendments`).then(r => r.json()).catch(() => []),
    ]).then(([workflowState, amendmentData]) => {
      if (workflowState?.steps?.['protocol-pdf']?.state === 'final') {
        setProtocolFinalized(true);
      }
      setAmendments(Array.isArray(amendmentData) ? amendmentData : []);
    }).finally(() => setLoading(false));
  }, [projectId]);

  // Highest-numbered non-rejected amendment (draft | approved | finalized)
  const active = amendments
    .filter(a => a.status !== 'rejected')
    .sort((a, b) => b.number - a.number);

  const top = active[0] ?? null;
  const state = top ? amendmentState(top) : null;
  const latestAmendment: LatestAmendment | null = top && state
    ? { id: top.id, number: top.number, title: top.title, state }
    : null;

  // Locked when finalized and there's no amendment currently in progress — a
  // finalized amendment (or no amendment at all) both count as "nothing pending".
  const isLocked = protocolFinalized && (!latestAmendment || latestAmendment.state === 'finalized');

  return { protocolFinalized, isLocked, amendments, latestAmendment, loading };
}
