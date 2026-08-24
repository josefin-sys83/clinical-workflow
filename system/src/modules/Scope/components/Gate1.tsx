import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from "react";
import { useWorkflowSnapshot } from '@/shared/hooks/useWorkflowSnapshot';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { postAudit } from '@/shared/api/audit';
import { advanceWorkflowStep } from '@/shared/services/workflowService';
import { Info, Check, X, AlertCircle, Plus, Pencil, ChevronDown, Upload, FileText, Lock, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { theme } from '@/app/theme';

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: "suggested" | "accepted" | "not-applicable";
  justification?: string;
  source?: "ai-suggested" | "user-defined" | "library" | "mandatory";
}

interface LibraryRequirement {
  id: string;
  title: string;
  description: string;
  category: "clinical" | "regulatory" | "software-ai" | "risk-safety" | "operational";
}

interface ProjectStandard {
  id: number;
  code: string;
  title: string;
}

const reconcileMandatoryStandards = (
  currentRequirements: Requirement[],
  projectStandards: ProjectStandard[],
): Requirement[] => {
  const existingMandatoryById = new Map(
    currentRequirements
      .filter(requirement => requirement.source === "mandatory")
      .map(requirement => [requirement.id, requirement]),
  );

  const mandatoryRequirements: Requirement[] = projectStandards.map(standard => {
    const id = `standard-${standard.id}`;
    const existing = existingMandatoryById.get(id);

    return {
      id,
      title: `${standard.code} — ${standard.title}`,
      description: `This standard applies to the project based on its risk class, device category, and target markets.`,
      status: existing?.status ?? "suggested",
      justification: existing?.justification,
      source: "mandatory",
    };
  });

  const mandatoryCodes = projectStandards.map(standard => standard.code.toLowerCase());
  const nonMandatoryRequirements = currentRequirements.filter(requirement => {
    if (requirement.source === "mandatory") return false;

    // If the AI happened to suggest the same standard, keep only the authoritative
    // mandatory version returned through project_standards.
    const normalizedTitle = requirement.title.toLowerCase();
    return !mandatoryCodes.some(code => normalizedTitle.includes(code));
  });

  return [...mandatoryRequirements, ...nonMandatoryRequirements];
};

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
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { snapshot: workflowSnapshot } = useWorkflowSnapshot({ projectId });
  const isScopeLocked = (workflowSnapshot?.steps?.['protocol-pdf']?.state as string) === 'final';
  const { latestAmendment } = useProtocolStatus(projectId);

  // Track original scope values loaded from DB
  const [originalDeviceCategory, setOriginalDeviceCategory] = useState<string | null>(null);
  const [originalRequirements, setOriginalRequirements] = useState<any[]>([]);

  // Section 1: Scope & Device Type
  const [deviceCategory, setDeviceCategory] = useState<string>("");
  const [intendedUse, setIntendedUse] = useState<string>("");
  const [customIntendedUse, setCustomIntendedUse] = useState<string>("");
  const apiBase = '';

  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  // Derive consequences when scope changes
  const consequences = useMemo(() => {
    if (!originalDeviceCategory) return [];
    const items: { severity: 'high' | 'medium'; message: string }[] = [];

    if (deviceCategory !== originalDeviceCategory) {
      const fromAIMD = originalDeviceCategory === 'AIMD';
      const toAIMD = deviceCategory === 'AIMD';
      const fromIVD = originalDeviceCategory === 'IVD';
      const toIVD = deviceCategory === 'IVD';
      const fromSaMD = originalDeviceCategory === 'Software' || originalDeviceCategory === 'SaMD';
      const toSaMD = deviceCategory === 'Software' || deviceCategory === 'SaMD';

      items.push({
        severity: 'high',
        message: `Device category changed from "${originalDeviceCategory}" to "${deviceCategory}". All protocol sections and report sections need to be regenerated with new regulatory standards.`
      });

      if (fromAIMD && !toAIMD) {
        items.push({ severity: 'high', message: 'ISO 14708 and EN 45502-1 requirements will no longer apply. The Long-term Safety and Performance Assessment section in the report will be removed.' });
      }
      if (!fromAIMD && toAIMD) {
        items.push({ severity: 'high', message: 'ISO 14708 and EN 45502-1 requirements now apply. A Long-term Safety and Performance Assessment section will be added to the report.' });
      }
      if (fromIVD && !toIVD) {
        items.push({ severity: 'high', message: 'IVDR 2017/746 requirements will no longer apply. Report structure will change significantly.' });
      }
      if (!fromIVD && toIVD) {
        items.push({ severity: 'high', message: 'IVDR 2017/746 now applies instead of MDR. Report structure will change significantly.' });
      }
      if (!fromSaMD && toSaMD) {
        items.push({ severity: 'high', message: 'IMDRF SaMD N41 now applies. An Algorithm Performance and Validation section will be added to the report.' });
      }
      if (fromSaMD && !toSaMD) {
        items.push({ severity: 'high', message: 'IMDRF SaMD N41 will no longer apply. Algorithm Performance section will be removed from the report.' });
      }

      items.push({ severity: 'medium', message: 'AI analysis of all existing protocol and report sections needs to be re-run to reflect new regulatory requirements.' });
    }

    const originalMarkets = new Set(
      originalRequirements
        .filter((r: any) => r.status === 'accepted')
        .map((r: any) => r.title.includes('FDA') || r.title.includes('US') ? 'FDA' :
                         r.title.includes('EU') || r.title.includes('MDR') ? 'EU' : null)
        .filter(Boolean)
    );
    const currentMarkets = new Set(
      requirements
        .filter((r: any) => r.status === 'accepted')
        .map((r: any) => r.title.includes('FDA') || r.title.includes('US') ? 'FDA' :
                         r.title.includes('EU') || r.title.includes('MDR') ? 'EU' : null)
        .filter(Boolean)
    );

    if (!originalMarkets.has('EU') && currentMarkets.has('EU')) {
      items.push({ severity: 'high', message: 'EU market added. A Regulatory Compliance Statement (EU MDR 2017/745) section will be added to the report. Protocol must reference EU MDR 2017/745.' });
    }
    if (originalMarkets.has('EU') && !currentMarkets.has('EU')) {
      items.push({ severity: 'high', message: 'EU market removed. The Regulatory Compliance Statement (EU MDR 2017/745) section will be removed from the report.' });
    }
    if (!originalMarkets.has('FDA') && currentMarkets.has('FDA')) {
      items.push({ severity: 'high', message: 'FDA market added. An Investigational Device Exemption (IDE) Compliance Summary section will be added to the report. Protocol must reference 21 CFR Part 812.' });
    }
    if (originalMarkets.has('FDA') && !currentMarkets.has('FDA')) {
      items.push({ severity: 'high', message: 'FDA market removed. The IDE Compliance Summary section will be removed from the report.' });
    }

    return items;
  }, [deviceCategory, requirements, originalDeviceCategory, originalRequirements]);

  const [generatingRequirements, setGeneratingRequirements] = useState(false);

  const fetchProjectStandards = async (): Promise<ProjectStandard[]> => {
    const response = await fetch(`${apiBase}/api/projects/${projectId}/standards`);
    if (!response.ok) {
      throw new Error(`Failed to load project standards (${response.status})`);
    }
    return response.json();
  };

  const generateRequirements = async () => {
    setGeneratingRequirements(true);
    try {
      const project = await fetch(`${apiBase}/api/projects/${projectId}`).then(r => r.json());
      const targetMarkets = project.data?.projectData?.targetMarkets?.join(', ') || '';
      const synopsisText = project.data?.synopsis?.extractedText
        ? project.data.synopsis.extractedText.slice(0, 3000)
        : project.data?.synopsis?.uploadedFileName
          ? 'Synopsis uploaded: ' + project.data.synopsis.uploadedFileName
          : '';
      const effectiveIntendedUse = intendedUse === 'other-custom' ? customIntendedUse : intendedUse;

      const deviceTypeContext = ['samd', 'simd', 'ai-ml'].includes(deviceCategory)
        ? 'This is a Software as a Medical Device (SaMD) or AI/ML device. Apply IMDRF N41 SaMD framework. For EU: EU MDR Rule 11 classification. For US: FDA De Novo or PMA pathway (NOT 510k unless predicate exists). Required: algorithm validation, GMLP compliance, cybersecurity, IEC 62304 software lifecycle, real-world performance monitoring.'
        : deviceCategory === 'aimd'
        ? 'This is an Active Implantable Medical Device (AIMD). Apply ISO 14708 series. For EU: EU MDR Annex XV clinical investigation required. For US: PMA pathway. Required: long-term biocompatibility per ISO 10993, EMC testing per IEC 60601.'
        : deviceCategory === 'ivd'
        ? 'This is an In Vitro Diagnostic device. Apply EU IVDR 2017/746. For US: FDA 510(k) or PMA depending on risk class. Required: analytical validation, clinical validation, metrological traceability.'
        : `This is a ${deviceCategory} medical device.`;

      const prompt = `You are a senior MedTech regulatory affairs expert with deep knowledge of EU MDR 2017/745, FDA regulations, and ISO standards.

STUDY INFORMATION:
Device: ${deviceCategory} — ${effectiveIntendedUse}
Target Markets: ${targetMarkets}
${synopsisText ? `\nSYNOPSIS CONTEXT:\n${synopsisText}` : ''}

DEVICE TYPE GUIDANCE:
${deviceTypeContext}

Generate 6-8 specific, actionable regulatory requirements for this clinical investigation. Each requirement must be:
- Specific to the device type and target markets listed above
- Referenced to the correct regulation/standard (e.g. EU MDR Article 61, ISO 14155:2020, IMDRF N41)
- Clinically relevant for a pivotal study

IMPORTANT:
- For SaMD targeting US: use De Novo or PMA pathway, NOT 510(k) unless a specific predicate device is confirmed
- For EU market: always include ISO 14155:2020 GCP compliance
- For AI/ML devices: always include IMDRF N41 and GMLP requirements
- Do not suggest generic requirements — be specific to this device and indication

Return ONLY a JSON array, no markdown:
[
  {
    "id": "req-1",
    "title": "Specific requirement title",
    "description": "Detailed description with specific regulation references",
    "status": "suggested",
    "source": "ai-suggested"
  }
]`;

      // The AI call is wrapped in its own try/catch, separate from the outer one, so a
      // failed or malformed AI response still falls through to the mandatory-standards
      // merge below rather than leaving `requirements` empty (handleConfirmScope already
      // cleared it to [] before calling this).
      let aiRequirements: Requirement[] = [];
      try {
        const res = await fetch(`${apiBase}/api/projects/${projectId}/analyze-scope`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        if (Array.isArray(data)) aiRequirements = data;
      } catch (e) {
        console.error('AI requirement generation failed', e);
      }

      // project_standards is the source of truth for mandatory standards. It was
      // calculated from the project's risk, device category, and target markets.
      const projectStandards = await fetchProjectStandards();
      const merged = reconcileMandatoryStandards(aiRequirements, projectStandards);
      setRequirements(merged);

      if (aiRequirements.length > 0) {
        await postAudit(projectId!, 'scope.ai.requirements.generated', `AI generated ${aiRequirements.length} suggested requirements for ${deviceCategory} / ${effectiveIntendedUse}`, 'scope', 'unknown', { deviceCategory, intendedUse: effectiveIntendedUse, requirementCount: aiRequirements.length, targetMarkets });
      }
      const mandatory = merged.filter(r => r.source === 'mandatory');
      if (mandatory.length > 0) {
        await postAudit(projectId!, 'scope.requirements.mandatory_loaded', `Mandatory project standards loaded: ${mandatory.map(item => item.title).join(', ')}`, 'scope', 'unknown', { titles: mandatory.map(item => item.title) });
      }
    } catch (e) {
      console.error('Failed to generate requirements', e);
    } finally {
      setGeneratingRequirements(false);
    }
  };

  const handleConfirmScope = async () => {
    setScopeConfirmed(true);
    setRequirements([]);
    await postAudit(projectId!, 'scope.confirmed', `Scope confirmed — Device: ${deviceCategory}, Intended use: ${intendedUse === 'other-custom' ? customIntendedUse : intendedUse}`, 'scope', 'unknown', { deviceCategory, intendedUse: intendedUse === 'other-custom' ? customIntendedUse : intendedUse });
    await generateRequirements();
  };

  // Ladda scope-data från backend
  useEffect(() => {
    fetch(`${apiBase}/api/projects/${projectId}`)
      .then(r => r.json())
      .then(async project => {
        const s = project.data?.scope ?? {};

        const normalizedCategory = s.deviceCategory === 'SaMD' ? 'samd' : s.deviceCategory === 'AIMD' ? 'aimd' : s.deviceCategory === 'IVD' ? 'ivd' : s.deviceCategory;
        if (normalizedCategory) setDeviceCategory(normalizedCategory);
        if (s.intendedUse) setIntendedUse(s.intendedUse);
        if (s.customIntendedUse) setCustomIntendedUse(s.customIntendedUse);
        if (s.scopeConfirmed !== undefined) setScopeConfirmed(s.scopeConfirmed);
        const savedRequirements: Requirement[] = Array.isArray(s.requirements) ? s.requirements : [];
        if (savedRequirements.length > 0 || s.scopeConfirmed) {
          try {
            const projectStandards = await fetchProjectStandards();
            setRequirements(reconcileMandatoryStandards(savedRequirements, projectStandards));
          } catch (error) {
            // Do not destroy a saved requirement list if the standards request fails.
            console.error('Failed to reconcile mandatory project standards', error);
            setRequirements(savedRequirements);
          }
        }
        // Pre-populate from projectData if scope not yet saved
        if (!s.deviceCategory && project.data?.projectData?.deviceCategory) {
          setDeviceCategory(project.data.projectData.deviceCategory);
        }
        if (!s.intendedUse && project.data?.projectData?.intendedUse) {
          setIntendedUse('other-custom');
          setCustomIntendedUse(project.data.projectData.intendedUse);
        }
        // Seed originals once so consequence diff is against the DB state
        setOriginalDeviceCategory(s.deviceCategory ?? null);
        setOriginalRequirements(s.requirements ?? []);

        // Auto-derive device category + intended use from synopsis when either is still missing.
        // Note: a free-text intended use entered during project setup gets mapped to 'other-custom'
        // above, which would otherwise permanently block this from ever running for those projects.
        const hasCategory = normalizedCategory || project.data?.projectData?.deviceCategory;
        const hasIntendedUse = s.intendedUse || project.data?.projectData?.intendedUse;
        const hasSynopsis = !!project.data?.synopsis?.extractedText;
        if ((!hasCategory || !hasIntendedUse) && hasSynopsis && !s.scopeConfirmed) {
          setGeneratingRequirements(true);
          try {
            const res = await fetch(`${apiBase}/api/projects/${projectId}/derive-scope`, { method: 'POST' });
            const derived = await res.json();
            console.log('[derive-scope] response:', derived);
            if (!hasCategory && derived.deviceCategory) setDeviceCategory(derived.deviceCategory);
            if (!hasIntendedUse && derived.intendedUse) setIntendedUse(derived.intendedUse);
          } catch { /* non-fatal */ } finally {
            setGeneratingRequirements(false);
          }
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Spara scope-data till backend automatiskt
  useEffect(() => {
    if (isScopeLocked) return;
    const timer = setTimeout(() => {
      fetch(`${apiBase}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            scope: { deviceCategory, intendedUse, customIntendedUse, scopeConfirmed, requirements }
          }
        })
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [projectId, deviceCategory, intendedUse, customIntendedUse, scopeConfirmed, requirements, isScopeLocked]);

  // Section 2: Requirements (default values loaded from backend or set below)
  // requirements useState moved above
  const [requirementsDefaults] = useState<Requirement[]>([
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
    postAudit(projectId!, 'scope.requirement.added_from_library', `Requirement added from library: ${libraryReq.title}`, 'scope', 'unknown', { requirementId: libraryReq.id, requirementTitle: libraryReq.title, category: libraryReq.category });
  };

  const handleAcceptRequirement = (requirementId: string) => {
    const req = requirements.find(r => r.id === requirementId);
    setRequirements(requirements.map(r => r.id === requirementId ? { ...r, status: "accepted" as const } : r));
    if (req) postAudit(projectId!, 'scope.requirement.accepted', `Requirement accepted: ${req.title}`, 'scope', 'unknown', { requirementId, requirementTitle: req.title });
  };

  const handleRevertRequirement = (requirementId: string) => {
    const req = requirements.find(r => r.id === requirementId);
    setRequirements(requirements.map(r => r.id === requirementId ? { ...r, status: "suggested" as const } : r));
    if (req) postAudit(projectId!, 'scope.requirement.reverted', `Requirement reverted to suggested: ${req.title}`, 'scope', 'unknown', { requirementId, requirementTitle: req.title });
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
      const req = requirements.find(r => r.id === justificationDialog.requirementId);
      setRequirements(requirements.map(r =>
        r.id === justificationDialog.requirementId
          ? { ...r, status: "not-applicable" as const, justification: justificationDialog.justification }
          : r
      ));
      if (req) postAudit(projectId!, 'scope.requirement.not_applicable', `Requirement marked not applicable: ${req.title}`, 'scope', 'unknown', { requirementId: justificationDialog.requirementId, requirementTitle: req.title, justification: justificationDialog.justification });
    }
    setJustificationDialog({ open: false, requirementId: null, justification: "" });
  };

  const handleAddCustomRequirement = () => {
    // Title OR document must be provided, AND description is always required
    const hasTitle = customRequirementDialog.title.trim();
    const hasDocument = customRequirementDialog.document !== null;
    const hasDescription = customRequirementDialog.description.trim();

    if ((hasTitle || hasDocument) && hasDescription) {
      const title = customRequirementDialog.title || customRequirementDialog.document?.name || "Uploaded Document";
      const newRequirement: Requirement = {
        id: `req-custom-${Date.now()}`,
        title,
        description: customRequirementDialog.description,
        status: "accepted",
        source: "user-defined"
      };
      setRequirements([...requirements, newRequirement]);
      postAudit(projectId!, 'scope.requirement.custom_added', `Custom requirement added: ${title}`, 'scope', 'unknown', { requirementTitle: title, description: customRequirementDialog.description });
      setCustomRequirementDialog({ open: false, title: "", description: "", document: null });
    }
  };

  const handleRemoveRequirement = (requirementId: string) => {
    const requirement = requirements.find(item => item.id === requirementId);

    // This guard is required even though the UI does not render a remove button
    // for mandatory rows. It prevents a future caller from bypassing the rule.
    if (!requirement || requirement.source === "mandatory") return;

    setRequirements(current => current.filter(item => item.id !== requirementId));
    void postAudit(
      projectId!,
      'scope.requirement.removed',
      `Requirement removed: ${requirement.title}`,
      'scope',
      'unknown',
      {
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        requirementSource: requirement.source,
        previousStatus: requirement.status,
      },
    );
  };

  const handleAssignRole = (roleId: string, personName: string, personEmail: string) => {
    setRoles(roles.map(role =>
      role.id === roleId ? { ...role, assignedTo: personName, email: personEmail } : role
    ));
  };

  const handleConfirmGate = async () => {
    if (projectId) {
      await advanceWorkflowStep({ projectId, stepId: 'scope', to: 'approved' });
    }
    navigate(`/projects/${projectId}/workflow/protocol/make`);
  };

  const maxStep = parseInt(localStorage.getItem('maxStep_' + projectId) || '0');
  const innerSteps = [
    { label: 'Setup', path: '/projects/' + projectId + '/workflow/project-setup', status: 'completed' },
    { label: 'Synopsis', path: '/projects/' + projectId + '/workflow/synopsis', status: 'completed' },
    { label: 'Scope & Intended Use', path: '/projects/' + projectId + '/workflow/scope', status: 'active' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Project setup</div>
          <div className="space-y-1">
            {innerSteps.map((step, i) => (
              // eslint-disable-next-line theme-colors/no-raw-colors -- nav step chrome, not a semantic status colour
              <div key={i} onClick={() => step.status !== 'locked' && navigate(step.path)} className={"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors " + (step.status === 'active' ? 'bg-blue-50 border border-blue-200 font-medium text-blue-900' : 'text-slate-700 hover:bg-slate-50 cursor-pointer')}>
                {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" /> : step.status === 'active' ? <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs">{i+1}</span></div> : <Lock className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </aside>
      <div className="flex-1 overflow-auto">
      <MilestoneBanner projectId={projectId!} currentStepId="scope" />
      {isScopeLocked && (
        <div className="mx-6 mt-4">
          <ProtocolFinalizedBanner
            projectId={projectId!}
            latestAmendment={latestAmendment}
          />
        </div>
      )}
      <div className="max-w-5xl mx-auto p-8">
        <div className="space-y-6">

          {!isScopeLocked && consequences.length > 0 && (
            <div className={`${theme.status.notice} border ${theme.border.notice} rounded-lg p-4 space-y-2`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <p className={`font-medium ${theme.text.notice}`}>Unsaved changes have downstream consequences</p>
              </div>
              <p className="text-sm text-orange-700">The following parts of the project will be affected when you save:</p>
              <ul className="space-y-1">
                {consequences.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${c.severity === 'high' ? 'bg-rose-500' : 'bg-orange-400'}`} />
                    <span className={theme.text.notice}>{c.message}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-orange-600 mt-2">These changes will be saved automatically. Generated content in protocol and report sections will not be automatically regenerated — you will need to regenerate affected sections manually.</p>
            </div>
          )}

          {/* Section 1: Study Scope & Device Type */}
          <Card>
            <CardHeader>
              <CardTitle>Study Scope & Device Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <div className="text-sm font-medium text-purple-900 mb-1">
                      AI-derived recommendations
                    </div>
                    <p className="text-xs text-purple-700">
                      Based on your approved synopsis document.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="device-category">Device Category</Label>
                  <Select value={deviceCategory} onValueChange={setDeviceCategory} disabled={isScopeLocked}>
                    <SelectTrigger id="device-category" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-implantable" description="(e.g. diagnostic equipment, surgical instruments, monitoring devices)">
                        Non-implantable medical device
                      </SelectItem>
                      <SelectItem value="implantable" description="(e.g. orthopedic implants, cardiovascular implants)">
                        Implantable medical device
                      </SelectItem>
                      <SelectItem value="active" description="(electrically powered medical devices)">
                        Active medical device
                      </SelectItem>
                      <SelectItem value="aimd" description="(e.g. pacemakers, neurostimulators)">
                        Active implantable medical device (AIMD)
                      </SelectItem>
                      <SelectItem value="samd" description="(standalone software, clinical decision support, algorithms)">
                        Software as a Medical Device (SaMD)
                      </SelectItem>
                      <SelectItem value="simd" description="(software embedded in a physical medical device)">
                        Software in a Medical Device (SiMD)
                      </SelectItem>
                      <SelectItem value="ai-ml" description="(AI/ML-based functionality influencing clinical decisions)">
                        AI-enabled / Machine Learning medical device
                      </SelectItem>
                      <SelectItem value="ivd" description="(laboratory tests, reagents, diagnostic analysis)">
                        In Vitro Diagnostic (IVD)
                      </SelectItem>
                      <SelectItem value="combination" description="(medical device combined with pharmaceutical or biological component)">
                        Combination product (device + drug / biologic)
                      </SelectItem>
                      <SelectItem value="accessory" description="(products intended to be used together with a medical device)">
                        Accessory to a medical device
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
                  }} disabled={isScopeLocked}>
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
                      disabled={isScopeLocked}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConfirmScope}
                  disabled={isScopeLocked}
                  className={
                    scopeConfirmed
                      ? `${theme.status.active} ${theme.border.active} hover:bg-blue-100`
                      : "hover:bg-slate-50"
                  }
                >
                  Confirm Scope & Device Type
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Suggested Requirements — only visible after scope is confirmed */}
          {scopeConfirmed && <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 p-3 bg-purple-50 border-l-4 border-purple-400 rounded flex-1">
                  <div className="w-5 h-5 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <div className="text-sm font-medium text-purple-900 mb-1">
                      Suggested Requirements
                    </div>
                    <p className="text-xs text-purple-700">
                      AI-suggested requirement areas based on device type and target markets
                    </p>
                  </div>
                </div>
                {generatingRequirements && (
                  <div className={`flex items-center gap-2 ${theme.text.ai} text-sm flex-shrink-0`}>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Analyzing with AI...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatingRequirements && !scopeConfirmed && requirements.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Confirm your scope and device type above to generate AI-suggested requirements.
                </p>
              )}
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
                        {req.source === "mandatory" && (
                          <Badge variant="outline" className={`${theme.status.warning} ${theme.border.warning} text-xs`} title="Required for this project based on its configured risk class, device category, and target markets.">
                            Mandatory Standard
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
                        disabled={isScopeLocked}
                        onClick={() => {
                          if (req.status === "accepted") {
                            handleRevertRequirement(req.id);
                          } else {
                            handleAcceptRequirement(req.id);
                          }
                        }}
                        className={
                          req.status === "accepted"
                            ? `${theme.status.active} ${theme.border.active} hover:bg-blue-100`
                            : "hover:bg-slate-50"
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isScopeLocked}
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
                      {req.source !== "mandatory" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isScopeLocked}
                          onClick={() => handleRemoveRequirement(req.id)}
                          aria-label={`Remove ${req.title}`}
                          title="Remove requirement"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
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
                      disabled={isScopeLocked}
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
                    disabled={isScopeLocked}
                    onClick={() => setCustomRequirementDialog({ open: true, title: "", description: "", document: null })}
                    className="shrink-0"
                  >
                    <Plus className="size-4 mr-1.5" />
                    Add Custom
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>}

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
                  ? `${theme.button.primary} shadow-sm hover:shadow px-6 py-3 rounded-lg font-medium transition-all`
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
              className={!justificationDialog.justification.trim() ? "" : theme.button.primary}
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
              className={(!customRequirementDialog.title.trim() && !customRequirementDialog.document) || !customRequirementDialog.description.trim() ? "" : theme.button.primary}
            >
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}