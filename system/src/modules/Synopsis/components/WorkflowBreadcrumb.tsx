interface WorkflowBreadcrumbProps {
  currentStep: 'project-setup' | 'protocol-authoring' | 'protocol-review' | 'protocol-approval' | 'report-authoring' | 'report-review' | 'report-approval';
}

export function WorkflowBreadcrumb({ currentStep }: WorkflowBreadcrumbProps) {
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
    <div className="flex items-center text-sm">
      {steps.map((step, index) => (
        <span key={step.id} className="flex items-center">
          <span 
            className={
              step.id === currentStep 
                ? "text-slate-900 font-semibold text-[1.3em]" 
                : "text-slate-400 font-normal"
            }
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="text-slate-400 mx-2">›</span>
          )}
        </span>
      ))}
    </div>
  );
}