import PdfProtocolApp from '@/modules/Pdfprotokoll/App';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { createProjectAuditEvent } from '@/shared/services/auditService';

export default function PdfProtocol() {
  const { projectId } = useParams();

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      try {
        await transitionWorkflow({ projectId, stepId: 'protocol-pdf', to: 'finalized', note: 'Viewed Protocol PDF' });
      } catch {
        // Keep UI usable even if transition is not allowed.
      }
      await createProjectAuditEvent({ projectId, domain: 'protocol', stepId: 'protocol-pdf', type: 'viewed', summary: 'Viewed Protocol PDF' });
    })();
  }, [projectId]);

  return (
    <div className="bg-background flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      {/* ── Document content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <PdfProtocolApp />
      </div>
    </div>
  );
}
