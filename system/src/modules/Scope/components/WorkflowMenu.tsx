import { Check, Lock } from "lucide-react";
import { cn } from "./ui/utils";

interface Step {
  id: string;
  number?: number;
  title: string;
  status: "completed" | "current" | "available" | "locked";
}

interface WorkflowMenuProps {
  steps: Step[];
  currentStep: string;
  phaseTitle?: string;
}

export function WorkflowMenu({ steps, currentStep, phaseTitle = "PROJECT SETUP" }: WorkflowMenuProps) {
  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="pt-6 px-6 pb-6 flex-1">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Workflow Steps</h3>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {phaseTitle}
          </div>
        </div>
      
        <nav className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              className={cn(
                "w-full flex items-center gap-3 px-0 py-1.5 transition-colors text-left",
                step.status === "completed" && "hover:opacity-70",
                step.status === "current" && "bg-blue-50 border border-blue-200 rounded-lg p-3 hover:opacity-70",
                step.status === "locked" && "cursor-not-allowed"
              )}
              disabled={step.status === "locked"}
            >
              <div className="shrink-0">
                {step.status === "completed" && (
                  <div className="flex items-center justify-center size-5 rounded-full border-2 border-green-500">
                    <Check className="size-3 text-green-500" strokeWidth={3} />
                  </div>
                )}
                {step.status === "current" && step.number !== undefined && (
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs font-medium">
                    {step.number}
                  </div>
                )}
                {step.status === "locked" && (
                  <div className="flex items-center justify-center size-5">
                    <Lock className="size-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm",
                  step.status === "completed" && "text-foreground",
                  step.status === "current" && "text-blue-900 font-medium",
                  step.status === "locked" && "text-muted-foreground/50"
                )}>
                  {step.title}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>
      
      {/* System Information Section */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-600">
        <div className="font-medium mb-1">System Information</div>
        <div>Version 2.4.1</div>
        <div>Last updated: Jan 24, 2026</div>
      </div>
    </div>
  );
}