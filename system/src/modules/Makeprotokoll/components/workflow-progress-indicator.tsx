import React from 'react';
import { History } from 'lucide-react';

interface WorkflowProgressIndicatorProps {
  currentStep: 'project-setup' | 'protocol-authoring' | 'protocol-review' | 'protocol-approval' | 'report-authoring' | 'report-review' | 'report-approval';
}

export function WorkflowProgressIndicator({ currentStep}: WorkflowProgressIndicatorProps) {
  const steps = [
    { id: 'project-setup', label: 'Project setup' },
    { id: 'protocol-authoring', label: 'Protocol authoring' },
    { id: 'protocol-review', label: 'Protocol review' },
    { id: 'protocol-approval', label: 'Protocol approval' },
    { id: 'report-authoring', label: 'Report authoring' },
    { id: 'report-review', label: 'Report review' },
    { id: 'report-approval', label: 'Report approval' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3.5 relative">
      <div className="flex items-center justify-center">
        {/* Workflow steps - centered */}
        <div className="flex items-center gap-3 text-[13px]">
          {steps.map((step, index) => (
            <span key={step.id} className="contents">
              <span 
                className={
                  step.id === currentStep 
                    ? 'text-slate-900 font-semibold text-[17px]' 
                    : 'text-slate-400'
                }
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <span className="text-slate-400 mx-1">›</span>
              )}
            </span>
          ))}
        </div>
      </div>
      

    </div>
  );
}