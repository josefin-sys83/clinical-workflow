import PdfReportApp from '@/modules/Pdfreport/App';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createProjectAuditEvent } from '@/shared/services/auditService';

export default function PdfReport() {
  const { projectId } = useParams();

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      await createProjectAuditEvent({ projectId, domain: 'report', stepId: 'report-pdf', type: 'viewed', summary: 'Viewed Report PDF' });
    })();
  }, [projectId]);

  return (
    <div className="bg-background flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        <PdfReportApp />
      </div>
    </div>
  );
}
