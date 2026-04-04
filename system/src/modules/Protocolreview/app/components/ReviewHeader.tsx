import { FileText, History, ChevronRight } from 'lucide-react';

interface ReviewHeaderProps {
  onViewAuditTrail: () => void;
  activeStep?: string;
}

export function ReviewHeader({
  onViewAuditTrail,
  activeStep = 'Report review',
}: ReviewHeaderProps) {
  const navigationSteps = [
    'Project setup',
    'Protocol authoring',
    'Protocol review',
    'Protocol approval',
    'Report authoring',
    'Report review',
    'Report approval'
  ];

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-8">
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          {navigationSteps.map((step, index) => (
            <div key={step} className="flex items-center">
              <span className={step === activeStep ? 'font-medium text-neutral-900 text-lg' : ''}>
                {step}
              </span>
              {index < navigationSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-1" />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <button
            onClick={onViewAuditTrail}
            className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <History className="h-4 w-4" />
            Audit Log
          </button>
        </div>
      </div>
    </header>
  );
}