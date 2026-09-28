import { Outlet, useLocation, useNavigate } from "react-router";
import { ProjectProcessStepper } from "../components/ProjectProcessStepper";
import { WorkflowMenu } from "../components/WorkflowMenu";

type StepId =
  | "project-setup"
  | "protocol-authoring"
  | "protocol-review"
  | "protocol-approval"
  | "report-authoring"
  | "report-review"
  | "report-approval";

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map location pathname to step ID
  const getStepIdFromPath = (pathname: string): StepId => {
    if (pathname === "/" || pathname === "") return "project-setup";
    const path = pathname.replace(/^\//, "");
    return path as StepId;
  };

  const currentStepId = getStepIdFromPath(location.pathname);

  const getWorkflowSteps = () => {
    // For now, showing Project Setup workflow
    // In a real application, this would change based on the current process step
    return [
      {
        id: "project-setup",
        title: "Setup",
        status: "completed" as const
      },
      {
        id: "synopsis",
        title: "Synopsis",
        status: "completed" as const
      },
      {
        id: "gate-1",
        number: 3,
        title: "Scope & Intended Use",
        status: "current" as const
      }
    ];
  };

  const handleProcessStepClick = (stepId: string) => {
    // Map step ID to route path
    const path = stepId === "project-setup" ? "/" : `/${stepId}`;
    navigate(path);
  };

  return (
    <div className="size-full flex bg-slate-50">
      {/* Left sidebar - full height */}
      <WorkflowMenu 
        steps={getWorkflowSteps()} 
        currentStep="gate-1" 
        phaseTitle="PROJECT SETUP"
      />
      
      {/* Right content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top-level horizontal stepper */}
        <ProjectProcessStepper 
          currentStepId={currentStepId} 
          onStepClick={handleProcessStepClick}
        />
        
        {/* Main content */}
        <Outlet />
      </div>
    </div>
  );
}