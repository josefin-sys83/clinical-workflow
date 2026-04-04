import { Outlet, useLocation, useNavigate } from "react-router";
import { ProjectProcessStepper } from "../components/ProjectProcessStepper";
import { WorkflowMenu } from "../components/WorkflowMenu";
import { AuditEntry } from "../components/AuditTrail";

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

  // Get audit entries based on current page
  const getAuditEntries = (): AuditEntry[] => {
    switch (currentStepId) {
      case "project-setup":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            userBy: "Dr. Sarah Johnson",
            userEmail: "sarah.johnson@medtech.com",
            action: "Project Manager role assigned",
            domain: "Role",
            details: "Emma Wilson assigned as Project Manager",
            newValue: "Emma Wilson (emma.wilson@medtech.com)"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            userBy: "Dr. Sarah Johnson",
            userEmail: "sarah.johnson@medtech.com",
            action: "ISO 14155 requirement accepted",
            domain: "Requirement",
            details: "Clinical Investigation Compliance requirement accepted"
          },
          {
            id: "audit-3",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            userBy: "Dr. Sarah Johnson",
            userEmail: "sarah.johnson@medtech.com",
            action: "Device category confirmed",
            domain: "Scope",
            details: "Device category set to Implantable Device",
            newValue: "Implantable Device"
          },
        ];
      case "protocol-authoring":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            userBy: "Dr. Michael Chen",
            userEmail: "michael.chen@medtech.com",
            action: "Section 3.2 updated",
            domain: "Content",
            details: "Study endpoints section revised based on statistical review",
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
            userBy: "Dr. Michael Chen",
            userEmail: "michael.chen@medtech.com",
            action: "Bibliography added",
            domain: "Content",
            details: "Added 5 new references to support methodology"
          },
        ];
      case "protocol-review":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            userBy: "Dr. Lisa Anderson",
            userEmail: "lisa.anderson@medtech.com",
            action: "Section 5.2 comment added",
            domain: "Review",
            details: "Requested clarification on adverse event reporting timeline"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            userBy: "Dr. Robert Kim",
            userEmail: "robert.kim@medtech.com",
            action: "Statistical methods approved",
            domain: "Review",
            details: "Section 6 - Statistical Analysis Plan approved by statistician"
          },
        ];
      case "protocol-approval":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            userBy: "Dr. Patricia Stevens",
            userEmail: "patricia.stevens@medtech.com",
            action: "Final approval signature pending",
            domain: "Approval",
            details: "Medical Director review in progress"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            userBy: "David Thompson",
            userEmail: "david.thompson@medtech.com",
            action: "Quality Assurance approval granted",
            domain: "Approval",
            details: "QA Director approved protocol v1.0 for submission"
          },
        ];
      case "report-authoring":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            userBy: "Dr. Michael Chen",
            userEmail: "michael.chen@medtech.com",
            action: "Efficacy results section drafted",
            domain: "Content",
            details: "Section 7.2 - Primary endpoint analysis completed"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
            userBy: "Dr. Robert Kim",
            userEmail: "robert.kim@medtech.com",
            action: "Statistical tables generated",
            domain: "Content",
            details: "Generated 12 statistical summary tables for results section"
          },
        ];
      case "report-review":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            userBy: "Dr. Robert Kim",
            userEmail: "robert.kim@medtech.com",
            action: "Statistical analysis verified",
            domain: "Review",
            details: "All statistical calculations and p-values confirmed accurate"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
            userBy: "Jennifer Martinez",
            userEmail: "jennifer.martinez@medtech.com",
            action: "Regulatory language revision requested",
            domain: "Review",
            details: "Section 2.3 - Clarify device classification per MDR"
          },
        ];
      case "report-approval":
        return [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            userBy: "Dr. Patricia Stevens",
            userEmail: "patricia.stevens@medtech.com",
            action: "Medical Director approval granted",
            domain: "Approval",
            details: "CSR v1.0 approved for regulatory submission"
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            userBy: "David Thompson",
            userEmail: "david.thompson@medtech.com",
            action: "Quality Assurance final approval",
            domain: "Approval",
            details: "Final QA review completed, all requirements satisfied"
          },
        ];
      default:
        return [];
    }
  };

  // Determine workflow menu steps based on current process step
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
          auditEntries={getAuditEntries()}
          auditTitle="Audit log"
        />
        
        {/* Main content */}
        <Outlet />
      </div>
    </div>
  );
}