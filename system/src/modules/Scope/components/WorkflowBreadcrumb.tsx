import { cn } from "./ui/utils";

interface WorkflowBreadcrumbProps {
  currentStep: 
    | "project-setup" 
    | "protocol-authoring" 
    | "protocol-review" 
    | "protocol-approval" 
    | "report-authoring" 
    | "report-review" 
    | "report-approval";
}

const steps = [
  { id: "project-setup", label: "Project Setup" },
  { id: "protocol-authoring", label: "Protocol Authoring" },
  { id: "protocol-review", label: "Protocol Review" },
  { id: "protocol-approval", label: "Protocol Approval" },
  { id: "report-authoring", label: "Report Authoring" },
  { id: "report-review", label: "Report Review" },
  { id: "report-approval", label: "Report Approval" },
];

export function WorkflowBreadcrumb({ currentStep }: WorkflowBreadcrumbProps) {
  return (
    <div className="flex items-center text-slate-600 text-sm">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <span
            className={cn(
              step.id === currentStep 
                ? "font-medium text-[1.3em]" 
                : step.id === "project-setup"
                  ? "font-normal text-slate-700"
                  : "font-normal"
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="opacity-40 mx-2">›</span>
          )}
        </div>
      ))}
    </div>
  );
}