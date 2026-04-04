import React from 'react';

interface BreadcrumbProps {
  currentStep: 'project_setup' | 'protocol_authoring' | 'protocol_review' | 'protocol_approval' | 'report_authoring' | 'report_review' | 'report_approval';
}

export function Breadcrumb({ currentStep }: BreadcrumbProps) {
  const steps = [
    { id: 'project_setup', label: 'Project setup' },
    { id: 'protocol_authoring', label: 'Protocol authoring' },
    { id: 'protocol_review', label: 'Protocol review' },
    { id: 'protocol_approval', label: 'Protocol approval' },
    { id: 'report_authoring', label: 'Report authoring' },
    { id: 'report_review', label: 'Report review' },
    { id: 'report_approval', label: 'Report approval' },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        
        return (
          <span key={step.id} className="flex items-center gap-2">
            <span 
              className={`
                ${isActive 
                  ? 'text-slate-900 font-semibold text-[1.3em]' 
                  : 'text-slate-400 font-normal'
                }
              `}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="text-slate-400">→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}