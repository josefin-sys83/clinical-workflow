import { ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";
import { AuditTrail, AuditEntry } from "./AuditTrail";

type StepId =
  | "project-setup"
  | "protocol-authoring"
  | "protocol-review"
  | "protocol-approval"
  | "report-authoring"
  | "report-review"
  | "report-approval";

type StepState = "completed" | "current" | "upcoming" | "locked";

interface ProjectProcessStepperProps {
  currentStepId: StepId;
  onStepClick?: (stepId: StepId) => void;
  auditEntries?: AuditEntry[];
  auditTitle?: string;
}

/**
 * ProjectProcessStepper - Static component representing the regulated workflow
 * 
 * This component displays the same 7 steps in this exact order:
 * Project setup → Protocol authoring → Protocol review → Protocol approval →
 * Report authoring → Report review → Report approval
 * 
 * Visual rules (grayscale only):
 * - Active step: dark gray (slate-900), 30% larger font, semibold weight
 * - Inactive steps: light gray (slate-400), base font, regular weight
 * - No icons, no badges, no background colors, no status indicators
 * - Navigation is purely structural - does not reflect approval or completeness
 */
export function ProjectProcessStepper({
  currentStepId,
  onStepClick,
  auditEntries = [],
  auditTitle,
}: ProjectProcessStepperProps) {
  // Static step definitions - NEVER CHANGE
  const STEPS: Array<{ id: StepId; label: string }> = [
    { id: "project-setup", label: "Project setup" },
    { id: "protocol-authoring", label: "Protocol authoring" },
    { id: "protocol-review", label: "Protocol review" },
    { id: "protocol-approval", label: "Protocol approval" },
    { id: "report-authoring", label: "Report authoring" },
    { id: "report-review", label: "Report review" },
    { id: "report-approval", label: "Report approval" },
  ];

  const APPROVAL_STEPS: StepId[] = ["protocol-approval", "report-approval"];

  // Determine the state of each step
  const getStepState = (stepId: StepId): StepState => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStepId);
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);

    // Current step
    if (stepId === currentStepId) {
      return "current";
    }

    // Steps after current are upcoming
    if (stepIndex > currentIndex) {
      return "upcoming";
    }

    // Steps before current - check if any approval step has been passed
    // If we've passed an approval step, all steps up to and including that approval are locked
    const passedApprovalIndex = APPROVAL_STEPS.map((id) =>
      STEPS.findIndex((s) => s.id === id)
    ).find((idx) => idx >= 0 && idx < currentIndex);

    if (
      passedApprovalIndex !== undefined &&
      stepIndex <= passedApprovalIndex
    ) {
      return "locked";
    }

    // Default: steps before current are completed
    return "completed";
  };

  const handleStepClick = (stepId: StepId, state: StepState) => {
    // Only completed steps are clickable (not locked, not current, not upcoming)
    if (state === "completed" && onStepClick) {
      onStepClick(stepId);
    }
  };

  return (
    <div className="w-full border-b border-border bg-card">
      <div className="max-w-[1600px] mx-auto px-8 py-5">
        <div className="flex items-center justify-between gap-8">
          {/* Stepper - centered */}
          <div className="flex-1 flex items-center justify-center gap-3">
            {STEPS.map((step, index) => {
              const state = getStepState(step.id);
              const isCompleted = state === "completed";
              const isCurrent = state === "current";
              const isLocked = state === "locked";
              const isClickable = isCompleted;
              const isLastStep = index === STEPS.length - 1;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  {/* Step Text Block */}
                  <button
                    onClick={() => handleStepClick(step.id, state)}
                    disabled={!isClickable}
                    className={cn(
                      "px-2 py-1 transition-all whitespace-nowrap relative text-sm",
                      // Active step: dark gray, 30% larger, semibold
                      isCurrent && "text-slate-900 scale-[1.3] font-semibold",
                      // Inactive steps: light gray, base size, regular weight
                      !isCurrent && "text-slate-400 font-normal",
                      // Clickable hover effect
                      isClickable && "hover:opacity-70 cursor-pointer",
                      !isClickable && "cursor-default"
                    )}
                    aria-label={`${step.label} - ${state}`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {step.label}
                  </button>

                  {/* Arrow Separator */}
                  {!isLastStep && (
                    <ChevronRight className="size-4 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Audit Trail - right side */}
          {auditEntries.length > 0 && (
            <div className="shrink-0">
              <AuditTrail entries={auditEntries} title={auditTitle} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}