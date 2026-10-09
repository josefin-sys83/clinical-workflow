import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkflowSnapshot } from '@/shared/hooks/useWorkflowSnapshot';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { advanceWorkflowStep, WorkflowStepBlockedError } from '@/shared/services/workflowService';
import { aiAnalysisErrorMessage, apiErrorMessage, apiFetch } from '@/shared/api/http';
import { INTENDED_USE_OPTIONS, intendedUseLabel, normalizeStoredIntendedUse } from '@/shared/workflow/intendedUse';
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
  definitionId?: number | null;
  title: string;
  description: string;
  status: "suggested" | "accepted" | "not-applicable";
  justification?: string;
  source?: "ai-suggested" | "user-defined" | "library" | "mandatory";
  alwaysApplies?: boolean;
}

interface LibraryRequirement {
  id: string;
  definitionId: number;
  title: string;
  description: string;
  category: "clinical" | "regulatory" | "software-ai" | "risk-safety" | "operational";
}

type RequirementsAnalysisStatus = 'not-run' | 'running' | 'succeeded' | 'failed';

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
  const isMountedRef = useRef(true);
  const { snapshot: workflowSnapshot, refresh: refreshWorkflowSnapshot } = useWorkflowSnapshot({ projectId });
  const isScopeLocked = (workflowSnapshot?.steps?.['protocol-pdf']?.state as string) === 'final';
  const { latestAmendment } = useProtocolStatus(projectId);

  // Section 1: Scope & Device Type
  const [deviceCategory, setDeviceCategory] = useState<string>("");
  const [intendedUse, setIntendedUse] = useState<string>("");
  const [customIntendedUse, setCustomIntendedUse] = useState<string>("");
  const apiBase = '';

  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementsLibrary, setRequirementsLibrary] = useState<LibraryRequirement[]>([]);
  const [scopeSubmitError, setScopeSubmitError] = useState<string | null>(null);
  const [requirementsAnalysisStatus, setRequirementsAnalysisStatus] = useState<RequirementsAnalysisStatus>('not-run');
  const [requirementsAnalysisError, setRequirementsAnalysisError] = useState<string | null>(null);
  const [submittingScope, setSubmittingScope] = useState(false);
  // Prevent the autosave effect from writing the initial empty state before the
  // project's saved setup/scope values have finished loading.
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const scopeAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scopeSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // A workflow transition can take several requests. If the user leaves Scope while
  // it is in flight, its promise must not navigate from the now-unmounted page when it
  // eventually resolves (for example, hijacking a Synopsis page back to Protocol Make).
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [generatingRequirements, setGeneratingRequirements] = useState(false);

  const generateRequirements = async () => {
    setGeneratingRequirements(true);
    setRequirementsAnalysisStatus('running');
    setRequirementsAnalysisError(null);
    try {
      const projectResponse = await fetch(`${apiBase}/api/projects/${projectId}`);
      if (!projectResponse.ok) throw new Error(`Failed to load project (${projectResponse.status})`);
      const project = await projectResponse.json();
      // Markets are relational and GET /projects/:id exposes their codes at the top level.
      const targetMarkets = Array.isArray(project.targetMarkets)
        ? project.targetMarkets.join(', ')
        : '';
      const synopsisText = project.data?.synopsis?.extractedText
        ? project.data.synopsis.extractedText.slice(0, 3000)
        : project.data?.synopsis?.uploadedFileName
          ? 'Synopsis uploaded: ' + project.data.synopsis.uploadedFileName
          : '';
      const effectiveIntendedUse = intendedUse === 'other-custom'
        ? customIntendedUse
        : intendedUseLabel(intendedUse);

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

      const res = await fetch(`${apiBase}/api/projects/${projectId}/analyze-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error(aiAnalysisErrorMessage(res.status));
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(aiAnalysisErrorMessage(502));
      // Preserve assignment identity for unchanged suggestions; provider IDs are local to a run.
      const aiRequirements: Requirement[] = data.map((item: Requirement) => ({
        ...item,
        id: requirements.find(saved => saved.source === 'ai-suggested' && saved.title === item.title && saved.description === item.description)?.id
          || 'req-' + crypto.randomUUID(),
        source: 'ai-suggested',
      }));
      const standardRequirements: Requirement[] = project.requirements.filter((requirement: Requirement) => requirement.source === 'mandatory');
      const manuallyManaged = requirements.filter(requirement => requirement.source === 'library' || requirement.source === 'user-defined');
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const standardCodes = standardRequirements.map(requirement => normalize(requirement.title.split(' — ')[0]));
      setRequirements([...standardRequirements, ...manuallyManaged,
        ...aiRequirements.filter(requirement => !standardCodes.some(code => normalize(requirement.title).includes(code)))]);
      setRequirementsAnalysisStatus('succeeded');
    } catch (e) {
      console.error('Failed to generate requirements', e);
      setRequirementsAnalysisError(e instanceof Error ? e.message : aiAnalysisErrorMessage(0));
      setRequirementsAnalysisStatus('failed');
    } finally {
      setGeneratingRequirements(false);
    }
  };

  const handleConfirmScope = async () => {
    if (isScopeLocked || !scopeLoaded || !canComplete || generatingRequirements) return;
    setScopeConfirmed(true);
    setRequirements([]);
    setRequirementsAnalysisStatus('not-run');
    await generateRequirements();
  };

  // The library and project assignments are both served from requirement tables.
  useEffect(() => {
    void apiFetch<LibraryRequirement[]>('/projects/requirement-library').then(setRequirementsLibrary).catch(error => {
      console.error('Failed to load requirement library', error);
    });
  }, []);

  // Ladda scope-data från backend
  useEffect(() => {
    if (!projectId) return;
    setScopeLoaded(false);
    fetch(`${apiBase}/api/projects/${projectId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load project (${r.status})`);
        return r.json();
      })
      .then(project => {
        const s = project.data?.scope ?? {};

        const normalizeDeviceCategory = (value: unknown): string => {
          if (typeof value !== 'string' || !value.trim()) return '';
          const category = value.trim();
          if (category === 'SaMD' || category === 'Software') return 'samd';
          if (category === 'AIMD') return 'aimd';
          if (category === 'IVD') return 'ivd';
          return category.toLowerCase();
        };

        const setupCategory = normalizeDeviceCategory(project.deviceCategory);
        setDeviceCategory(setupCategory);
        const savedIntendedUse = normalizeStoredIntendedUse(
          s.intendedUse,
          s.customIntendedUse,
        );
        setIntendedUse(savedIntendedUse.intendedUse);
        setCustomIntendedUse(savedIntendedUse.customIntendedUse);
        setScopeConfirmed(Boolean(s.scopeConfirmed));
        const savedRequirements: Requirement[] = project.requirements;
        const savedAnalysisStatus = s.requirementsAnalysisStatus as RequirementsAnalysisStatus | undefined;
        if (savedAnalysisStatus === 'succeeded' || savedAnalysisStatus === 'failed') {
          setRequirementsAnalysisStatus(savedAnalysisStatus);
        } else if (savedRequirements.some(requirement => requirement.source === 'ai-suggested')) {
          // Backward compatibility for projects saved before this state was persisted.
          setRequirementsAnalysisStatus('succeeded');
        }
        if (typeof s.requirementsAnalysisError === 'string') setRequirementsAnalysisError(s.requirementsAnalysisError);
        setRequirements(savedRequirements);
        setScopeLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load project scope data', error);
      });
  }, [projectId]);

  const persistScope = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project ID is required to save Scope.'));

    const payload = {
      requirements,
      data: {
        scope: {
          scopeConfirmed,
          requirementsAnalysisStatus,
          requirementsAnalysisError,
        },
      },
    };

    // Serialize saves so an older autosave cannot commit after the final save.
    const save = scopeSaveQueueRef.current
      .catch(() => undefined)
      .then(() => apiFetch(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }))
      .then(() => undefined);

    scopeSaveQueueRef.current = save.catch(() => undefined);
    return save;
  }, [projectId, scopeConfirmed, requirements, requirementsAnalysisStatus, requirementsAnalysisError]);

  // Save Scope after a short idle period while the user is editing.
  useEffect(() => {
    if (isScopeLocked || !scopeLoaded) return;
    scopeAutosaveTimerRef.current = setTimeout(() => {
      scopeAutosaveTimerRef.current = null;
      void persistScope().catch(error => {
        console.error('Failed to autosave Scope', error);
      });
    }, 1000);
    return () => {
      if (scopeAutosaveTimerRef.current) {
        clearTimeout(scopeAutosaveTimerRef.current);
        scopeAutosaveTimerRef.current = null;
      }
    };
  }, [isScopeLocked, scopeLoaded, persistScope]);

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
  const canComplete = Boolean(deviceCategory && intendedUse &&
    (intendedUse !== "other-custom" || customIntendedUse.trim()));

  // Readiness checks
  const scopeAndDeviceConfirmed = scopeLoaded && canComplete && scopeConfirmed;
  const requirementsApplicabilityConfirmed = requirementsAnalysisStatus === 'succeeded' && requirements.length > 0 && requirements.every(req => req.status === "accepted" || req.status === "not-applicable");
  const allReadinessChecksPassed = scopeAndDeviceConfirmed && requirementsApplicabilityConfirmed;

  // Helper to check if a library requirement is already added
  const isLibraryRequirementAdded = (libraryReqId: string) => {
    const definitionId = requirementsLibrary.find(item => item.id === libraryReqId)?.definitionId;
    return requirements.some(req => req.definitionId === definitionId);
  };

  // Helper to get available library requirements by category
  const getAvailableLibraryRequirements = (category: LibraryRequirement["category"]) => {
    return requirementsLibrary.filter(
      libReq => libReq.category === category && !isLibraryRequirementAdded(libReq.id)
    );
  };

  // Separate requirements by source for display
  const aiSuggestedRequirements = requirements.filter(req => req.source === "ai-suggested");
  const userAddedRequirements = requirements.filter(req => req.source === "library" || req.source === "user-defined");

  const handleAddLibraryRequirement = (libraryReq: LibraryRequirement) => {
    const newRequirement: Requirement = {
      id: libraryReq.id,
      definitionId: libraryReq.definitionId,
      title: libraryReq.title,
      description: libraryReq.description,
      status: "suggested",
      source: "library"
    };
    setRequirements([...requirements, newRequirement]);
  };

  const handleAcceptRequirement = (requirementId: string) => {
    setRequirements(requirements.map(r => r.id === requirementId ? { ...r, status: "accepted" as const } : r));
  };

  const handleRevertRequirement = (requirementId: string) => {
    if (requirements.find(r => r.id === requirementId)?.alwaysApplies) return;
    setRequirements(requirements.map(r => r.id === requirementId ? { ...r, status: "suggested" as const } : r));
  };

  const handleMarkNotApplicable = (requirementId: string) => {
    if (requirements.find(r => r.id === requirementId)?.alwaysApplies) return;
    setJustificationDialog({
      open: true,
      requirementId,
      justification: ""
    });
  };

  const handleSubmitJustification = () => {
    if (justificationDialog.requirementId) {
      setRequirements(requirements.map(r =>
        r.id === justificationDialog.requirementId && !r.alwaysApplies
          ? { ...r, status: "not-applicable" as const, justification: justificationDialog.justification }
          : r
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
      const title = customRequirementDialog.title || customRequirementDialog.document?.name || "Uploaded Document";
      const newRequirement: Requirement = {
        id: `req-custom-${crypto.randomUUID()}`,
        title,
        description: customRequirementDialog.description,
        status: "accepted",
        source: "user-defined"
      };
      setRequirements([...requirements, newRequirement]);
      setCustomRequirementDialog({ open: false, title: "", description: "", document: null });
    }
  };

  const handleRemoveRequirement = (requirementId: string) => {
    const requirement = requirements.find(item => item.id === requirementId);

    // This guard is required even though the UI does not render a remove button
    // for mandatory rows. It prevents a future caller from bypassing the rule.
    if (!requirement || requirement.source === "mandatory") return;

    setRequirements(current => current.filter(item => item.id !== requirementId));
  };

  const handleAssignRole = (roleId: string, personName: string, personEmail: string) => {
    setRoles(roles.map(role =>
      role.id === roleId ? { ...role, assignedTo: personName, email: personEmail } : role
    ));
  };

  const handleConfirmGate = async () => {
    if (!projectId || submittingScope) return;

    setScopeSubmitError(null);
    setSubmittingScope(true);
    try {
      if (scopeAutosaveTimerRef.current) {
        clearTimeout(scopeAutosaveTimerRef.current);
        scopeAutosaveTimerRef.current = null;
      }
      await persistScope();
      if (!isMountedRef.current) return;
      await advanceWorkflowStep({ projectId, stepId: 'scope', to: 'approved' });
      if (!isMountedRef.current) return;
      await refreshWorkflowSnapshot();
      if (!isMountedRef.current) return;
      navigate(`/projects/${projectId}/workflow/protocol/make`);
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = error instanceof WorkflowStepBlockedError
        ? error.message
        : apiErrorMessage(
            error,
            error instanceof Error ? error.message : 'Scope could not be submitted. Please try again.',
          );
      setScopeSubmitError(message);
    } finally {
      if (isMountedRef.current) setSubmittingScope(false);
    }
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

          {/* Section 1: Study Scope & Device Type */}
          <Card>
            <CardHeader>
              <CardTitle>Study Scope & Device Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review and confirm the scope and device type saved in Setup.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="device-category">Device Category</Label>
                  <Select value={deviceCategory} disabled>
                    <SelectTrigger id="device-category" className="mt-1.5">
                      <SelectValue placeholder="Not provided in Setup" />
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
                  <Select value={intendedUse} disabled>
                    <SelectTrigger id="intended-use" className="mt-1.5">
                      <SelectValue placeholder="Not provided in Setup" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENDED_USE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {intendedUse === "other-custom" && (
                  <div>
                    <Label htmlFor="custom-intended-use">Custom intended use</Label>
                    <Input
                      id="custom-intended-use"
                      placeholder="Not provided in Setup"
                      value={customIntendedUse}
                      className="mt-1.5"
                      readOnly
                    />
                  </div>
                )}
              </div>

              <p className="text-xs italic text-muted-foreground">
                To change any of these fields, go back to{' '}
                <Link to={`/projects/${projectId}/workflow/project-setup`} className="underline underline-offset-2">Setup</Link>.
              </p>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConfirmScope}
                  disabled={isScopeLocked || !scopeLoaded || !canComplete || generatingRequirements}
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
              {requirementsAnalysisStatus === 'failed' && requirementsAnalysisError && (
                <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle />
                  <AlertDescription className="flex items-center justify-between gap-3">
                    <span>{requirementsAnalysisError}</span>
                    <Button type="button" size="sm" variant="outline" onClick={generateRequirements} disabled={generatingRequirements || isScopeLocked}>
                      Retry analysis
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {!generatingRequirements && requirementsAnalysisStatus === 'not-run' && requirements.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Confirm your scope and device type above to generate AI-suggested requirements.
                </p>
              )}
              {!generatingRequirements && requirementsAnalysisStatus === 'succeeded' && aiSuggestedRequirements.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  AI analysis completed and found no additional suggested requirements.
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
                      {req.alwaysApplies ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-blue-700" title="Always accepted. Cannot be declined, reverted, or removed.">
                          <Lock className="size-4" /> Accepted · Always required
                        </span>
                      ) : (<>
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
                      </>)}
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
                        const libraryReq = requirementsLibrary.find(req => req.id === value);
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
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
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
                disabled={!allReadinessChecksPassed || submittingScope}
                onClick={handleConfirmGate}
                className={
                  allReadinessChecksPassed && !submittingScope
                    ? `${theme.button.primary} shadow-sm hover:shadow px-6 py-3 rounded-lg font-medium transition-all`
                    : "bg-slate-200 text-slate-500 cursor-not-allowed px-6 py-3 rounded-lg font-medium"
                }
              >
                {submittingScope ? 'Submitting Scope…' : 'Complete Scope & Intended Use'}
              </Button>
            </div>
            {scopeSubmitError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle />
                <AlertDescription>{scopeSubmitError}</AlertDescription>
              </Alert>
            )}
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
