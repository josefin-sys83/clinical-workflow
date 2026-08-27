import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { advanceWorkflowStep, WorkflowStepBlockedError } from '@/shared/services/workflowService';
import { Info, X, FileDown, Lock, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WorkflowProgressIndicator } from '@/modules/Makeprotokoll/components/workflow-progress-indicator';

// Defense-in-depth: the backend sanitizes section content on the way in (see
// sanitize-section-html.ts), but this renders straight into dangerouslySetInnerHTML,
// so it must never trust that alone — sanitize again immediately before render.
function sanitizeForRender(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'mark', 'span', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['style', 'src', 'alt'],
  });
}

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

/** Format an ISO timestamp for human display */
function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Full signature record as stored in and returned from the backend
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

export function ClinicalInvestigationReport() {
  const { projectId } = useParams();
  const apiBase = '';

  const [signatures, setSignatures] = useState<{
    investigator?: SignatureRecord;
    sponsor?: SignatureRecord;
  }>({});

  const [projectData, setProjectData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [reportSections, setReportSections] = useState<any[]>([]);
  const [documentHash, setDocumentHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingAs, setConfirmingAs] = useState<'investigator' | 'sponsor' | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [requestChangesComment, setRequestChangesComment] = useState('');
  const [requestChangesSubmitting, setRequestChangesSubmitting] = useState(false);

  // ── Fetch real project data and restore persisted signatures ──────────────
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(apiBase + '/api/projects/' + projectId).then(r => r.json()),
      fetch(apiBase + '/api/projects/' + projectId + '/report-sections').then(r => r.json()).catch(() => null),
    ])
      .then(([p, sectionMeta]) => {
        setProjectData(p);
        setRoles(p.data?.roles || []);

        // Saved sections only store { state, content } — real titles come from
        // the dynamic report-sections definition, keyed by section id.
        const titleMap: Record<string, string> = {};
        (sectionMeta?.sections || []).forEach((s: any) => { titleMap[s.id] = s.title; });

        // Build report sections from saved data
        const savedSections = p.data?.report?.sections || {};
        const sectionList = Object.entries(savedSections).map(([id, data]: [string, any]) => ({
          id,
          title: titleMap[id] || data.title || id,
          content: data.content || '',
          state: data.state || 'draft',
        })).filter(s => s.content);
        setReportSections(sectionList);

        // Restore persisted signatures
        if (Array.isArray(p.data?.signatures)) {
          const restored: { investigator?: SignatureRecord; sponsor?: SignatureRecord } = {};
          for (const sig of p.data.signatures as SignatureRecord[]) {
            if (sig.role === 'report-investigator') restored.investigator = sig;
            if (sig.role === 'report-sponsor') restored.sponsor = sig;
          }
          if (Object.keys(restored).length > 0) setSignatures(restored);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [projectId]);

  // ── Compute SHA-256 document integrity hash ────────────────────────────────
  useEffect(() => {
    if (!projectId || reportSections.length === 0) return;
    const canonical = projectId + '|report|' + reportSections
      .map(s => `${s.id}|${s.title}|${s.content}`)
      .join('||');
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
      .then(buf => {
        setDocumentHash(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
      });
  }, [projectId, reportSections]);

  // ── Real role names from project data ──────────────────────────────────────
  const investigatorRole = roles.find((r: any) => r.title === 'Principal Investigator');
  const investigatorName = investigatorRole?.assignedTo?.[0]?.name || 'Principal Investigator';
  const sponsorRole = roles.find((r: any) => r.title === 'Clinical Affairs VP');
  const sponsorName = sponsorRole?.assignedTo?.[0]?.name || 'Clinical Affairs VP';

  const expectedName = confirmingAs === 'investigator' ? investigatorName : sponsorName;
  const nameMatches = confirmNameInput.trim().toLowerCase() === expectedName.trim().toLowerCase();
  const canSign = confirmChecked && nameMatches && !!documentHash && !saving;
  const hashPreview = documentHash ? documentHash.slice(0, 16) + '...' : 'Computing...';

  const handleSignClick = (role: 'investigator' | 'sponsor') => {
    setConfirmChecked(false);
    setConfirmNameInput('');
    setConfirmingAs(role);
  };

  const handleConfirmSign = async () => {
    if (!projectId || !documentHash || !confirmingAs) return;
    const roleMap: Record<string, string> = {
      investigator: 'Principal Investigator',
      sponsor: 'Clinical Affairs VP',
    };
    const roleTitle = roleMap[confirmingAs];
    const personRole = roles.find((r: any) => r.title === roleTitle);
    const person = personRole?.assignedTo?.[0];
    if (!person) return;
    setSaving(true);
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: confirmingAs === 'investigator' ? 'report-investigator' : 'report-sponsor',
          // The backend authorizes this call by matching roleTitle against the
          // caller's own project role assignment — without it, createSignature()
          // can never find a claimedRole and always 403s regardless of who's signing.
          roleTitle,
          signerName: person.name,
          signerEmail: person.email || '',
          signerUserId: person.name,
          documentHash,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Signing failed (${res.status})`);
      }
      const record = await res.json();
      const updated = { ...signatures, [confirmingAs]: record };
      setSignatures(updated);
      setConfirmingAs(null);
      setConfirmChecked(false);
      setConfirmNameInput('');
      if (updated.investigator && updated.sponsor) {
        await advanceWorkflowStep({ projectId, stepId: 'report-pdf', to: 'signed' });
      }
    } catch (e) {
      if (e instanceof WorkflowStepBlockedError) {
        window.alert(e.message);
      } else {
        console.error('Signing failed', e);
        window.alert(e instanceof Error ? e.message : 'Signing failed. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = () => {
    setShowRequestChangesDialog(true);
  };

  const handleSubmitRequestChanges = async () => {
    if (!requestChangesComment.trim()) return;
    setRequestChangesSubmitting(true);
    try {
      // 'draft' isn't a valid transition target (stateNameToAction() has no mapping for
      // it) — 'blocked' is the correct "sent back for changes" state.
      await advanceWorkflowStep({
        projectId: projectId!,
        stepId: 'report-pdf',
        to: 'blocked',
        note: requestChangesComment.trim(),
      });
      window.location.href = window.location.pathname.split('/workflow/')[0] + '/workflow/report/review';
    } catch (e) {
      if (e instanceof WorkflowStepBlockedError) {
        window.alert(e.message);
      } else {
        console.error('Request changes failed', e);
        window.alert('Something went wrong while requesting changes. Please try again.');
      }
    } finally {
      setRequestChangesSubmitting(false);
      setShowRequestChangesDialog(false);
      setRequestChangesComment('');
    }
  };

  const handleExportPDF = async () => {
    if (!signatures.investigator || !signatures.sponsor) return;

    try {
      // Show loading state
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 32px 48px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        text-align: center;
        font-family: Inter, system-ui, sans-serif;
      `;
      loadingMessage.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
          Generating PDF...
        </div>
        <div style="font-size: 14px; color: #64748b;">
          Please wait while we prepare your Clinical Investigation Report
        </div>
      `;
      document.body.appendChild(loadingMessage);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = document.querySelectorAll('.protocol-page');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture the page as canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // JPEG instead of PNG: these pages are white-background/text/table content, not
        // photography, but PNG's lossless encoding still has to store every anti-aliased
        // text-edge pixel individually, which made 14 pages balloon to ~150-200MB. JPEG's
        // DCT compression handles large flat-color regions (the page background) and soft
        // edges far more efficiently; 0.92 quality is visually indistinguishable from the
        // PNG output for this content but a small fraction of the size.
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;

        // Center the image on the page
        const x = (pageWidth - imgWidth) / 2;
        const y = 0;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
      }

      // Add metadata
      pdf.setProperties({
        title: 'Clinical Investigation Report - CIP-2024-MED-0847',
        subject: 'CARDIA-SUPPORT-2026 Clinical Investigation Report',
        author: 'CardiaFlow Medical Technologies GmbH',
        keywords: 'Clinical Investigation, EU MDR, Cardiac Device',
        creator: 'CardiaFlow Regulatory Platform'
      });

      // Save the PDF
      pdf.save('ClinicalInvestigationReport_CIP-2024-MED-0847_v1.0.pdf');

      // Remove loading message
      document.body.removeChild(loadingMessage);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: #d1fae5;
        color: #065f46;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        font-family: Inter, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
      `;
      successMessage.textContent = '✓ PDF exported successfully';
      document.body.appendChild(successMessage);

      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const isReportApproved = !!(signatures.investigator && signatures.sponsor);
  const approvalDate = isReportApproved ? fmtDate(signatures.sponsor!.signedAt) : null;

  // ── Reusable: static signature block inside the document ───────────────────
  const DocSignatureBlock = ({
    heading, name, roleTitle, sig,
  }: {
    heading: string;
    name: string;
    roleTitle: string;
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

  const sponsorDisplayName = projectData?.data?.projectData?.sponsor
    || projectData?.data?.roles?.find((r: any) => r.title === 'Clinical Affairs VP')?.assignedTo?.[0]?.name
    || '[Sponsor]';
  const deviceDisplayName = projectData?.description?.match(/Device:\s*([^|]+)/)?.[1]?.trim() || '[Device Name]';
  const targetMarketsDisplay = (projectData?.data?.projectData?.targetMarkets || []).join(', ') || 'EU';
  const protocolIdDisplay = projectData?.data?.protocol?.protocolId || '[Protocol ID]';
  const studyTitleDisplay = projectData?.name || 'Clinical Investigation Report';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <WorkflowProgressIndicator currentStep="report-approval" />

      <div style={{ background: '#e5e7eb', flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ width: '210mm', marginBottom: '32px' }}>
            <div style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb', padding: '32px 60px' }}>
              <h1 style={{ color: '#1f2937', fontSize: '20pt', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {isReportApproved ? 'Approved Clinical Investigation Report' : 'Clinical Investigation Report'}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '12pt', margin: 0, lineHeight: 1.5 }}>
                {isReportApproved
                  ? 'Final, read-only report document prepared for regulatory submission'
                  : 'Review and e-sign to finalize for regulatory submission'}
              </p>
              {isLoading && <p style={{ color: '#9ca3af', fontSize: '11pt', marginTop: '8px' }}>Loading project data…</p>}
            </div>
          </div>

          {/* ── Document pages ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '210mm', margin: '0 auto' }}>

            {/* PAGE 1: Title Page */}
            <div className="protocol-page" style={pageStyle}>
              {isReportApproved && (
                <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px 16px', marginBottom: '24px' }}>
                  <div style={{ color: '#1e40af', fontWeight: 600, fontSize: '11pt' }}>Approved Clinical Investigation Report</div>
                  <div style={{ color: '#3b82f6', fontSize: '10pt' }}>Read-only snapshot generated after final sign-off</div>
                  <div style={{ color: '#6b7280', fontSize: '10pt', marginTop: '4px' }}>
                    {protocolIdDisplay} · Report Version 1.0 · Approved: {approvalDate}
                  </div>
                </div>
              )}
              <section style={{ paddingTop: '80px', textAlign: 'left' }}>
                <h1 style={{ color: '#111827', fontSize: '22pt', fontWeight: 600, marginBottom: '48px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {studyTitleDisplay}
                </h1>
                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '48px', paddingTop: '32px' }}>
                  {[
                    { label: 'Study Title', value: studyTitleDisplay },
                    { label: 'Short Title', value: projectData?.id || '[Short Title]' },
                    { label: 'Protocol ID', value: protocolIdDisplay },
                    { label: 'Report Version', value: 'Version 1.0' },
                    { label: 'Report Date', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'Sponsor', value: sponsorDisplayName },
                    { label: 'Coordinating Investigator', value: investigatorName },
                    { label: 'Target Markets', value: targetMarketsDisplay },
                    { label: 'Device', value: deviceDisplayName },
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

            {/* PAGE 2: Report Synopsis */}
            <div className="protocol-page" style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Report Synopsis</h2>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', margin: '24px 0' }}>
                  {[
                    { label: 'Study Title', value: studyTitleDisplay },
                    { label: 'Protocol ID', value: protocolIdDisplay },
                    { label: 'Device', value: deviceDisplayName },
                    { label: 'Sponsor', value: sponsorDisplayName },
                    { label: 'Coordinating Investigator', value: investigatorName },
                    { label: 'Target Markets', value: targetMarketsDisplay },
                    { label: 'Report Date', value: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
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
            <div className="protocol-page" style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Table of Contents</h2>
                <div style={{ margin: '24px 0' }}>
                  {reportSections.length > 0 ? reportSections.map((s: any, i: number) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #e5e7eb' }}>
                      <span style={{ fontSize: '13px' }}>{i + 1}. {s.title}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>{i + 4}</span>
                    </div>
                  )) : (
                    <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic' }}>
                      Report sections will appear here once generated in Make Report.
                    </p>
                  )}
                </div>
              </section>
              <div style={pageNumStyle}>Page 3</div>
            </div>

            {/* Report section pages */}
            {reportSections.length > 0 ? reportSections.map((section: any, idx: number) => (
              <div key={section.id} className="protocol-page" style={pageStyle}>
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={h2Style}>{idx + 1}. {section.title}</h2>
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizeForRender(section.content.replace(/```html\n?/g, '').replace(/```\n?/g, '')) }}
                    style={{ fontSize: '13px', lineHeight: '1.8', color: '#1a1a1a', fontFamily: 'Georgia, serif' }}
                  />
                </section>
                <div style={pageNumStyle}>Page {idx + 4}</div>
              </div>
            )) : (
              <div className="protocol-page" style={pageStyle}>
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={h2Style}>Report Sections</h2>
                  <p style={{ ...paraStyle, color: '#9ca3af', fontStyle: 'italic' }}>
                    Report sections will appear here once generated in Make Report.
                    Please complete the Make Report step first.
                  </p>
                </section>
                <div style={pageNumStyle}>Page 4</div>
              </div>
            )}

            {/* ── SIGNATURE PAGE — static fields, no buttons ────────────── */}
            <div className="protocol-page" style={pageStyle}>
              <section style={{ marginBottom: '40px' }}>
                <h2 style={h2Style}>Signatures</h2>
                <div style={{ marginTop: '32px' }}>
                  <p style={paraStyle}>
                    I have read this Clinical Investigation Report and confirm it accurately reflects the
                    conduct and results of the clinical investigation in accordance with ISO 14155:2020, EU MDR,
                    applicable regulatory requirements, and Good Clinical Practice principles.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '48px' }}>
                    <DocSignatureBlock
                      heading="Coordinating Principal Investigator"
                      name={investigatorName}
                      roleTitle="Principal Investigator"
                      sig={signatures.investigator}
                    />
                    <DocSignatureBlock
                      heading="Sponsor Representative"
                      name={sponsorName}
                      roleTitle="Clinical Affairs VP"
                      sig={signatures.sponsor}
                    />
                  </div>
                </div>
              </section>
              <div style={pageNumStyle}>Page {reportSections.length + 4}</div>
            </div>

            {/* Footer */}
            <div style={{ color: '#9ca3af', textAlign: 'center', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '24px 60px', fontSize: '10pt', lineHeight: 1.5 }}>
              This document was system-generated and locked on{' '}
              {approvalDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </div>

            {/* ── Report Finalization panel ───────────────────────────── */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
              {/* Info banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '32px' }}>
                <span style={{ fontSize: '14px', color: '#374151' }}>Discovered an error? You can still make changes before finalizing.</span>
                <button onClick={handleRequestChanges} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                  <Info size={16} style={{ color: '#6b7280' }} />
                  Request Changes
                </button>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Required Signatures</h3>

              {[
                { slotKey: 'investigator' as const, label: 'COORDINATING PRINCIPAL INVESTIGATOR', name: investigatorName, roleTitle: 'Principal Investigator', sig: signatures.investigator },
                { slotKey: 'sponsor' as const, label: 'SPONSOR REPRESENTATIVE', name: sponsorName, roleTitle: 'Clinical Affairs VP', sig: signatures.sponsor },
              ].map(({ slotKey, label, name, roleTitle, sig }) => (
                <div key={slotKey} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '12px', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{roleTitle}</div>
                      {sig && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Signed {new Date(sig.signedAt).toLocaleString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                    {sig ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16a34a', fontSize: '20px' }}>✓</span>
                        <span style={{ padding: '4px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>Signed</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSignClick(slotKey)}
                        disabled={saving}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}
                      >
                        Click to Sign
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Export */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={handleExportPDF}
                  disabled={!isReportApproved}
                  style={{ padding: '10px 20px', background: !isReportApproved ? '#9ca3af' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: !isReportApproved ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                  Export Locked PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {confirmingAs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '520px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Sign Clinical Investigation Report</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
              Signing as: <strong>{confirmingAs === 'investigator' ? investigatorName : sponsorName}</strong> ({confirmingAs === 'investigator' ? 'Principal Investigator' : 'Clinical Affairs VP'})
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Document Hash</div>
              <code style={{ fontSize: '12px', color: '#374151', fontFamily: 'monospace' }}>{hashPreview}</code>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
                This cryptographic hash uniquely identifies the document content at the time of signing, in compliance with EU MDR 2017/745 and 21 CFR Part 11.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Type your full name to confirm: <span style={{ color: '#6b7280', fontWeight: 400 }}>({expectedName})</span>
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={e => setConfirmNameInput(e.target.value)}
                placeholder={expectedName}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${nameMatches && confirmNameInput ? '#16a34a' : '#d1d5db'}`, borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
              {confirmNameInput && !nameMatches && (
                <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>Name does not match. Please type exactly: {expectedName}</p>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={confirmChecked} onChange={e => setConfirmChecked(e.target.checked)} style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                I confirm that I have reviewed this Clinical Investigation Report and that my electronic signature constitutes a legally binding signature in accordance with EU MDR 2017/745 and 21 CFR Part 11.
              </span>
            </label>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmingAs(null); setConfirmNameInput(''); setConfirmChecked(false); }} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleConfirmSign} disabled={!canSign} style={{ padding: '10px 20px', background: canSign ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: canSign ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500 }}>
                {saving ? 'Signing...' : 'Sign Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestChangesDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Request Changes to Report</h3>
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
                style={{ padding: '10px 20px', background: requestChangesComment.trim() && !requestChangesSubmitting ? '#dc2626' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: requestChangesComment.trim() && !requestChangesSubmitting ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500 }}
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
