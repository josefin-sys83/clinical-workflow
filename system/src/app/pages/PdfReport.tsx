import PdfReportApp from '@/modules/Pdfreport/App';

export default function PdfReport() {
  return (
    <div className="bg-background flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        <PdfReportApp />
      </div>
    </div>
  );
}
