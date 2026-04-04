import { useState } from "react";
import { Info, Check, X, AlertCircle, Plus, Pencil, ChevronDown, Upload, FileText, Lock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: "suggested" | "accepted" | "not-applicable";
  justification?: string;
  source?: "ai-suggested" | "user-defined" | "library";
}

interface LibraryRequirement {
  id: string;
  title: string;
  description: string;
  category: "clinical" | "regulatory" | "software-ai" | "risk-safety" | "operational";
}

// Standard Requirements Library
const REQUIREMENTS_LIBRARY: LibraryRequirement[] = [
  // Clinical
  {
    id: "lib-clinical-1",
    title: "Good Clinical Practice (GCP) Compliance",
    description: "ICH E6(R2) guidelines for clinical trial conduct, ethics, and data integrity",
    category: "clinical"
  },
  {
    id: "lib-clinical-2",
    title: "Informed Consent Process",
    description: "Documentation and procedures for obtaining informed consent from study participants",
    category: "clinical"
  },
  {
    id: "lib-clinical-3",
    title: "Adverse Event Reporting",
    description: "Procedures for identifying, documenting, and reporting adverse events and serious adverse events",
    category: "clinical"
  },
  {
    id: "lib-clinical-4",
    title: "Patient Inclusion/Exclusion Criteria",
    description: "Clearly defined criteria for patient selection and enrollment",
    category: "clinical"
  },
  {
    id: "lib-clinical-5",
    title: "Clinical Endpoints Definition",
    description: "Primary and secondary endpoints with clear success criteria and measurement protocols",
    category: "clinical"
  },
  {
    id: "lib-clinical-6",
    title: "Data Monitoring Committee (DMC)",
    description: "Independent safety monitoring committee for high-risk studies",
    category: "clinical"
  },
  // Regulatory
  {
    id: "lib-regulatory-1",
    title: "21 CFR Part 11 Electronic Records",
    description: "FDA requirements for electronic records and electronic signatures",
    category: "regulatory"
  },
  {
    id: "lib-regulatory-2",
    title: "EU MDR Clinical Evaluation",
    description: "Clinical evaluation requirements under EU MDR 2017/745",
    category: "regulatory"
  },
  {
    id: "lib-regulatory-3",
    title: "ISO 13485 QMS Compliance",
    description: "Quality management system requirements for medical devices",
    category: "regulatory"
  },
  {
    id: "lib-regulatory-4",
    title: "IRB/Ethics Committee Approval",
    description: "Institutional Review Board or Ethics Committee review and approval requirements",
    category: "regulatory"
  },
  {
    id: "lib-regulatory-5",
    title: "Competent Authority Notifications",
    description: "Regulatory authority notifications and reporting requirements",
    category: "regulatory"
  },
  {
    id: "lib-regulatory-6",
    title: "Post-Market Surveillance",
    description: "Post-market clinical follow-up and surveillance requirements",
    category: "regulatory"
  },
  // Software & AI
  {
    id: "lib-software-1",
    title: "IEC 62304 Software Development",
    description: "Medical device software lifecycle processes and documentation",
    category: "software-ai"
  },
  {
    id: "lib-software-2",
    title: "Cybersecurity Requirements",
    description: "Device cybersecurity, data protection, and vulnerability management",
    category: "software-ai"
  },
  {
    id: "lib-software-3",
    title: "AI/ML Algorithm Validation",
    description: "Validation and performance testing of AI/ML algorithms with clinical data",
    category: "software-ai"
  },
  {
    id: "lib-software-4",
    title: "Data Privacy & GDPR Compliance",
    description: "Patient data privacy, GDPR compliance, and data handling procedures",
    category: "software-ai"
  },
  {
    id: "lib-software-5",
    title: "Software Version Control",
    description: "Version management and configuration control for software updates",
    category: "software-ai"
  },
  {
    id: "lib-software-6",
    title: "Interoperability Standards",
    description: "HL7, FHIR, DICOM, or other interoperability standards compliance",
    category: "software-ai"
  },
  // Risk & Safety
  {
    id: "lib-risk-1",
    title: "Usability Engineering (IEC 62366)",
    description: "Usability validation and human factors engineering documentation",
    category: "risk-safety"
  },
  {
    id: "lib-risk-2",
    title: "Electromagnetic Compatibility (EMC)",
    description: "IEC 60601-1-2 electromagnetic compatibility testing for medical electrical equipment",
    category: "risk-safety"
  },
  {
    id: "lib-risk-3",
    title: "Electrical Safety Testing",
    description: "IEC 60601-1 electrical safety standards for medical electrical equipment",
    category: "risk-safety"
  },
  {
    id: "lib-risk-4",
    title: "Packaging & Sterilization Validation",
    description: "ISO 11607 packaging validation and sterilization procedures",
    category: "risk-safety"
  },
  {
    id: "lib-risk-5",
    title: "Environmental & Durability Testing",
    description: "Device performance under environmental conditions and durability validation",
    category: "risk-safety"
  },
  {
    id: "lib-risk-6",
    title: "Clinical Risk Benefit Analysis",
    description: "Comprehensive risk-benefit evaluation for study approval",
    category: "risk-safety"
  },
  // Operational
  {
    id: "lib-operational-1",
    title: "Site Training & Qualification",
    description: "Clinical site staff training and qualification procedures",
    category: "operational"
  },
  {
    id: "lib-operational-2",
    title: "Supply Chain & Device Management",
    description: "Device inventory, distribution, and accountability procedures",
    category: "operational"
  },
  {
    id: "lib-operational-3",
    title: "Clinical Trial Insurance",
    description: "Insurance coverage for clinical trial participants and investigators",
    category: "operational"
  },
  {
    id: "lib-operational-4",
    title: "Data Management Plan",
    description: "Data collection, storage, backup, and quality assurance procedures",
    category: "operational"
  },
  {
    id: "lib-operational-5",
    title: "Study Monitoring Plan",
    description: "Clinical site monitoring schedule and procedures",
    category: "operational"
  },
  {
    id: "lib-operational-6",
    title: "Document Retention Policy",
    description: "Essential document retention and archival requirements",
    category: "operational"
  }
];

interface Role {
  id: string;
  name: string;
  description: string;
  assignedTo: string | null;
  email: string | null;
  mandatory: boolean;
}

export function Gate1() {
  // Section 1: Scope & Device Type
  const [deviceCategory, setDeviceCategory] = useState<string>("implantable");
  const [intendedUse, setIntendedUse] = useState<string>("cardiovascular-support");
  const [customIntendedUse, setCustomIntendedUse] = useState<string>("");
  const [scopeConfirmed, setScopeConfirmed] = useState(false);

  // Section 2: Requirements
  const [requirements, setRequirements] = useState<Requirement[]>([
    {
      id: "req-1",
      title: "ISO 14155 Clinical Investigation Compliance",
      description: "Standards for good clinical practice for medical device investigations involving human subjects",
      status: "suggested",
      source: "ai-suggested"
    },
    {
      id: "req-2",
      title: "MDR 2017/745 Regulatory Alignment",
      description: "EU Medical Device Regulation compliance for implantable devices",
      status: "suggested",
      source: "ai-suggested"
    },
    {
      id: "req-3",
      title: "21 CFR Part 812 IDE Requirements",
      description: "US FDA Investigational Device Exemption requirements for significant risk devices",
      status: "suggested",
      source: "ai-suggested"
    },
    {
      id: "req-4",
      title: "Risk Management (ISO 14971)",
      description: "Application of risk management to medical devices throughout lifecycle",
      status: "suggested",
      source: "ai-suggested"
    },
    {
      id: "req-5",
      title: "Biocompatibility Assessment (ISO 10993)",
      description: "Biological evaluation of medical devices for implantable applications",
      status: "suggested",
      source: "ai-suggested"
    }
  ]);

  const [justificationDialog, setJustificationDialog] = useState<{
    open: boolean;
    requirementId: string | null;
    justification: string;
  }>({
    open: false,
    requirementId: null,
    justification: ""
  });

  const [customRequirementDialog, setCustomRequirementDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    document: File | null;
  }>({
    open: false,
    title: "",
    description: "",
    document: null
  });

  // Section 3: Roles
  const [roles, setRoles] = useState<Role[]>([
    {
      id: "role-1",
      name: "Project Manager",
      description: "Owns project timeline, coordinates cross-functional teams, and ensures milestone delivery",
      assignedTo: null,
      email: null,
      mandatory: true
    },
    {
      id: "role-2",
      name: "Medical Writer",
      description: "Develops and maintains protocol documentation, ensures scientific accuracy and clarity",
      assignedTo: null,
      email: null,
      mandatory: true
    },
    {
      id: "role-3",
      name: "Regulatory Affairs",
      description: "Ensures regulatory compliance, manages submissions, and maintains regulatory strategy",
      assignedTo: null,
      email: null,
      mandatory: true
    },
    {
      id: "role-4",
      name: "Quality Assurance",
      description: "Ensures quality standards, conducts audits, and maintains quality management system",
      assignedTo: null,
      email: null,
      mandatory: true
    },
    {
      id: "role-5",
      name: "Statistician",
      description: "Develops statistical analysis plan, determines sample size, and validates endpoints",
      assignedTo: null,
      email: null,
      mandatory: true
    },
    {
      id: "role-6",
      name: "Clinical Lead",
      description: "Provides clinical oversight, ensures patient safety, and validates clinical endpoints",
      assignedTo: null,
      email: null,
      mandatory: true
    }
  ]);

  // Check if gate can be completed
  const canComplete = intendedUse !== "other-custom" || customIntendedUse.trim() !== "";

  // Readiness checks
  const scopeAndDeviceConfirmed = scopeConfirmed;
  const requirementsApplicabilityConfirmed = requirements.length > 0 && requirements.every(req => req.status === "accepted" || req.status === "not-applicable");
  const allReadinessChecksPassed = scopeAndDeviceConfirmed && requirementsApplicabilityConfirmed;

  // Helper to check if a library requirement is already added
  const isLibraryRequirementAdded = (libraryReqId: string) => {
    return requirements.some(req => req.id === libraryReqId);
  };

  // Helper to get available library requirements by category
  const getAvailableLibraryRequirements = (category: LibraryRequirement["category"]) => {
    return REQUIREMENTS_LIBRARY.filter(
      libReq => libReq.category === category && !isLibraryRequirementAdded(libReq.id)
    );
  };

  // Separate requirements by source for display
  const aiSuggestedRequirements = requirements.filter(req => req.source === "ai-suggested");
  const userAddedRequirements = requirements.filter(req => req.source === "library" || req.source === "user-defined");

  const handleAddLibraryRequirement = (libraryReq: LibraryRequirement) => {
    const newRequirement: Requirement = {
      id: libraryReq.id,
      title: libraryReq.title,
      description: libraryReq.description,
      status: "suggested",
      source: "library"
    };
    setRequirements([...requirements, newRequirement]);
  };

  const handleAcceptRequirement = (requirementId: string) => {
    setRequirements(requirements.map(req => 
      req.id === requirementId ? { ...req, status: "accepted" as const } : req
    ));
  };

  const handleRevertRequirement = (requirementId: string) => {
    setRequirements(requirements.map(req => 
      req.id === requirementId ? { ...req, status: "suggested" as const } : req
    ));
  };

  const handleMarkNotApplicable = (requirementId: string) => {
    setJustificationDialog({
      open: true,
      requirementId,
      justification: ""
    });
  };

  const handleSubmitJustification = () => {
    if (justificationDialog.requirementId) {
      setRequirements(requirements.map(req => 
        req.id === justificationDialog.requirementId 
          ? { ...req, status: "not-applicable" as const, justification: justificationDialog.justification }
          : req
      ));
    }
    setJustificationDialog({ open: false, requirementId: null, justification: "" });
  };

  const handleAddCustomRequirement = () => {
    // Title OR document must be provided, AND description is always required
    const hasTitle = customRequirementDialog.title.trim();
    const hasDocument = customRequirementDialog.document !== null;
    const hasDescription = customRequirementDialog.description.trim();
    
    if ((hasTitle || hasDocument) && hasDescription) {
      const newRequirement: Requirement = {
        id: `req-custom-${Date.now()}`,
        title: customRequirementDialog.title || customRequirementDialog.document?.name || "Uploaded Document",
        description: customRequirementDialog.description,
        status: "accepted",
        source: "user-defined"
      };
      setRequirements([...requirements, newRequirement]);
      setCustomRequirementDialog({ open: false, title: "", description: "", document: null });
    }
  };

  const handleAssignRole = (roleId: string, personName: string, personEmail: string) => {
    setRoles(roles.map(role =>
      role.id === roleId ? { ...role, assignedTo: personName, email: personEmail } : role
    ));
  };

  const handleConfirmGate = () => {
    // Open Gate 2 in new window
    window.open('https://www.figma.com/make/s5kssN1vIwHnwhYjG6CDqU/Make-protokoll?t=Z9GvvGQimeZ6tTL8-0', '_blank');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="space-y-6">
          {/* Section 1: Study Scope & Device Type */}
          <Card>
            <CardHeader>
              <CardTitle>Study Scope & Device Type</CardTitle>
              <CardDescription>
                AI-derived recommendations based on approved synopsis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-muted/30 border-border">
                <Info className="size-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground">
                  The following information has been derived from your study synopsis using AI analysis.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="device-category">Device Category</Label>
                  <Select value={deviceCategory} onValueChange={setDeviceCategory}>
                    <SelectTrigger id="device-category" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-implantable">
                        Non-implantable medical device
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (e.g. diagnostic equipment, surgical instruments, monitoring devices)
                        </span>
                      </SelectItem>
                      <SelectItem value="implantable">
                        Implantable medical device
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (e.g. orthopedic implants, cardiovascular implants)
                        </span>
                      </SelectItem>
                      <SelectItem value="active">
                        Active medical device
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (electrically powered medical devices)
                        </span>
                      </SelectItem>
                      <SelectItem value="aimd">
                        Active implantable medical device (AIMD)
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (e.g. pacemakers, neurostimulators)
                        </span>
                      </SelectItem>
                      <SelectItem value="samd">
                        Software as a Medical Device (SaMD)
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (standalone software, clinical decision support, algorithms)
                        </span>
                      </SelectItem>
                      <SelectItem value="simd">
                        Software in a Medical Device (SiMD)
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (software embedded in a physical medical device)
                        </span>
                      </SelectItem>
                      <SelectItem value="ai-ml">
                        AI-enabled / Machine Learning medical device
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (AI/ML-based functionality influencing clinical decisions)
                        </span>
                      </SelectItem>
                      <SelectItem value="ivd">
                        In Vitro Diagnostic (IVD)
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (laboratory tests, reagents, diagnostic analysis)
                        </span>
                      </SelectItem>
                      <SelectItem value="combination">
                        Combination product (device + drug / biologic)
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (medical device combined with pharmaceutical or biological component)
                        </span>
                      </SelectItem>
                      <SelectItem value="accessory">
                        Accessory to a medical device
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (products intended to be used together with a medical device)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="intended-use">Intended Use & Study Scope</Label>
                  <Select value={intendedUse} onValueChange={(value) => {
                    setIntendedUse(value);
                    if (value !== "other-custom") {
                      setCustomIntendedUse("");
                    }
                  }}>
                    <SelectTrigger id="intended-use" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiovascular-support">
                        Cardiovascular support
                      </SelectItem>
                      <SelectItem value="cardiac-rhythm">
                        Cardiac rhythm management
                      </SelectItem>
                      <SelectItem value="orthopedic-reconstruction">
                        Orthopedic reconstruction & joint replacement
                      </SelectItem>
                      <SelectItem value="trauma-fixation">
                        Trauma & fixation
                      </SelectItem>
                      <SelectItem value="neurostimulation">
                        Neurostimulation & neuromodulation
                      </SelectItem>
                      <SelectItem value="neurological-monitoring">
                        Neurological monitoring & diagnostics
                      </SelectItem>
                      <SelectItem value="minimally-invasive">
                        Minimally invasive / interventional procedures
                      </SelectItem>
                      <SelectItem value="surgical-instruments">
                        Surgical instruments & systems
                      </SelectItem>
                      <SelectItem value="drug-delivery">
                        Drug delivery systems
                      </SelectItem>
                      <SelectItem value="ivd">
                        In vitro diagnostics (IVD)
                      </SelectItem>
                      <SelectItem value="physiological-monitoring">
                        Physiological monitoring & diagnostics
                      </SelectItem>
                      <SelectItem value="samd">
                        Software as a Medical Device (SaMD)
                      </SelectItem>
                      <SelectItem value="ai-enabled">
                        AI-enabled medical device
                      </SelectItem>
                      <SelectItem value="ophthalmic">
                        Ophthalmic devices
                      </SelectItem>
                      <SelectItem value="dental">
                        Dental devices
                      </SelectItem>
                      <SelectItem value="respiratory">
                        Respiratory & pulmonary support
                      </SelectItem>
                      <SelectItem value="other-custom">
                        Other / Custom intended use
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Select the closest standard category. Choose Other/Custom only if none apply.
                  </p>
                </div>

                {intendedUse === "other-custom" && (
                  <div>
                    <Label htmlFor="custom-intended-use">Describe intended use *</Label>
                    <Input
                      id="custom-intended-use"
                      placeholder="Describe the intended use and clinical context"
                      value={customIntendedUse}
                      onChange={(e) => setCustomIntendedUse(e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScopeConfirmed(!scopeConfirmed)}
                  className={
                    scopeConfirmed
                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      : "hover:bg-slate-50"
                  }
                >
                  Confirm Scope & Device Type
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Suggested Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested Requirements</CardTitle>
              <CardDescription>
                AI-suggested requirement areas based on device type and target markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {requirements.map((req) => (
                  <div
                    key={req.id}
                    className="border-b border-border py-3 last:border-0 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{req.title}</h4>
                        {req.source === "user-defined" && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 text-xs">
                            User-defined
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                      {req.justification && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">Justification: </span>
                          {req.justification}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (req.status === "accepted") {
                            handleRevertRequirement(req.id);
                          } else {
                            handleAcceptRequirement(req.id);
                          }
                        }}
                        className={
                          req.status === "accepted"
                            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            : "hover:bg-slate-50"
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (req.status === "not-applicable") {
                            handleRevertRequirement(req.id);
                          } else {
                            handleMarkNotApplicable(req.id);
                          }
                        }}
                        className={
                          req.status === "not-applicable"
                            ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                            : "hover:bg-slate-50"
                        }
                      >
                        Not Applicable
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Browse Standard Requirements Library */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium mb-3">Browse Standard Requirements</h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const libraryReq = REQUIREMENTS_LIBRARY.find(req => req.id === value);
                        if (libraryReq) {
                          handleAddLibraryRequirement(libraryReq);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a standard requirement to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Clinical Requirements */}
                        {getAvailableLibraryRequirements("clinical").length > 0 && (
                          <>
                            <SelectItem value="header-clinical" disabled className="font-medium text-foreground opacity-100">
                              Clinical Requirements
                            </SelectItem>
                            {getAvailableLibraryRequirements("clinical").map(libReq => (
                              <SelectItem key={libReq.id} value={libReq.id} className="pl-6">
                                {libReq.title}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Regulatory Requirements */}
                        {getAvailableLibraryRequirements("regulatory").length > 0 && (
                          <>
                            <SelectItem value="header-regulatory" disabled className="font-medium text-foreground opacity-100 mt-2">
                              Regulatory Requirements
                            </SelectItem>
                            {getAvailableLibraryRequirements("regulatory").map(libReq => (
                              <SelectItem key={libReq.id} value={libReq.id} className="pl-6">
                                {libReq.title}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Software & AI Requirements */}
                        {getAvailableLibraryRequirements("software-ai").length > 0 && (
                          <>
                            <SelectItem value="header-software-ai" disabled className="font-medium text-foreground opacity-100 mt-2">
                              Software & AI Requirements
                            </SelectItem>
                            {getAvailableLibraryRequirements("software-ai").map(libReq => (
                              <SelectItem key={libReq.id} value={libReq.id} className="pl-6">
                                {libReq.title}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Risk & Safety Requirements */}
                        {getAvailableLibraryRequirements("risk-safety").length > 0 && (
                          <>
                            <SelectItem value="header-risk-safety" disabled className="font-medium text-foreground opacity-100 mt-2">
                              Risk & Safety Requirements
                            </SelectItem>
                            {getAvailableLibraryRequirements("risk-safety").map(libReq => (
                              <SelectItem key={libReq.id} value={libReq.id} className="pl-6">
                                {libReq.title}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Operational Requirements */}
                        {getAvailableLibraryRequirements("operational").length > 0 && (
                          <>
                            <SelectItem value="header-operational" disabled className="font-medium text-foreground opacity-100 mt-2">
                              Operational Requirements
                            </SelectItem>
                            {getAvailableLibraryRequirements("operational").map(libReq => (
                              <SelectItem key={libReq.id} value={libReq.id} className="pl-6">
                                {libReq.title}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Message when all requirements are added */}
                        {getAvailableLibraryRequirements("clinical").length === 0 &&
                         getAvailableLibraryRequirements("regulatory").length === 0 &&
                         getAvailableLibraryRequirements("software-ai").length === 0 &&
                         getAvailableLibraryRequirements("risk-safety").length === 0 &&
                         getAvailableLibraryRequirements("operational").length === 0 && (
                          <SelectItem value="no-requirements" disabled className="text-center">
                            All standard requirements have been added
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Select a requirement from the library to add it to your project
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCustomRequirementDialog({ open: true, title: "", description: "", document: null })}
                    className="shrink-0"
                  >
                    <Plus className="size-4 mr-1.5" />
                    Add Custom
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Readiness & Dependencies */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Readiness & Dependencies</h2>
            
            <div className="space-y-3">
              {/* Device category, intended use and study scope confirmed */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                {scopeAndDeviceConfirmed ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <span className="text-sm font-medium text-slate-700">Device category, intended use and study scope confirmed</span>
              </div>

              {/* Requirements applicability confirmed */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                {requirementsApplicabilityConfirmed ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <span className="text-sm font-medium text-slate-700">Requirements applicability confirmed</span>
              </div>

              {/* Locked state if any checks fail */}
              {!allReadinessChecksPassed && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-600 mb-1">"Scope & Intended Use" is locked</p>
                    <p className="text-xs text-slate-500">
                      Complete all requirements above to unlock the next phase of protocol development.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-slate-900">Ready to proceed?</h3>
              <p className="text-sm text-slate-600 mt-1">
                {allReadinessChecksPassed
                  ? "All required information has been provided" 
                  : "Complete all requirements above to proceed"}
              </p>
            </div>
            <Button
              size="lg"
              disabled={!allReadinessChecksPassed}
              onClick={handleConfirmGate}
              className={
                allReadinessChecksPassed
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow px-6 py-3 rounded-lg font-medium transition-all" 
                  : "bg-slate-200 text-slate-500 cursor-not-allowed px-6 py-3 rounded-lg font-medium"
              }
            >
              Complete Scope & Intended Use
            </Button>
          </div>
        </div>
      </div>

      {/* Justification Dialog */}
      <Dialog open={justificationDialog.open} onOpenChange={(open) => 
        setJustificationDialog({ ...justificationDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justification Required</DialogTitle>
            <DialogDescription>
              Please provide a justification for marking this requirement as not applicable.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter justification..."
              value={justificationDialog.justification}
              onChange={(e) => setJustificationDialog({
                ...justificationDialog,
                justification: e.target.value
              })}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJustificationDialog({ open: false, requirementId: null, justification: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitJustification}
              disabled={!justificationDialog.justification.trim()}
              className={!justificationDialog.justification.trim() ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Requirement Dialog */}
      <Dialog open={customRequirementDialog.open} onOpenChange={(open) => 
        setCustomRequirementDialog({ ...customRequirementDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Requirement</DialogTitle>
            <DialogDescription>
              Define a project-specific or regulatory requirement not covered by AI suggestions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="custom-req-title">Requirement Title {!customRequirementDialog.document && "*"}</Label>
              <Input
                id="custom-req-title"
                placeholder="Enter requirement title"
                value={customRequirementDialog.title}
                onChange={(e) => setCustomRequirementDialog({
                  ...customRequirementDialog,
                  title: e.target.value
                })}
                className="mt-1.5"
              />
              {customRequirementDialog.document && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Optional when document is attached
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="custom-req-description">Description or Rationale *</Label>
              <Textarea
                id="custom-req-description"
                placeholder="Enter description or rationale..."
                value={customRequirementDialog.description}
                onChange={(e) => setCustomRequirementDialog({
                  ...customRequirementDialog,
                  description: e.target.value
                })}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="custom-req-document">Supporting Document</Label>
              <div className="mt-1.5">
                <input
                  id="custom-req-document"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCustomRequirementDialog({
                      ...customRequirementDialog,
                      document: file
                    });
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="custom-req-document">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer">
                    {customRequirementDialog.document ? (
                      <div className="flex items-center gap-3">
                        <FileText className="size-5 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {customRequirementDialog.document.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(customRequirementDialog.document.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            setCustomRequirementDialog({
                              ...customRequirementDialog,
                              document: null
                            });
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-2">
                        <Upload className="size-6 text-muted-foreground mb-2" />
                        <p className="text-sm text-foreground font-medium">
                          Click to upload document
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX, or TXT
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Upload a document if you don't want to enter a title and description
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomRequirementDialog({ open: false, title: "", description: "", document: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomRequirement}
              disabled={(!customRequirementDialog.title.trim() && !customRequirementDialog.document) || !customRequirementDialog.description.trim()}
              className={(!customRequirementDialog.title.trim() && !customRequirementDialog.document) || !customRequirementDialog.description.trim() ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}