import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Lock, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { WorkflowProgressIndicator } from '@/modules/Makeprotokoll/components/workflow-progress-indicator';
import { advanceWorkflowStep, WorkflowStepBlockedError } from '@/shared/services/workflowService';

// ─── Inline document styles (A4 paper layout preserved for print/PDF) ─────────

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

const paraStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '11pt',
  lineHeight: 1.7,
  marginBottom: '14px',
  textAlign: 'left',
};

const pageNumStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  right: '60px',
  color: '#9ca3af',
  fontSize: '10pt',
  fontWeight: 400,
};

// Full signature record as stored in and returned from the backend
type SignatureRecord = {
  id: string;
  projectId: string;
  role: string;
  signerName: string;
  signerEmail: string;
  signerUserId: string;
  documentHash: string;
  signedAt: string; // ISO timestamp
  ipAddress: string;
};

/** Format an ISO timestamp for human display */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function hasHtmlMarkup(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

function sanitizeProtocolHtml(content: string): string {
  const sanitized = DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['style'],
  });
  // Word/editor imports sometimes store every paragraph as an adjacent root-level
  // <span> with no <p> or <br>. Preserve inline spans inside real block elements, but
  // give those root spans paragraph separation in the approval document.
  const container = document.createElement('div');
  container.innerHTML = sanitized;
  const children = Array.from(container.children);
  if (children.length > 1 && children.every((child) => child.tagName === 'SPAN')) {
    children.slice(1).forEach((child) => child.before(document.createElement('br')));
  }
  return container.innerHTML;
}

function protocolPlainText(content: string): string {
  if (!hasHtmlMarkup(content)) return content;
  const container = document.createElement('div');
  container.innerHTML = sanitizeProtocolHtml(content);
  return container.textContent || '';
}

export function ProtocolDocument() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const apiBase = ''; // relative URL — routes through Vite /api proxy

  // ── Signature state ────────────────────────────────────────────────────────
  const [signatures, setSignatures] = useState<{
    investigator?: SignatureRecord;
    sponsor?: SignatureRecord;
  }>({});
  const [confirmingAs, setConfirmingAs] = useState<'investigator' | 'sponsor' | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [signError, setSignError] = useState<string | null>(null);

  // ── Document integrity hash ────────────────────────────────────────────────
  const [documentHash, setDocumentHash] = useState('');

  // ── Project data state ─────────────────────────────────────────────────────
  const [projectData, setProjectData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [protocol, setProtocol] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [requestChangesComment, setRequestChangesComment] = useState('');
  const [requestChangesSubmitting, setRequestChangesSubmitting] = useState(false);
  const [hasApprovedAmendments, setHasApprovedAmendments] = useState(false);

  // ── Fetch real project data ────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`${apiBase}/api/projects/${projectId}`)
      .then(r => r.json())
      .then(p => {
        console.log('[PdfProtocol] full project response:', JSON.stringify(p, null, 2));
        console.log('[PdfProtocol] roles (data.roles):', p?.data?.roles);

        setProjectData({
          ...(p.data?.projectData || {}),
          projectName: p.name,
          deviceCategory: p.deviceCategory,
          targetMarkets: p.targetMarkets || [],
        });

        const fetchedRoles =
          p?.roles ||
          [];
        setRoles(fetchedRoles);

        if (p.data?.protocol) setProtocol(p.data.protocol);

        // Restore persisted signatures — backend stores them as an array;
        // map back to { investigator?, sponsor? } for UI convenience.
        if (Array.isArray(p.data?.signatures)) {
          const map: { investigator?: SignatureRecord; sponsor?: SignatureRecord } = {};
          for (const s of p.data.signatures as SignatureRecord[]) {
            if (s.role === 'investigator' || s.role === 'sponsor') map[s.role] = s;
          }
          setSignatures(map);
        }
      })
      .catch((err) => console.error('[PdfProtocol] fetch error:', err))
      .finally(() => setLoading(false));

    fetch(`${apiBase}/api/projects/${projectId}/amendments`)
      .then(r => r.json())
      .then((amds: any[]) => {
        setHasApprovedAmendments(Array.isArray(amds) && amds.some((a: any) => a.status === 'approved'));
      })
      .catch(() => {});
  }, [projectId]);

  // ── Derive display values from real data ───────────────────────────────────

  // Principal Investigator — falls back to Protocol Lead for older projects
  const piRole =
    roles.find(r => r.title === 'Principal Investigator') ||
    roles.find(r => r.title === 'Protocol Lead');
  const piName = piRole?.assignedTo?.[0]?.name || 'Not assigned';
  const piAffiliation = piRole?.assignedTo?.[0]?.email || '';
  const piRoleTitle = piRole?.title || 'Principal Investigator';

  // Sponsor Representative — falls back to Regulatory Affairs for older projects
  const vpRole =
    roles.find(r => r.title === 'Clinical Affairs VP') ||
    roles.find(r => r.title === 'Regulatory Affairs');
  const vpName = vpRole?.assignedTo?.[0]?.name || 'Not assigned';
  const vpAffiliation = vpRole?.assignedTo?.[0]?.email || '';
  const vpRoleTitle = vpRole?.title || 'Clinical Affairs VP';

  // Protocol metadata
  const projectName = projectData?.projectName || projectId || 'Clinical Investigation';
  const deviceName = projectData?.deviceName || '';
  const sponsor = projectData?.sponsor || projectData?.sponsorName || '';
  const indication = projectData?.indication || '';
  const targetMarkets = (projectData?.targetMarkets || []).join(', ');

  const docTitle = deviceName
    ? `A Clinical Investigation Evaluating the Safety and Performance of the ${deviceName}`
    : projectName
      ? `${projectName} – Clinical Investigation Protocol`
      : 'Clinical Investigation Protocol';

  const studyAcronym = projectData?.studyAcronym || projectData?.acronym || projectId?.toUpperCase() || 'STUDY';
  const protocolNumber = projectData?.protocolNumber
    || `CIP-${new Date().getFullYear()}-${(projectId || 'XXXX').slice(0, 8).toUpperCase()}`;
  const protocolVersion = protocol?.version || '1.0 (Draft)';
  const protocolDate = protocol?.updatedAt
    ? new Date(protocol.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const sections: any[] = protocol?.sections || [];

  // ── Compute SHA-256 document integrity hash ────────────────────────────────
  // Built from a canonical string of all protocol section content. If any
  // section content changes after signing, the hash will no longer match.
  useEffect(() => {
    if (!projectId) return;
    const canonical = [
      `project:${projectId}`,
      `protocol:${protocolNumber}@${protocolVersion}`,
      ...sections.map(s => `section:${s.id}|${s.title}|${(s.content ?? '').trim()}`),
    ].join('\n');

    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(canonical))
      .then(buf => {
        const hex = Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        setDocumentHash(hex);
      })
      .catch(err => console.error('[PdfProtocol] hash error:', err));
  }, [projectId, protocolNumber, protocolVersion, sections]);

  // ── Derived booleans ───────────────────────────────────────────────────────
  const isProtocolApproved = !!(signatures.investigator && signatures.sponsor);
  const approvalDate = isProtocolApproved ? fmtDate(signatures.sponsor!.signedAt) : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSignClick = (role: 'investigator' | 'sponsor') => {
    setConfirmChecked(false);
    setConfirmNameInput('');
    setSignError(null);
    setConfirmingAs(role);
  };

  const handleConfirmSign = async () => {
    if (!confirmingAs || !projectId) return;
    const signerName    = confirmingAs === 'investigator' ? piName       : vpName;
    const signerEmail   = confirmingAs === 'investigator' ? piAffiliation : vpAffiliation;
    const roleTitle     = confirmingAs === 'investigator' ? piRoleTitle  : vpRoleTitle;
    const which         = confirmingAs;

    setSignError(null);
    setSaving(true);

    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: which,
          roleTitle,
          signerName,
          signerEmail,
          signerUserId: signerEmail || signerName,
          documentHash,
        }),
      });

      if (res.ok) {
        const record: SignatureRecord = await res.json();
        setSignatures(prev => {
          const updated = { ...prev, [which]: record };
          // The backend atomically finalizes the workflow when both required signature
          // slots are present. Do not attempt to move the now-final state backwards.
          return updated;
        });
        setConfirmingAs(null);
        setConfirmNameInput('');
        setConfirmChecked(false);
      } else {
        const errText = await res.text();
        console.error('[PdfProtocol] Signature POST failed:', res.status, errText);
        if (res.status === 403) {
          let message = 'You are not authorized to sign as this role.';
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.message) message = parsed.message;
          } catch {
            // errText wasn't JSON — fall back to the default message
          }
          setSignError(message);
        } else {
          setSignError('Signature failed. Please try again.');
        }
      }
    } catch (e) {
      console.error('[PdfProtocol] Signature request error:', e);
      setSignError('Signature failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToCIR = () => {
    if (isProtocolApproved) navigate(`/projects/${projectId}/workflow/report/make`);
  };

  const handleReturnToReview = () => {
    setShowRequestChangesDialog(true);
  };

  const handleSubmitRequestChanges = async () => {
    if (!requestChangesComment.trim()) return;
    setRequestChangesSubmitting(true);
    try {
      await advanceWorkflowStep({
        projectId: projectId!,
        stepId: 'protocol-pdf',
        to: 'blocked',
        note: requestChangesComment.trim(),
      });
      navigate(`/projects/${projectId}/workflow/protocol/make`);
    } catch (e) {
      if (e instanceof WorkflowStepBlockedError) {
        alert(e.message);
      } else {
        console.error('Request changes failed', e);
        alert('Something went wrong. Please try again.');
      }
    } finally {
      setRequestChangesSubmitting(false);
      setShowRequestChangesDialog(false);
      setRequestChangesComment('');
    }
  };

  // ── Build TOC from real sections ───────────────────────────────────────────
  const tocEntries = sections.map((s, idx) => ({
    number: String(idx + 1),
    title: s.title,
    level: 0,
    page: String(idx + 4),
  }));

  // ── Confirm-gate: both checkbox AND exact name match required ──────────────
  const expectedName   = confirmingAs === 'investigator' ? piName : vpName;
  const nameMatches    = confirmNameInput.trim() === expectedName.trim();
  const canSign        = confirmChecked && nameMatches && !!documentHash && !saving;
  const hashPreview    = documentHash ? `${documentHash.slice(0, 16)}…` : 'computing…';

  // ── Reusable: static signature block inside the document ───────────────────
  const DocSignatureBlock = ({
    heading, name, roleTitle, affiliation, sig,
  }: {
    heading: string;
    name: string;
    roleTitle: string;
    affiliation: string;
    sig?: SignatureRecord;
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ color: '#6b7280', fontSize: '10.5pt', marginBottom: '2px' }}>{heading}</div>

      {/* Signature line */}
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
      {affiliation && <div style={{ color: '#6b7280', fontSize: '10pt' }}>{affiliation}</div>}

      <div style={{ color: sig ? '#374151' : '#9ca3af', fontSize: '10.5pt', marginTop: '4px' }}>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>Date: </span>
        {sig ? fmtDate(sig.signedAt) : '_______________________'}
      </div>

      {/* Document hash for integrity verification */}
      {sig && (
        <div style={{ color: '#9ca3af', fontSize: '8.5pt', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          SHA-256: {sig.documentHash.slice(0, 16)}…
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <WorkflowProgressIndicator currentStep="protocol-approval" />

      <div style={{ background: '#e5e7eb', flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div id="protocol-print-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ width: '210mm', marginBottom: '32px' }}>
            <div style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb', padding: '32px 60px' }}>
              <h1 style={{ color: '#1f2937', fontSize: '20pt', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {isProtocolApproved ? 'Approved Clinical Investigation Protocol' : 'Clinical Investigation Protocol'}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '12pt', margin: 0, lineHeight: 1.5 }}>
                {isProtocolApproved
                  ? 'Final, read-only protocol document prepared for regulatory submission'
                  : 'Review and e-sign to finalize for regulatory submission'}
              </p>
              {loading && <p style={{ color: '#9ca3af', fontSize: '11pt', marginTop: '8px' }}>Loading project data…</p>}
            </div>
          </div>

          {/* ── Document pages ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '210mm', margin: '0 auto' }}>

            {/* PAGE 1: Title Page */}
            <div style={pageStyle}>
              {isProtocolApproved && (
                <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px 16px', marginBottom: '24px' }}>
                  <div style={{ color: '#1e40af', fontWeight: 600, fontSize: '11pt' }}>Approved Clinical Investigation Protocol</div>
                  <div style={{ color: '#3b82f6', fontSize: '10pt' }}>Read-only snapshot generated after final sign-off</div>
                  <div style={{ color: '#6b7280', fontSize: '10pt', marginTop: '4px' }}>
                    {protocolNumber} · Version {protocolVersion} · Approved: {approvalDate}
                  </div>
                </div>
              )}
              <section style={{ paddingTop: '80px', textAlign: 'left' }}>
                <h1 style={{ color: '#111827', fontSize: '22pt', fontWeight: 600, marginBottom: '48px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {docTitle}
                </h1>
                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '48px', paddingTop: '32px' }}>
                  {[
                    { label: 'Study Short Title', value: studyAcronym },
                    { label: 'Protocol Number', value: protocolNumber },
                    { label: 'Version', value: protocolVersion },
                    { label: 'Date', value: protocolDate },
                    ...(targetMarkets ? [{ label: 'Target Markets', value: targetMarkets }] : []),
                    { label: 'Sponsor', value: sponsor || '—' },
                    { label: 'Coordinating Investigator', value: piName !== 'Not assigned' ? piName : '—' },
                    ...(piAffiliation ? [{ label: 'Investigator Contact', value: piAffiliation }] : []),
                    ...(indication ? [{ label: 'Indication', value: indication }] : []),
                  ].map(({ label, value }) => (
                    <p key={label} style={{ color: '#111827', margin: '14px 0', fontSize: '11pt', lineHeight: 1.6 }}>
                      <strong style={{ color: '#6b7280', fontWeight: 500, display: 'inline-block', minWidth: '200px' }}>{label}:</strong>
                      {value}
                    </p>
                  ))}
                </div>
              </section>
              <div style={pageNumStyle}>Page 1</div>
            </div>

            {/* PAGE 2: Protocol Synopsis */}
            <div style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Protocol Synopsis</h2>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', margin: '24px 0' }}>
                  {[
                    { label: 'Study Short Title', value: studyAcronym },
                    { label: 'Device', value: deviceName || '—' },
                    { label: 'Sponsor', value: sponsor || '—' },
                    { label: 'Study Type', value: 'Pivotal Clinical Investigation (EU MDR Article 62)' },
                    { label: 'Study Design', value: 'Prospective, multi-center clinical investigation' },
                    { label: 'Study Population', value: indication ? `Adult patients with ${indication}` : 'Adult patients meeting protocol eligibility criteria' },
                    { label: 'Target Markets', value: targetMarkets || '—' },
                    {
                      label: 'Primary Objective',
                      value: (() => {
                        const s = sections.find(s => s.title?.toLowerCase().includes('objective') || s.title?.toLowerCase().includes('rationale'));
                        if (s?.content) { const f = protocolPlainText(String(s.content)).split('\n')[0]; return f.length > 200 ? f.slice(0, 200) + '…' : f; }
                        return `To demonstrate the safety and performance of the ${deviceName || 'investigational device'}`;
                      })(),
                    },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ background: '#f9fafb', borderRight: '1px solid #e5e7eb', padding: '14px 16px', color: '#6b7280', fontWeight: 500 }}>{label}</div>
                      <div style={{ padding: '14px 16px', color: '#374151' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </section>
              <div style={pageNumStyle}>Page 2</div>
            </div>

            {/* PAGE 3: Table of Contents */}
            <div style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Table of Contents</h2>
                <div style={{ margin: '24px 0' }}>
                  {(tocEntries.length > 0 ? tocEntries : [
                    { number: '1', title: 'Administrative Information', level: 0, page: '4' },
                    { number: '2', title: 'Study Rationale & Objectives', level: 0, page: '5' },
                    { number: '3', title: 'Device Description & Intended Clinical Use', level: 0, page: '6' },
                    { number: '4', title: 'Study Design', level: 0, page: '7' },
                    { number: '5', title: 'Subject Eligibility Criteria', level: 0, page: '8' },
                    { number: '6', title: 'Study Procedures & Assessments', level: 0, page: '9' },
                    { number: '7', title: 'Safety Monitoring & Reporting', level: 0, page: '10' },
                    { number: '8', title: 'Statistical Considerations', level: 0, page: '11' },
                    { number: '9', title: 'Ethics & Regulatory Considerations', level: 0, page: '12' },
                  ]).map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '10px', padding: '6px 0', paddingLeft: `${(item.level || 0) * 20}px` }}>
                      <span style={{ color: '#6b7280', minWidth: '60px', fontWeight: 500 }}>{item.number}</span>
                      <span style={{ color: '#374151', flex: 1, paddingRight: '12px' }}>{item.title}</span>
                      <span style={{ color: '#6b7280', minWidth: '40px', textAlign: 'right', fontWeight: 500 }}>{item.page}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div style={pageNumStyle}>Page 3</div>
            </div>

            {/* Protocol section pages */}
            {sections.length > 0 ? sections.map((section: any, index: number) => (
              <div key={section.id || index} style={pageStyle}>
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={h2Style}>{index + 1}. {section.title}</h2>
                  {section.content
                    ? hasHtmlMarkup(String(section.content))
                      ? <div style={paraStyle} dangerouslySetInnerHTML={{ __html: sanitizeProtocolHtml(String(section.content)) }} />
                      : String(section.content).split(/\n\n+/).map((para: string, pIdx: number) =>
                          para.trim() ? <p key={pIdx} style={paraStyle}>{para.trim()}</p> : null
                        )
                    : <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic' }}>Content pending for this section.</p>
                  }
                </section>
                <div style={pageNumStyle}>Page {index + 4}</div>
              </div>
            )) : (
              <div style={pageStyle}>
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={h2Style}>Protocol Sections</h2>
                  <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic' }}>
                    Protocol sections will appear here once the protocol has been authored and approved.
                    Please complete the Protocol Authoring step first.
                  </p>
                </section>
                <div style={pageNumStyle}>Page 4</div>
              </div>
            )}

            {/* ── SIGNATURE PAGE — static fields, no buttons ────────────── */}
            <div style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Signatures</h2>
                <div style={{ marginTop: '32px' }}>
                  <p style={paraStyle}>
                    I have read this protocol and agree to conduct the clinical investigation as outlined
                    herein and in accordance with ISO 14155:2020, EU MDR, applicable regulatory
                    requirements, and Good Clinical Practice principles.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '48px' }}>
                    <DocSignatureBlock
                      heading="Coordinating Principal Investigator"
                      name={piName}
                      roleTitle={piRoleTitle}
                      affiliation={piAffiliation}
                      sig={signatures.investigator}
                    />
                    <DocSignatureBlock
                      heading="Sponsor Representative"
                      name={vpName}
                      roleTitle={vpRoleTitle}
                      affiliation={vpAffiliation}
                      sig={signatures.sponsor}
                    />
                  </div>
                </div>
              </section>
              <div style={pageNumStyle}>Page {sections.length + 4}</div>
            </div>

            {/* Footer */}
            <div style={{ color: '#9ca3af', textAlign: 'center', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '24px 60px', fontSize: '10pt', lineHeight: 1.5 }}>
              This document was system-generated and locked on{' '}
              {approvalDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </div>

            {/* ── Protocol Finalization panel ───────────────────────────── */}
            <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '32px 60px 48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ color: '#0f172a', borderBottom: '2px solid #e5e7eb', margin: 0, paddingBottom: '8px', fontSize: '18px', fontWeight: 600, fontFamily: 'inherit' }}>
                  Protocol Finalization
                </h3>

                {/* Request changes */}
                <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Discovered an error? You can still make changes before finalizing.
                  </p>
                  <button
                    onClick={handleReturnToReview}
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
                      { slotKey: 'investigator' as const, label: 'Coordinating Principal Investigator', name: piName, roleTitle: piRoleTitle, sig: signatures.investigator },
                      { slotKey: 'sponsor'      as const, label: 'Sponsor Representative',              name: vpName, roleTitle: vpRoleTitle, sig: signatures.sponsor },
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

              {/* Proceed + Export */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      const style = document.createElement('style');
                      style.id = 'print-override';
                      style.textContent = `
  @media print {
    body * { visibility: hidden !important; }
    #protocol-print-root, #protocol-print-root * { visibility: visible !important; }
    #protocol-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
    @page { margin: 15mm; size: A4; }
  }
`;
                      document.head.appendChild(style);
                      window.print();
                      setTimeout(() => {
                        const s = document.getElementById('print-override');
                        if (s) s.remove();
                      }, 1000);
                    }}
                    style={{ cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '14px 28px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}
                  >
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    Export Locked PDF
                  </button>
                  {hasApprovedAmendments ? (
                    <button
                      onClick={() => navigate(`/projects/${projectId}/workflow/protocol/amendment`)}
                      style={{ cursor: 'pointer', background: '#92400e', color: '#fff', border: 'none', borderRadius: '6px', padding: '14px 28px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}
                    >
                      Review Amendment Form
                    </button>
                  ) : (
                    <button
                      onClick={handleProceedToCIR}
                      disabled={!isProtocolApproved}
                      style={{ cursor: isProtocolApproved ? 'pointer' : 'not-allowed', background: isProtocolApproved ? '#4f46e5' : '#e5e7eb', color: isProtocolApproved ? '#fff' : '#9ca3af', border: 'none', borderRadius: '6px', padding: '14px 28px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}
                    >
                      Proceed to Clinical Investigation Report
                    </button>
                  )}
                </div>
                {!isProtocolApproved && (
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, textAlign: 'right', maxWidth: '420px', lineHeight: 1.5 }}>
                    Both signatures are required before the Clinical Investigation Report can be generated.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── E-Signature Confirmation Dialog ─────────────────────────────────── */}
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
                  {confirmingAs === 'investigator' ? 'Coordinating Principal Investigator' : 'Sponsor Representative'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{expectedName}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', marginTop: '2px' }}>
                  {confirmingAs === 'investigator' ? piRoleTitle : vpRoleTitle}
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
                  I confirm I am <strong>{expectedName}</strong> and I authorize this electronic signature on this clinical investigation protocol document.
                </span>
              </label>

              {/* Signature error banner */}
              {signError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                  {signError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  onClick={() => { setConfirmingAs(null); setConfirmNameInput(''); setConfirmChecked(false); setSignError(null); }}
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

      {showRequestChangesDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Request Changes</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Describe what needs to be corrected. This will be logged in the audit trail and the document will be returned to review.
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
                {requestChangesSubmitting ? 'Submitting...' : 'Request Changes & Return to Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
