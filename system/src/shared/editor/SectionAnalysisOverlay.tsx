import { Loader2 } from 'lucide-react';

export function SectionAnalysisOverlay() {
  return <div role="status" className="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/80 pointer-events-none">
    <div className="flex items-center gap-2 rounded border border-blue-200 bg-white px-4 py-3 text-sm text-blue-800 shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      AI is evaluating this section…
    </div>
  </div>;
}
