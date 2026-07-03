import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Lock, Info, CheckCircle2, ShieldCheck, ChevronDown } from 'lucide-react';
import { WorkflowProgressIndicator } from '@/modules/Makeprotokoll/components/workflow-progress-indicator';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';

const pageStyle: React.CSSProperties = {
  background: '#fff',
  width: '210mm',
  minHeight: '297mm',
  padding: '40px 60px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  color: '#111827',
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: '11pt',
  lineHeight: 1.7,
};

const h2Style: React.CSSProperties = {
  color: '#111827',
  fontSize: '16pt',
  fontWeight: 600,
  marginTop: '32px',
  marginBottom: '20px',
  letterSpacing: '-0.01em',
};

const h3Style: React.CSSProperties = {
  color: '#111827',
  fontSize: '13pt',
  fontWeight: 600,
  marginTop: '20px',
  marginBottom: '10px',
};

const paraStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '11pt',
  lineHeight: 1.7,
  marginBottom: '14px',
};

const pageNumStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  right: '60px',
  color: '#9ca3af',
  fontSize: '10pt',
  fontWeight: 400,
};

type AmendmentApproval = {
  approved: boolean;
  by: string | null;
  at: string | null;
};

type Amendment = {
  id: string;
  number: number;
  title: string;
  reason: string;
  description: string;
  affectedProtocolSections: string[];
  status: 'draft' | 'approved' | 'finalized' | 'rejected';
  createdBy: string;
  createdAt: string;
  protocolVersion?: string;
  protocolSnapshot?: Record<string, { title: string; content: string; version: string }>;
  approvals?: {
    protocolLead?: AmendmentApproval;
    clinicalAffairsVP?: AmendmentApproval;
  };
};

type SignatureRecord = {
  id: string;
  projectId: string;
  role: string;
  signerName: string;
  signerEmail: string;
  signerUserId: string;
  documentHash: string;
  signedAt: string;
  ipAddress: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ── Word-level diff (LCS-based) ───────────────────────────────────────────────

type DiffToken = { text: string; type: 'same' | 'removed' | 'added' };

function wordDiff(original: string, amended: string): DiffToken[] {
  const aWords = original.trim().split(/\s+/).filter(Boolean);
  const bWords = amended.trim().split(/\s+/).filter(Boolean);
  const m = aWords.length;
  const n = bWords.length;

  // Fall back to showing both blocks when text is very long (avoids O(m*n) memory spike)
  if (m > 1500 || n > 1500) {
    return [
      { text: original, type: 'removed' },
      { text: amended, type: 'added' },
    ];
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aWords[i - 1] === bWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to build diff tokens
  const tokens: DiffToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aWords[i - 1] === bWords[j - 1]) {
      tokens.unshift({ text: aWords[i - 1], type: 'same' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: bWords[j - 1], type: 'added' });
      j--;
    } else {
      tokens.unshift({ text: aWords[i - 1], type: 'removed' });
      i--;
    }
  }
  return tokens;
}

function WordDiffView({ original, amended }: { original: string; amended: string }) {
  const tokens = wordDiff(original, amended);
  const hasChanges = tokens.some(t => t.type !== 'same');

  if (!hasChanges) {
    return (
      <p style={{ color: '#6b7280', fontSize: '10pt', fontStyle: 'italic' }}>
        No textual changes detected in this section.
      </p>
    );
  }

  return (
    <p style={{ lineHeight: 1.9, fontSize: '10.5pt', color: '#374151', wordBreak: 'break-word' }}>
      {tokens.map((token, idx) => {
        if (token.type === 'same') {
          return <span key={idx}>{token.text}{' '}</span>;
        }
        if (token.type === 'removed') {
          return (
            <span
              key={idx}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                textDecoration: 'line-through',
                padding: '1px 2px',
                borderRadius: '2px',
                marginRight: '2px',
              }}
            >
              {token.text}{' '}
            </span>
          );
        }
        // added
        return (
          <span
            key={idx}
            style={{
              background: '#dcfce7',
              color: '#15803d',
              textDecoration: 'underline',
              padding: '1px 2px',
              borderRadius: '2px',
              marginRight: '2px',
            }}
          >
            {token.text}{' '}
          </span>
        );
      })}
    </p>
  );
}

function MetaTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', margin: '16px 0' }}>
      {rows.map(({ label, value }, i) => (
        <div
          key={label}
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            borderBottom: i < rows.length - 1 ? '1px solid #e5e7eb' : 'none',
          }}
        >
          <div style={{ background: '#f9fafb', borderRight: '1px solid #e5e7eb', padding: '10px 16px', color: '#6b7280', fontWeight: 500, fontSize: '10pt' }}>
            {label}
          </div>
          <div style={{ padding: '10px 16px', color: '#374151', fontSize: '10pt' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// Static signature block used inside each A4 page (print-safe, no interaction)
function DocSignatureBlock({
  heading, name, roleTitle, sig,
}: {
  heading: string;
  name: string;
  roleTitle: string;
  sig?: SignatureRecord;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ color: '#6b7280', fontSize: '10.5pt', marginBottom: '2px' }}>{heading}</div>
      <div style={{
        borderBottom: `1px solid ${sig ? '#374151' : '#d1d5db'}`,
        minHeight: '36px',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'flex-end',
        paddingBottom: '4px',
      }}>
        {sig ? (
          <span style={{ color: '#111827', fontSize: '11pt', fontStyle: 'italic', letterSpacing: '0.02em' }}>
            ✓ {sig.signerName}
          </span>
        ) : (
          <span style={{ color: '#d1d5db', fontSize: '10pt' }}>[Signature]</span>
        )}
      </div>
      <div style={{ color: '#111827', fontSize: '11pt', fontWeight: 600 }}>{name}</div>
      <div style={{ color: '#6b7280', fontSize: '10pt', fontStyle: 'italic' }}>{roleTitle}</div>
      <div style={{ color: sig ? '#374151' : '#9ca3af', fontSize: '10.5pt', marginTop: '4px' }}>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>Date: </span>
        {sig ? fmtDate(sig.signedAt) : '_______________________'}
      </div>
      {sig && (
        <div style={{ color: '#9ca3af', fontSize: '8.5pt', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          SHA-256: {sig.documentHash.slice(0, 16)}…
        </div>
      )}
    </div>
  );
}

export function AmendmentFormPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const apiBase = '';

  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [protocol, setProtocol] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Signature state
  const [signatures, setSignatures] = useState<{
    'amendment-lead'?: SignatureRecord;
    'amendment-vp'?: SignatureRecord;
  }>({});
  const [confirmingAs, setConfirmingAs] = useState<'amendment-lead' | 'amendment-vp' | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [documentHash, setDocumentHash] = useState('');
  const [saving, setSaving] = useState(false);

  // Sidebar expand state
  const [expandedAmendmentId, setExpandedAmendmentId] = useState<string | null>(null);

  // Request changes state
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [requestChangesComment, setRequestChangesComment] = useState('');
  const [requestChangesSubmitting, setRequestChangesSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      fetch(`${apiBase}/api/projects/${projectId}`).then(r => r.json()),
      fetch(`${apiBase}/api/projects/${projectId}/amendments`).then(r => r.json()),
    ])
      .then(([project, amds]) => {
        if (project.data?.projectData) setProjectData(project.data.projectData);
        setRoles(project?.data?.roles || project?.data?.projectData?.roles || []);
        if (project.data?.protocol) setProtocol(project.data.protocol);
        setAmendments(
          Array.isArray(amds) ? amds.filter((a: Amendment) => a.status === 'approved' || a.status === 'finalized') : []
        );
        // Restore persisted amendment signatures
        if (Array.isArray(project.data?.signatures)) {
          const map: { 'amendment-lead'?: SignatureRecord; 'amendment-vp'?: SignatureRecord } = {};
          for (const s of project.data.signatures as SignatureRecord[]) {
            if (s.role === 'amendment-lead' || s.role === 'amendment-vp') {
              map[s.role] = s;
            }
          }
          setSignatures(map);
        }
      })
      .catch(err => console.error('[AmendmentForm] fetch error:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Compute document hash from amendment data
  useEffect(() => {
    if (!projectId || amendments.length === 0) return;
    const canonical = [
      `project:${projectId}`,
      `amendments:${amendments.map(a => `${a.id}|${a.title}|${a.status}`).join(',')}`,
    ].join('\n');
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(canonical))
      .then(buf => {
        const hex = Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        setDocumentHash(hex);
      })
      .catch(() => {});
  }, [projectId, amendments]);

  const protocolLeadRole =
    roles.find(r => r.title === 'Protocol Lead') ||
    roles.find(r => r.title === 'Principal Investigator');
  const clinicalVPRole =
    roles.find(r => r.title === 'Clinical Affairs VP') ||
    roles.find(r => r.title === 'Regulatory Affairs');

  const protocolLeadName = protocolLeadRole?.assignedTo?.[0]?.name || 'Not assigned';
  const protocolLeadTitle = protocolLeadRole?.title || 'Protocol Lead';
  const protocolLeadEmail = protocolLeadRole?.assignedTo?.[0]?.email || '';
  const clinicalVPName = clinicalVPRole?.assignedTo?.[0]?.name || 'Not assigned';
  const clinicalVPTitle = clinicalVPRole?.title || 'Clinical Affairs VP';
  const clinicalVPEmail = clinicalVPRole?.assignedTo?.[0]?.email || '';

  const projectName = projectData?.projectName || projectId || 'Clinical Investigation';
  const protocolNumber =
    projectData?.protocolNumber ||
    `CIP-${new Date().getFullYear()}-${(projectId || 'XXXX').slice(0, 8).toUpperCase()}`;

  const sections: any[] = protocol?.sections || [];
  const getSectionTitle = (sectionId: string) => {
    const s = sections.find((sec: any) => sec.id === sectionId);
    return s?.title || sectionId;
  };

  // Confirm-gate: checkbox AND exact name match required
  const expectedName = confirmingAs === 'amendment-lead' ? protocolLeadName : clinicalVPName;
  const nameMatches = confirmNameInput.trim() === expectedName.trim();
  const canSign = confirmChecked && nameMatches && !!documentHash && !saving;
  const hashPreview = documentHash ? `${documentHash.slice(0, 16)}…` : 'computing…';

  const handleSignClick = (role: 'amendment-lead' | 'amendment-vp') => {
    setConfirmChecked(false);
    setConfirmNameInput('');
    setConfirmingAs(role);
  };

  const handleConfirmSign = async () => {
    if (!confirmingAs || !projectId) return;
    const signerName = confirmingAs === 'amendment-lead' ? protocolLeadName : clinicalVPName;
    const signerEmail = confirmingAs === 'amendment-lead' ? protocolLeadEmail : clinicalVPEmail;
    const which = confirmingAs;

    setConfirmingAs(null);
    setConfirmNameInput('');
    setConfirmChecked(false);
    setSaving(true);

    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: which,
          signerName,
          signerEmail,
          signerUserId: signerEmail || signerName,
          documentHash,
        }),
      });
      if (res.ok) {
        const record: SignatureRecord = await res.json();
        const newSigs = { ...signatures, [which]: record };
        setSignatures(newSigs);

        // Both signatures now present — finalize all approved amendments
        if (newSigs['amendment-lead'] && newSigs['amendment-vp']) {
          await Promise.all(
            amendments.map(a =>
              fetch(`${apiBase}/api/projects/${projectId}/amendments/${a.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'finalize' }),
              })
            )
          );
          setAmendments(prev => prev.map(a => ({ ...a, status: 'finalized' })));
        }
      }
    } catch (e) {
      console.error('[AmendmentForm] Signature error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequestChanges = async () => {
    if (!requestChangesComment.trim() || !projectId) return;
    setRequestChangesSubmitting(true);
    try {
      await fetch(`${apiBase}/api/projects/${projectId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'changes_requested',
          message: `Request Changes (Amendment Form): ${requestChangesComment.trim()}`,
          stepId: 'protocol-pdf',
          actorUserId: protocolLeadName,
          metadataJson: JSON.stringify({ comment: requestChangesComment.trim() }),
        }),
      });
      navigate(`/projects/${projectId}/workflow/protocol/make`);
    } catch (e) {
      console.error('Request changes failed', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setRequestChangesSubmitting(false);
      setShowRequestChangesDialog(false);
      setRequestChangesComment('');
    }
  };

  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.id = 'print-override';
    style.textContent = `
@media print {
  body * { visibility: hidden !important; }
  #amendment-print-root, #amendment-print-root * { visibility: visible !important; }
  #amendment-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
  @page { margin: 15mm; size: A4; }
}
`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const s = document.getElementById('print-override');
      if (s) s.remove();
    }, 1000);
  };

  const bothSigned = !!(signatures['amendment-lead'] && signatures['amendment-vp']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <WorkflowProgressIndicator currentStep="protocol-approval" />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Main scrollable content ── */}
      <div style={{ background: '#e5e7eb', flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div
          id="amendment-print-root"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
        >
          {/* Header banner */}
          <div style={{ width: '210mm', marginBottom: '32px' }}>
            <div style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb', padding: '32px 60px' }}>
              <h1 style={{ color: '#1f2937', fontSize: '20pt', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                Protocol Amendment Form
              </h1>
              <p style={{ color: '#6b7280', fontSize: '12pt', margin: 0, lineHeight: 1.5 }}>
                Formal record of approved amendments to the Clinical Investigation Protocol
              </p>
              {loading && (
                <p style={{ color: '#9ca3af', fontSize: '11pt', marginTop: '8px' }}>Loading data…</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '210mm', margin: '0 auto' }}>

            {/* PAGE 1: Cover page */}
            <div style={pageStyle}>
              <section style={{ paddingTop: '60px' }}>
                <h1 style={{ color: '#111827', fontSize: '22pt', fontWeight: 600, marginBottom: '48px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  Protocol Amendment Form
                </h1>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '32px' }}>
                  {[
                    { label: 'Project', value: projectName },
                    { label: 'Protocol Number', value: protocolNumber },
                    { label: 'Total Amendments', value: String(amendments.length) },
                    {
                      label: 'Date Generated',
                      value: new Date().toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      }),
                    },
                  ].map(({ label, value }) => (
                    <p key={label} style={{ color: '#111827', margin: '14px 0', fontSize: '11pt', lineHeight: 1.6 }}>
                      <strong style={{ color: '#6b7280', fontWeight: 500, display: 'inline-block', minWidth: '200px' }}>
                        {label}:
                      </strong>
                      {value}
                    </p>
                  ))}
                </div>

                {amendments.length === 0 && !loading && (
                  <div style={{ marginTop: '32px', padding: '24px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic', marginBottom: 0 }}>
                      No approved amendments found for this project.
                    </p>
                  </div>
                )}
              </section>
              <div style={pageNumStyle}>Page 1</div>
            </div>

            {/* One A4 page (or more) per approved amendment */}
            {amendments.map((amendment, idx) => {
              const dateApproved =
                amendment.approvals?.protocolLead?.at
                  ? fmtDateShort(amendment.approvals.protocolLead.at)
                  : amendment.approvals?.clinicalAffairsVP?.at
                    ? fmtDateShort(amendment.approvals.clinicalAffairsVP.at)
                    : '—';
              const protoVersion = amendment.protocolVersion || '1.0';

              return (
                <div key={amendment.id} style={pageStyle}>
                  <section style={{ marginBottom: '40px' }}>
                    {/* Badge */}
                    <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px 16px', marginBottom: '8px' }}>
                      <div style={{ color: '#1e40af', fontWeight: 600, fontSize: '11pt' }}>
                        Amendment {amendment.number}
                      </div>
                      <div style={{ color: '#3b82f6', fontSize: '10pt' }}>Approved Protocol Amendment</div>
                    </div>

                    <h2 style={h2Style}>
                      Amendment #{amendment.number} to Protocol Version {protoVersion}
                    </h2>
                    <p style={{ ...paraStyle, color: '#6b7280', fontSize: '10pt', marginTop: '-12px' }}>
                      {amendment.title}
                    </p>

                    <MetaTable
                      rows={[
                        { label: 'Amendment Number', value: `Amendment ${amendment.number}` },
                        { label: 'Protocol Version', value: protoVersion },
                        { label: 'Title', value: amendment.title },
                        { label: 'Date Initiated', value: fmtDateShort(amendment.createdAt) },
                        { label: 'Date Approved', value: dateApproved },
                        { label: 'Initiated By', value: amendment.createdBy },
                        { label: 'Approved By (Protocol Lead)', value: amendment.approvals?.protocolLead?.by || '—' },
                        { label: 'Approved By (Clinical Affairs VP)', value: amendment.approvals?.clinicalAffairsVP?.by || '—' },
                      ]}
                    />

                    <h3 style={h3Style}>Reason for Amendment</h3>
                    <p style={paraStyle}>{amendment.reason}</p>

                    <h3 style={h3Style}>Description of Changes</h3>
                    <p style={paraStyle}>{amendment.description}</p>

                    {/* Regulatory compliance note */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      margin: '20px 0',
                    }}>
                      <span style={{ fontSize: '13pt', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>⚠</span>
                      <p style={{ margin: 0, fontSize: '9.5pt', color: '#78350f', lineHeight: 1.6 }}>
                        <strong>Regulatory Notice:</strong> Substantial amendments must be notified to the competent
                        authority before implementation per <strong>EU MDR 2017/745 Article 75</strong> and{' '}
                        <strong>FDA 21 CFR 812.35</strong>. Non-substantial amendments must be documented and
                        available for inspection.
                      </p>
                    </div>

                    {/* Track-changes section diffs */}
                    {amendment.affectedProtocolSections.length > 0 && (
                      <>
                        <h3 style={{ ...h3Style, marginTop: '28px' }}>Protocol Section Changes (Track Changes)</h3>
                        <p style={{ ...paraStyle, fontSize: '9.5pt', color: '#6b7280', marginTop: '-6px' }}>
                          <span style={{ background: '#fee2e2', color: '#b91c1c', textDecoration: 'line-through', padding: '0 4px', borderRadius: '2px', marginRight: '8px' }}>Removed text</span>
                          <span style={{ background: '#dcfce7', color: '#15803d', textDecoration: 'underline', padding: '0 4px', borderRadius: '2px' }}>Added text</span>
                        </p>

                        {amendment.affectedProtocolSections.map(sectionId => {
                          const snapshot = amendment.protocolSnapshot?.[sectionId];
                          const currentSection = sections.find((s: any) => s.id === sectionId);
                          const originalContent = snapshot?.content ?? '';
                          const amendedContent = currentSection?.content ?? '';
                          const sectionTitle = snapshot?.title || getSectionTitle(sectionId);

                          return (
                            <div
                              key={sectionId}
                              style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '10px',
                              }}>
                                <span style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '9pt',
                                  color: '#64748b',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}>
                                  Section {sectionId}
                                </span>
                                <span style={{ fontSize: '11pt', fontWeight: 600, color: '#1e293b' }}>
                                  {sectionTitle}
                                </span>
                              </div>

                              {!snapshot ? (
                                <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic', fontSize: '10pt' }}>
                                  Snapshot not available — this amendment was created before snapshot capture was enabled.
                                  Current section content is shown below for reference.
                                </p>
                              ) : originalContent === '' && amendedContent === '' ? (
                                <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic', fontSize: '10pt' }}>
                                  No content in this section.
                                </p>
                              ) : (
                                <WordDiffView original={originalContent} amended={amendedContent} />
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </section>
                  <div style={pageNumStyle}>Page {idx + 2}</div>
                </div>
              );
            })}

            {/* Signature page (static, print-safe) */}
            <div style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Authorization Signatures</h2>
                <p style={paraStyle}>
                  The undersigned confirm that all amendments listed in this document have been reviewed,
                  evaluated, and approved in accordance with ISO 14155:2020 and EU MDR 2017/745.
                  This signed form constitutes the formal regulatory record of the protocol amendments.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '48px' }}>
                  <DocSignatureBlock
                    heading="Protocol Lead"
                    name={protocolLeadName}
                    roleTitle={protocolLeadTitle}
                    sig={signatures['amendment-lead']}
                  />
                  <DocSignatureBlock
                    heading="Clinical Affairs VP"
                    name={clinicalVPName}
                    roleTitle={clinicalVPTitle}
                    sig={signatures['amendment-vp']}
                  />
                </div>
              </section>
              <div style={pageNumStyle}>Page {amendments.length + 2}</div>
            </div>

            {/* Document footer */}
            <div style={{
              color: '#9ca3af',
              textAlign: 'center',
              background: '#fff',
              borderTop: '1px solid #e5e7eb',
              padding: '24px 60px',
              fontSize: '10pt',
              lineHeight: 1.5,
            }}>
              This amendment form was system-generated on{' '}
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </div>

            {/* Amendment Finalization panel */}
            <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '32px 60px 48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ color: '#0f172a', borderBottom: '2px solid #e5e7eb', margin: 0, paddingBottom: '8px', fontSize: '18px', fontWeight: 600, fontFamily: 'inherit' }}>
                  Amendment Finalization
                </h3>

                {/* Request changes */}
                <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Changes needed to the protocol? Return to authoring to update affected sections.
                  </p>
                  <button
                    onClick={() => setShowRequestChangesDialog(true)}
                    style={{ cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                  >
                    <Info size={16} style={{ color: '#6b7280' }} />
                    Request Changes
                  </button>
                </div>

                {/* Signature rows */}
                <div>
                  <h4 style={{ color: '#374151', fontSize: '14px', fontWeight: 600, margin: '0 0 16px', fontFamily: 'inherit' }}>
                    Required Signatures
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {([
                      { slotKey: 'amendment-lead' as const, label: 'Protocol Lead', name: protocolLeadName, roleTitle: protocolLeadTitle, sig: signatures['amendment-lead'] },
                      { slotKey: 'amendment-vp'   as const, label: 'Clinical Affairs VP', name: clinicalVPName, roleTitle: clinicalVPTitle, sig: signatures['amendment-vp'] },
                    ]).map(({ slotKey, label, name, roleTitle, sig }) => (
                      <div
                        key={slotKey}
                        style={{ background: '#fff', border: `1px solid ${sig ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ color: '#6b7280', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                          <span style={{ color: '#111827', fontSize: '14px', fontWeight: 600 }}>{name}</span>
                          <span style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>{roleTitle}</span>
                          {sig && <span style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>Signed {fmtDate(sig.signedAt)}</span>}
                        </div>
                        {sig ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <CheckCircle2 size={16} style={{ color: '#2563eb' }} />
                            <span style={{ padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: '#dbeafe', color: '#1e40af', whiteSpace: 'nowrap' }}>Signed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSignClick(slotKey)}
                            disabled={saving}
                            style={{ flexShrink: 0, cursor: saving ? 'wait' : 'pointer', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                          >
                            Click to Sign
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Export */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={handleExportPDF}
                    style={{ cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '14px 28px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}
                  >
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    Export Locked PDF
                  </button>
                </div>
                {!bothSigned && (
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, textAlign: 'right', maxWidth: '420px', lineHeight: 1.5 }}>
                    Both signatures are required to finalize the amendment form.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* ── end main content ── */}

      {/* ── Right sidebar: Amendment List ── */}
      <div style={{ width: '320px', flexShrink: 0, background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>Amendment List</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            {amendments.length} approved amendment{amendments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {amendments.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No approved amendments</p>
            </div>
          ) : (
            amendments.map(amendment => {
              const isExpanded = expandedAmendmentId === amendment.id;
              const dateApproved =
                amendment.approvals?.protocolLead?.at
                  ? fmtDateShort(amendment.approvals.protocolLead.at)
                  : amendment.approvals?.clinicalAffairsVP?.at
                    ? fmtDateShort(amendment.approvals.clinicalAffairsVP.at)
                    : null;
              const approvedBy =
                [amendment.approvals?.protocolLead?.by, amendment.approvals?.clinicalAffairsVP?.by]
                  .filter(Boolean)
                  .join(', ') || '—';

              return (
                <div key={amendment.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Collapsed row — always visible */}
                  <button
                    onClick={() => setExpandedAmendmentId(isExpanded ? null : amendment.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: isExpanded ? '#f8fafc' : '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{
                      color: '#1d4ed8',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: '#dbeafe',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      #{amendment.number}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', lineHeight: 1.4, marginBottom: '2px' }}>
                        {amendment.title}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        <span style={{
                          fontWeight: 600,
                          color: bothSigned ? '#1d4ed8' : '#2563eb',
                        }}>
                          {bothSigned ? 'Finalized' : 'Approved'}
                        </span>
                        {dateApproved && (
                          <span style={{ color: '#94a3b8' }}> · {dateApproved}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      size={14}
                      style={{
                        color: '#94a3b8',
                        flexShrink: 0,
                        marginTop: '3px',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                      }}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', background: '#f8fafc' }}>
                      {/* Approved by */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Approved By</div>
                        <div style={{ fontSize: '12px', color: '#374151' }}>{approvedBy}</div>
                      </div>

                      {/* Date approved */}
                      {dateApproved && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Date Approved</div>
                          <div style={{ fontSize: '12px', color: '#374151' }}>{dateApproved}</div>
                        </div>
                      )}

                      {/* Reason */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Reason</div>
                        <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{amendment.reason}</div>
                      </div>

                      {/* Description */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Description</div>
                        <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{amendment.description}</div>
                      </div>

                      {/* Affected sections */}
                      {amendment.affectedProtocolSections.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Affected Sections</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {amendment.affectedProtocolSections.map(sectionId => (
                              <div key={sectionId} style={{ fontSize: '11px', color: '#475569', background: '#e2e8f0', borderRadius: '3px', padding: '2px 6px', display: 'inline-block', alignSelf: 'flex-start' }}>
                                {getSectionTitle(sectionId)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* ── end sidebar ── */}

      </div>{/* ── end flex row ── */}

      {/* E-Signature Confirmation Dialog */}
      {confirmingAs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '520px',
            width: '100%',
            margin: '0 20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ background: '#1e3a5f', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={22} style={{ color: '#93c5fd', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Electronic Signature</div>
                <div style={{ color: '#93c5fd', fontSize: '12px', marginTop: '2px' }}>
                  21 CFR Part 11 · EU MDR 2017/745
                </div>
              </div>
            </div>

            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Signer identity card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {confirmingAs === 'amendment-lead' ? 'Protocol Lead' : 'Clinical Affairs VP'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{expectedName}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', marginTop: '2px' }}>
                  {confirmingAs === 'amendment-lead' ? protocolLeadTitle : clinicalVPTitle}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    <span style={{ fontWeight: 500 }}>Date / Time: </span>
                    {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                    <span style={{ fontWeight: 500, fontFamily: 'inherit' }}>Document hash: </span>
                    {hashPreview}
                  </div>
                </div>
              </div>

              {/* Legal notice */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 16px', fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>
                By signing, you confirm your identity and agree that this signature is the legal
                equivalent of your handwritten signature on this document. Your name, role, the
                date and time, and a cryptographic hash of the document content will be
                permanently recorded in the audit trail.
              </div>

              {/* Name confirmation input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Type your full name to confirm
                </label>
                <input
                  type="text"
                  value={confirmNameInput}
                  onChange={e => setConfirmNameInput(e.target.value)}
                  placeholder={expectedName}
                  autoFocus
                  style={{
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: `1px solid ${confirmNameInput.length > 0 && !nameMatches ? '#f87171' : '#d1d5db'}`,
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {confirmNameInput.length > 0 && !nameMatches && (
                  <div style={{ fontSize: '12px', color: '#dc2626' }}>
                    Name must match exactly: <strong>{expectedName}</strong>
                  </div>
                )}
              </div>

              {/* Checkbox consent */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={e => setConfirmChecked(e.target.checked)}
                  style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                  I confirm I am <strong>{expectedName}</strong> and I authorize this electronic signature on this amendment form.
                </span>
              </label>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  onClick={() => { setConfirmingAs(null); setConfirmNameInput(''); setConfirmChecked(false); }}
                  style={{ cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSign}
                  disabled={!canSign}
                  style={{
                    cursor: canSign ? 'pointer' : 'not-allowed',
                    background: canSign ? '#1e40af' : '#e5e7eb',
                    color: canSign ? '#fff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {saving ? 'Signing…' : 'Sign Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Dialog */}
      {showRequestChangesDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Request Changes</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Describe what needs to be corrected. This will be logged in the audit trail and you will be returned to protocol authoring.
            </p>
            <textarea
              value={requestChangesComment}
              onChange={e => setRequestChangesComment(e.target.value)}
              placeholder="Describe the required changes..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
            {!requestChangesComment.trim() && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>A comment is required before requesting changes.</p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => { setShowRequestChangesDialog(false); setRequestChangesComment(''); }}
                style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequestChanges}
                disabled={!requestChangesComment.trim() || requestChangesSubmitting}
                style={{ padding: '10px 20px', background: requestChangesComment.trim() && !requestChangesSubmitting ? '#0f172a' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: requestChangesComment.trim() && !requestChangesSubmitting ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500 }}
              >
                {requestChangesSubmitting ? 'Submitting…' : 'Request Changes & Return to Authoring'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MilestoneBanner projectId={projectId!} currentStepId="protocol-amendment" />
    </div>
  );
}
