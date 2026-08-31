import PdfProtocolApp from '@/modules/Pdfprotokoll/App';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { advanceWorkflowStep } from '@/shared/services/workflowService';

export default function PdfProtocol() {
  const { projectId } = useParams();

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      // The PDF must be reviewed and approved before the two named signatories can
      // sign it, but it is only final after both signatures have been collected.
      await advanceWorkflowStep({ projectId, stepId: 'protocol-pdf', to: 'signed', note: 'Protocol PDF ready for signatures' });
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
