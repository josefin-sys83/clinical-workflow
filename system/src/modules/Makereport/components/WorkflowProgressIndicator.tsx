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


    </div>
  );
}