import PdfReportApp from '@/modules/Pdfreport/App';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { advanceWorkflowStep } from '@/shared/services/workflowService';

export default function PdfReport() {
  const { projectId } = useParams();

  useEffect(() => {
    if (!projectId) return;
    void advanceWorkflowStep({
      projectId,
      stepId: 'report-pdf',
      to: 'signed',
      note: 'Report PDF ready for signatures',
    });
  }, [projectId]);

  return (
    <div className="bg-background flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        <PdfReportApp />
      </div>
    </div>
  );
}
