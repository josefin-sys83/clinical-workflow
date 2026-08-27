import PdfProtocolApp from '@/modules/Pdfprotokoll/App';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { advanceWorkflowStep } from '@/shared/services/workflowService';

export default function PdfProtocol() {
  const { projectId } = useParams();

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      // Drives protocol-pdf's own lifecycle through every stage the backend now
      // requires before 'final' — each intermediate call is a no-op if already past it.
      await advanceWorkflowStep({ projectId, stepId: 'protocol-pdf', to: 'final', note: 'Viewed Protocol PDF' });
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
