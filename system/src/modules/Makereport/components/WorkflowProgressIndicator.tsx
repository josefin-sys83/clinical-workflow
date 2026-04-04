import { Clock } from 'lucide-react';

type WorkflowStep = 
  | 'project-setup'
  | 'protocol-authoring'
  | 'protocol-review'
  | 'protocol-approval'
  | 'report-authoring'
  | 'report-review'
  | 'report-approval';

interface WorkflowProgressIndicatorProps {
  currentStep: WorkflowStep;
  onAuditLogClick: () => void;
}

const WORKFLOW_STEPS: { id: WorkflowStep; label: string }[] = [
  { id: 'project-setup', label: 'Project setup' },
  { id: 'protocol-authoring', label: 'Protocol authoring' },
  { id: 'protocol-review', label: 'Protocol review' },
  { id: 'protocol-approval', label: 'Protocol approval' },
  { id: 'report-authoring', label: 'Report authoring' },
  { id: 'report-review', label: 'Report review' },
  { id: 'report-approval', label: 'Report approval' },
];

export function WorkflowProgressIndicator({
  currentStep,
  onAuditLogClick,
}: WorkflowProgressIndicatorProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center relative">
      {/* Workflow Steps - Centered to page */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center gap-2">
              <span
                className={`transition-all ${
                  isActive
                    ? 'font-semibold'
                    : 'font-normal'
                }`}
                style={{
                  fontSize: isActive ? '130%' : '100%',
                  fontFamily: 'system-ui, sans-serif',
                  color: isActive ? '#0F172A' : '#94A3B8',
                }}
              >
                {step.label}
              </span>
              {!isLast && (
                <span style={{ fontFamily: 'system-ui, sans-serif', color: '#94A3B8' }}>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit Log Button */}
      <button
        onClick={onAuditLogClick}
        className="ml-auto flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        style={{ fontSize: '14px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
      >
        <Clock className="w-4 h-4" />
        Audit Log
      </button>
    </div>
  );
}