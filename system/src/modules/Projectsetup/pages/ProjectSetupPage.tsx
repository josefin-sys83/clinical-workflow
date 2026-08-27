import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { Lock, CheckCircle2, Circle, Info, X, UserPlus, History, AlertCircle } from 'lucide-react';
import { advanceWorkflowStep } from '@/shared/services/workflowService';
import { AuditLog } from '../components/AuditLog';
import { Breadcrumb } from '../components/Breadcrumb';
import { LockedStateContainer } from '../components/LockedStateContainer';
import { PersonAutocomplete } from '../components/PersonAutocomplete';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { getMandatoryStandards } from '@/shared/workflow/mandatoryStandards';
import { INTENDED_USE_OPTIONS, normalizeStoredIntendedUse } from '@/shared/workflow/intendedUse';
import { theme } from '@/app/theme';

interface Role {
  title: string;
  assignedTo: Array<{ name: string; email: string }>;
  status: 'assigned' | 'pending';
  mandatory: boolean;
  locked?: boolean;
  description: string;
}

type RiskClass = 'I' | 'IIa' | 'IIb' | 'III';

interface ProjectData {
  projectName: string;
  sponsor: string;
  deviceName: string;
  indication: string;
  deviceCategory: string;
  intendedUse: string;
  customIntendedUse: string;
  targetMarkets: string[];
  risk: RiskClass | '';
  ethicsSubmissionTarget: string;
  firstPatientInTarget: string;
  regulatorySubmissionTarget: string;
}

interface AuditLogEntry {
  id: string;
  domain: 'Project' | 'Role' | 'Scope' | 'Requirement' | 'Content' | 'Review' | 'Approval';
  timestamp: string;
  action: string;
  userBy: string;
  userEmail: string;
  details?: string;
  newValue?: string;
}

interface Market {
  code: string;
  name: string;
  framework: string;
}

interface Standard {
  code: string;
  title: string;
}

interface Requirements {
  frameworks: string[];
  standards: Standard[];
}

const DEFAULT_ROLES: Role[] = [
  { title: 'Project Manager', assignedTo: [], status: 'pending', mandatory: true, locked: false, description: 'Responsible for overall study governance, timeline ownership, and coordination of all required roles.' },
  { title: 'Medical Writer', assignedTo: [], status: 'pending', mandatory: true, description: 'Responsible for drafting and maintaining clinical protocol documentation.' },
  { title: 'Protocol Lead', assignedTo: [], status: 'pending', mandatory: true, description: 'Accountable for clinical and scientific integrity of the protocol.' },
  { title: 'Principal Investigator', assignedTo: [], status: 'pending', mandatory: true, description: 'Leads clinical investigation execution and ensures subject safety at the investigation site.' },
  { title: 'Statistician', assignedTo: [], status: 'pending', mandatory: true, description: 'Responsible for statistical methodology and sample size justification.' },
  { title: 'Regulatory Affairs', assignedTo: [], status: 'pending', mandatory: true, description: 'Ensures compliance with applicable regulatory frameworks.' },
  { title: 'Quality Assurance', assignedTo: [], status: 'pending', mandatory: true, description: 'Ensures quality management compliance and audit readiness.' },
  { title: 'Clinical Affairs VP', assignedTo: [], status: 'pending', mandatory: true, description: 'Provides executive clinical strategy oversight and holds final approval authority for protocol documents.' },
];

export function ProjectSetupPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isNew = projectId === 'new' || !projectId;
  const currentUser = 'Dr. Sarah Chen (sarah.chen@medtech.com)';
  const currentUserEmail = 'sarah.chen@medtech.com';

  const [projectNumber, setProjectNumber] = useState<string>('');
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '',
    sponsor: '',
    deviceName: '',
    indication: '',
    deviceCategory: '',
    intendedUse: '',
    customIntendedUse: '',
    targetMarkets: [],
    risk: '',
    ethicsSubmissionTarget: '',
    firstPatientInTarget: '',
    regulatorySubmissionTarget: '',
  });

  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [requirements, setRequirements] = useState<Requirements>({ frameworks: [], standards: [] });

  const { protocolFinalized, isLocked: protocolIsLocked, latestAmendment } = useProtocolStatus(projectId);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const [tooltipField, setTooltipField] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previousProjectDataRef = useRef<ProjectData>(projectData);
  const previousRolesRef = useRef<Role[]>(roles);
  const isInitialMount = useRef(true);
  // Snapshot of the last-saved-to-server state, used purely to detect unsaved edits (see
  // the unsaved-changes navigation guard below) — distinct from previousProjectDataRef/
  // previousRolesRef above, which track the previous *local* value for audit-log diffing.
  const [savedSnapshot, setSavedSnapshot] = useState<{ projectData: ProjectData; roles: Role[] } | null>(null);
  const isDirty = savedSnapshot !== null && (
    JSON.stringify(projectData) !== JSON.stringify(savedSnapshot.projectData) ||
    JSON.stringify(roles) !== JSON.stringify(savedSnapshot.roles)
  );

  // Covers a real page unload (tab close, refresh, typing a new URL) — the browser shows
  // its own native "leave site?" prompt. This does NOT fire for same-app client-side
  // navigation (Link clicks, the Back/Forward buttons), which is why useBlocker below is
  // also needed: React Router intercepts those before the page ever unloads.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Fetch available markets from backend
  useEffect(() => {
    fetch('/api/projects/markets')
      .then(r => r.ok ? r.json() : [])
      .then((data: Market[]) => setMarkets(data))
      .catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    const fetchRequirements = async () => {
      if (projectData.targetMarkets.length === 0 || !projectData.risk) {
        setRequirements({ frameworks: [], standards: [] });
        return;
      }
      try {
        const params = new URLSearchParams({
          risk: projectData.risk,
          deviceCategory: projectData.deviceCategory || '',
          markets: projectData.targetMarkets.join(','),
        });
        const res = await fetch(`/api/projects/requirements?${params}`);
        if (res.ok) {
          const data: Requirements = await res.json();
          setRequirements(data);
        } else {
          setRequirements({ frameworks: [], standards: [] });
        }
      } catch {
        setRequirements({ frameworks: [], standards: [] });
      }
    };
    fetchRequirements();
  }, [projectData.targetMarkets, projectData.risk, projectData.deviceCategory]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const logAudit = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userBy' | 'userEmail'>) => {
    const now = new Date();
    const formattedTimestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAuditTrail(prev => [...prev, { ...entry, id: `audit-${Date.now()}`, timestamp: formattedTimestamp, userBy: 'Dr. Sarah Chen', userEmail: currentUserEmail }]);
  };

  useEffect(() => {
    logAudit({ domain: 'Project', action: `Project ${projectId} created and Project Setup initiated`, details: 'New clinical investigation protocol created' });
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    previousProjectDataRef.current = projectData;
  }, [projectData]);

  useEffect(() => {
    if (isInitialMount.current) return;
    previousRolesRef.current = roles;
  }, [roles]);

  useEffect(() => {
    const intendedUseComplete = projectData.intendedUse !== '' && (
      projectData.intendedUse !== 'other-custom' ||
      projectData.customIntendedUse.trim() !== ''
    );
    const identityComplete = projectData.projectName.trim() !== '' && projectData.sponsor.trim() !== '' && projectData.deviceName.trim() !== '' && projectData.deviceCategory !== '' && intendedUseComplete && projectData.risk !== '' && projectData.targetMarkets.length > 0;
    const rolesComplete = roles.every(role => role.status === 'assigned');
    setIsSetupComplete(identityComplete && rolesComplete);
  }, [projectData, roles]);

  // Real users in the company, for the role-assignment search — a role can only count as
  // "assigned" (see isKnownCompanyUser) once it's tied to one of these, not arbitrary text.
  useEffect(() => {
    fetch('/api/settings/company/user-directory')
      .then(r => r.ok ? r.json() : [])
      .then((users: Array<{ id: string; name: string; email: string }>) => setCompanyUsers(users))
      .catch(() => setCompanyUsers([]));
  }, []);

  // Load saved data from backend on mount. Merge backend roles with DEFAULT_ROLES so that
  // any roles added after initial setup still appear (backward-compatible with older projects).
  useEffect(() => {
    if (!projectId) return;
    setLoadError(null);
    fetch(`/api/projects/${projectId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json();
      })
      .then(project => {
        let loadedProjectData = projectData;
        let loadedRoles = roles;
        setProjectNumber(project.project_number || '');
        const pd = project.data?.projectData || {};
        const storedIntendedUse = normalizeStoredIntendedUse(
          pd.intendedUse,
          pd.customIntendedUse,
        );

        // relational fields come from their authoritative SQL columns/join tables.
        // Only the non-relational setup details are read from JSONB.
        loadedProjectData = {
          projectName: project.name || '',
          sponsor: pd.sponsor || '',
          deviceName: pd.deviceName || '',
          risk: project.risk || '',
          indication: pd.indication || '',
          deviceCategory: project.deviceCategory || '',
          intendedUse: storedIntendedUse.intendedUse,
          customIntendedUse: storedIntendedUse.customIntendedUse,
          targetMarkets: project.targetMarkets || [],
          ethicsSubmissionTarget: pd.ethicsSubmissionTarget || pd.plannedStudyStart || '',
          firstPatientInTarget: pd.firstPatientInTarget || '',
          regulatorySubmissionTarget: pd.regulatorySubmissionTarget || pd.targetSubmissionReadiness || '',
        };
        setProjectData(loadedProjectData);

        // The API returns role assignments from project_members. UI-only role metadata
        // remains defined by DEFAULT_ROLES and is never persisted in JSONB.
        const savedAssignments: Array<{
          title: string;
          assignedTo: Array<{ name: string; email: string }>;
        }> = project.roles || [];
        loadedRoles = DEFAULT_ROLES.map(def => {
          const match = savedAssignments.find(saved => saved.title === def.title);
          const assignedTo = match?.assignedTo || [];
          return {
            ...def,
            assignedTo,
            status: assignedTo.length > 0 ? 'assigned' : 'pending',
          };
        });
        setRoles(loadedRoles);
        setSavedSnapshot({ projectData: loadedProjectData, roles: loadedRoles });
      })
      .catch((e) => {
        console.error('Failed to load project', e);
        setLoadError('Failed to load saved project data. Fields below may be blank or out of date — please refresh the page to try again.');
      });
  }, [projectId]);

  const handleInputChange = (field: keyof ProjectData, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleMarketToggle = (market: string) => {
    setProjectData(prev => ({
      ...prev,
      targetMarkets: prev.targetMarkets.includes(market)
        ? prev.targetMarkets.filter(m => m !== market)
        : [...prev.targetMarkets, market]
    }));
  };

  const addPersonToRole = (roleIndex: number) => {
    setRoles(prev => prev.map((role, i) => i !== roleIndex ? role : { ...role, assignedTo: [...role.assignedTo, { name: '', email: '' }] }));
  };

  // A role only counts as "assigned" once its person matches a real user in the company
  // directory — free text that happens to look like a name/email doesn't qualify. This is
  // what stops a misspelled or made-up email from being savable as a completed assignment,
  // and it's also the gate BUGG 8 relies on before writing a project_members row.
  const isKnownCompanyUser = (person: { name: string; email: string }) =>
    companyUsers.some(u => u.email.toLowerCase() === person.email.trim().toLowerCase());

  const removePersonFromRole = (roleIndex: number, personIndex: number) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      const updatedPeople = role.assignedTo.filter((_, idx) => idx !== personIndex);
      return { ...role, assignedTo: updatedPeople, status: updatedPeople.some(isKnownCompanyUser) ? 'assigned' : 'pending' };
    }));
  };

  const handlePersonChange = (roleIndex: number, personIndex: number, person: { name: string; email: string }) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      const updatedPeople = [...role.assignedTo];
      updatedPeople[personIndex] = person;
      return { ...role, assignedTo: updatedPeople, status: updatedPeople.some(isKnownCompanyUser) ? 'assigned' : 'pending' };
    }));
  };

  const handleExportAuditTrail = () => {
    const exportData = { projectId, exportDate: new Date().toISOString(), entries: auditTrail };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const identityComplete = projectData.projectName.trim() !== '' && projectData.sponsor.trim() !== '' && projectData.deviceName.trim() !== '' && projectData.risk !== '' && projectData.targetMarkets.length > 0;
  const projectManagerAssigned = roles[0].status === 'assigned';
  const allRolesAssigned = roles.every(role => role.status === 'assigned');

  const maxStep = parseInt(localStorage.getItem(`maxStep_${projectId}`) || '0');

  const phase1Steps = [
    { id: '1', label: 'Setup', status: 'active' as const, path: `/projects/${projectId}/workflow/project-setup` },
    { id: '2', label: 'Synopsis', status: (maxStep >= 2 ? 'completed' : 'locked') as 'completed' | 'locked', path: `/projects/${projectId}/workflow/synopsis` },
    { id: '3', label: 'Scope & Intended Use', status: (maxStep >= 3 ? 'completed' : 'locked') as 'completed' | 'locked', path: `/projects/${projectId}/workflow/scope` },
  ];

  const handleCompleteSetup = async () => {
    setSaveError(null);
    setIsSaving(true);

    try {
      let response;
      let newProjectId = projectId;
      const {
        projectName,
        risk,
        deviceCategory,
        targetMarkets,
        ...jsonProjectData
      } = projectData;
      const setupPayload = {
        name: projectName,
        risk: risk || null,
        deviceCategory: deviceCategory || null,
        targetMarkets,
        roles: roles.map(role => ({
          title: role.title,
          assignedTo: role.assignedTo,
        })),
        description: `Device: ${projectData.deviceName} | Sponsor: ${projectData.sponsor}`,
        data: { projectData: jsonProjectData },
      };

      if (isNew) {
        // ---------- CREATION MODE: POST /api/projects ----------
        response = await fetch(`/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setupPayload),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Creation failed with status ${response.status}`);
        }
        const result = await response.json();
        newProjectId = result.id; // assumes backend returns { id: '...' }

        navigate(`/projects/${newProjectId}/workflow/project-setup`);
        return;
      }

      response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupPayload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Update failed with status ${response.status}`);
      }

      // --- For edit: update dirty state and advance workflow ---
      flushSync(() => setSavedSnapshot({ projectData, roles }));
      await advanceWorkflowStep({ projectId: projectId!, stepId: 'project-setup', to: 'approved' });
      const current = parseInt(localStorage.getItem(`maxStep_${projectId}`) || '0');
      if (current < 2) localStorage.setItem(`maxStep_${projectId}`, '2');
      navigate(`/projects/${projectId}/workflow/synopsis`);

      logAudit({ domain: 'Approval', action: 'Project Setup completed successfully', details: 'All requirements met. Unlocking Synopsis phase.' });

    } catch (e: any) {
      console.error('Failed to save project', e);
      setSaveError(e.message || 'Failed to save project, please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateComplexity = (data: ProjectData): string => {
    let points = 0;
    const markets = data.targetMarkets || [];
    if (markets.includes('EU')) points += 3;
    if (markets.includes('US')) points += 3;
    if (markets.includes('UK')) points += 2;
    if (markets.includes('Japan')) points += 3;
    if (markets.includes('China')) points += 4;
    if (markets.includes('Canada')) points += 1;
    if (markets.includes('Australia')) points += 1;
    if (points <= 4) return 'Low';
    if (points <= 8) return 'Medium';
    if (points <= 13) return 'High';
    return 'Very High';
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-80 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Workflow Steps</h2>
          <nav className="space-y-4">
            <div>
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project setup</span>
              </div>
              <div className="space-y-1">
                {phase1Steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => step.status !== 'locked' && step.status !== 'active' && step.path && navigate(step.path)}
                    className={`flex items-center gap-3 transition-colors ${step.status === 'active'
                      ? 'bg-blue-50 border border-blue-200 rounded-lg p-3'
                      : step.status === 'completed'
                        ? 'px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'px-3 py-2 rounded-md text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex-shrink-0">
                      {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      {step.status === 'active' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                          {index + 1}
                        </div>
                      )}
                      {step.status === 'locked' && <Lock className="w-5 h-5 text-slate-300" />}
                    </div>
                    <span className={`text-sm ${step.status === 'active' ? 'font-medium text-blue-900' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="text-xs text-slate-600">
            <div className="font-medium mb-1">System Information</div>
            <div>Version 2.4.1</div>
            <div>Last updated: Jan 24, 2026</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <MilestoneBanner projectId={projectId!} currentStepId="project-setup" />
        {protocolFinalized && (
          <div className="mx-6 mt-4">
            <ProtocolFinalizedBanner
              projectId={projectId!}
              latestAmendment={latestAmendment}
            />
          </div>
        )}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Breadcrumb currentStep="project_setup" />
          </div>
        </div>

        {loadError && (
          <div className="max-w-6xl mx-auto px-6 pt-4">
            <div className={`flex items-center gap-2 p-3 ${theme.status.error} rounded-md text-sm`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {loadError}
            </div>
          </div>
        )}

        <div className={protocolIsLocked || loadError ? 'pointer-events-none opacity-50 select-none' : ''}>
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <div className="flex items-center gap-8 pb-6 border-b border-slate-200">
              <div>
                <div className="text-sm text-slate-600 mb-2">Project Number</div>
                <div className="text-xl text-slate-900">{projectNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-2">Project ID</div>
                <div className="text-xl text-slate-900">{projectId}</div>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Section 1: Project Identity */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Project Identity</h3>
                <p className="text-sm text-slate-600">Define the fundamental attributes of this clinical investigation.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Project Name <span className="text-rose-700">*</span></label>
                  <input type="text" value={projectData.projectName} onChange={(e) => handleInputChange('projectName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Enter project name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Sponsor (Legal Entity) <span className="text-rose-700">*</span></label>
                  <input type="text" value={projectData.sponsor} onChange={(e) => handleInputChange('sponsor', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Enter sponsor name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Device Name <span className="text-rose-700">*</span></label>
                  <input type="text" value={projectData.deviceName} onChange={(e) => handleInputChange('deviceName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="e.g., CardioAssist LVAD System" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Intended Medical Indication</label>
                  <input type="text" value={projectData.indication} onChange={(e) => handleInputChange('indication', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="e.g., advanced heart failure" />
                </div>
                <div className="grid grid-cols-2 gap-6 col-span-2 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Device Category <span className="text-rose-700">*</span></label>
                    <select
                      required
                      value={projectData.deviceCategory}
                      onChange={(e) => handleInputChange('deviceCategory', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                      <option value="">Select device category...</option>
                      <option value="samd">Software as a Medical Device (SaMD)</option>
                      <option value="ai-ml">AI-enabled / Machine Learning Device</option>
                      <option value="simd">Software in a Medical Device (SiMD)</option>
                      <option value="ivd">In Vitro Diagnostic (IVD)</option>
                      <option value="aimd">Active Implantable Medical Device (AIMD)</option>
                      <option value="implantable">Implantable Medical Device</option>
                      <option value="non-implantable">Non-implantable Medical Device</option>
                      <option value="active">Active Medical Device</option>
                      <option value="combination">Combination Product</option>
                      <option value="accessory">Accessory to Medical Device</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Intended Use <span className="text-rose-700">*</span></label>
                    <select
                      required
                      value={projectData.intendedUse}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        setProjectData(prev => ({
                          ...prev,
                          intendedUse: selectedValue,
                          customIntendedUse: selectedValue === 'other-custom'
                            ? prev.customIntendedUse
                            : '',
                        }));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                      <option value="">Select intended use...</option>
                      {INTENDED_USE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {projectData.intendedUse === 'other-custom' && (
                      <input
                        type="text"
                        required
                        value={projectData.customIntendedUse}
                        onChange={(e) => handleInputChange('customIntendedUse', e.target.value)}
                        placeholder="Describe the intended use and clinical context"
                        className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Risk Class <span className="text-rose-700">*</span>
                  </label>
                  <select
                    required
                    value={projectData.risk}
                    onChange={(e) => handleInputChange('risk', e.target.value as RiskClass | '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  >
                    <option value="">Select risk class...</option>
                    <option value="I">I</option>
                    <option value="IIa">IIa</option>
                    <option value="IIb">IIb</option>
                    <option value="III">III</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Target Markets <span className="text-rose-700">*</span></label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {markets.map((market) => (
                      <button
                        key={market.code}
                        type="button"
                        onClick={() => handleMarketToggle(market.code)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${projectData.targetMarkets.includes(market.code) ? 'bg-slate-100 border-slate-400 text-slate-900 font-medium' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'}`}
                      >
                        {market.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {projectData.targetMarkets.length > 0 && (
                <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Auto-Detected Requirements</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-900 mb-2">Regulatory Frameworks</div>
                      <div className="space-y-1">
                        {requirements.frameworks.map((f, i) => (
                          <div key={i} className="text-xs text-slate-800 bg-white rounded px-2 py-1">{f}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-900 mb-2">Mandatory Documents</div>
                      <div className="space-y-1">
                        {['Clinical Investigation Protocol', "Investigator's Brochure", 'Informed Consent Form (ICF)', 'Risk Management File (ISO 14971)', 'Clinical Evaluation Report (CER)', 'Statistical Analysis Plan (SAP)'].map((doc, i) => (
                          <div key={i} className="text-xs text-slate-800 bg-white rounded px-2 py-1">{doc}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-900 mb-2">Applicable Standards</div>
                      <div className="space-y-1">
                        {requirements.standards.map((s) => (
                          <div key={s.code} className="text-xs text-slate-800 bg-white rounded px-2 py-1">
                            {s.code} - {s.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Roles */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Roles & Responsibilities</h3>
                <p className="text-sm text-slate-600">All mandatory roles must be assigned to enable protocol development.</p>
              </div>
              <div className="space-y-4">
                {roles.map((role, roleIndex) => (
                  <div key={roleIndex} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{role.title}</span>
                        {role.mandatory && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">Required</span>}
                        {role.description && (
                          <span
                            className="relative inline-flex"
                            onMouseEnter={() => setHoveredRole(roleIndex)}
                            onMouseLeave={() => setHoveredRole(null)}
                          >
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                            {hoveredRole === roleIndex && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20">
                                {role.description}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                      {role.status === 'assigned' && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-blue-700">
                          <CheckCircle2 className="w-4 h-4" /> Assigned
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {role.assignedTo.length === 0 && (
                        <button type="button" onClick={() => addPersonToRole(roleIndex)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors">
                          <UserPlus className="w-4 h-4" /> Add Person to {role.title}
                        </button>
                      )}
                      {role.assignedTo.map((person, personIndex) => {
                        const hasTypedSomething = person.name.trim() !== '' || person.email.trim() !== '';
                        const unmatched = hasTypedSomething && !isKnownCompanyUser(person);
                        return (
                          <div key={personIndex} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                <PersonAutocomplete
                                  field="name"
                                  value={person}
                                  onChange={(p) => handlePersonChange(roleIndex, personIndex, p)}
                                  suggestions={companyUsers}
                                  placeholder="Search by name…"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                <PersonAutocomplete
                                  field="email"
                                  value={person}
                                  onChange={(p) => handlePersonChange(roleIndex, personIndex, p)}
                                  suggestions={companyUsers}
                                  placeholder="Search by email…"
                                />
                              </div>
                            </div>
                            {unmatched && (
                              <p className="text-xs text-rose-700 mb-2">
                                No matching user in your company — select someone from the suggestions to assign this role.
                              </p>
                            )}
                            <button type="button" onClick={() => removePersonFromRole(roleIndex, personIndex)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border border-slate-300 rounded transition-colors">
                              <X className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        );
                      })}
                      {role.assignedTo.length > 0 && (
                        <button type="button" onClick={() => addPersonToRole(roleIndex)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                          <UserPlus className="w-4 h-4" /> Add Another Person
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Project Milestones */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Project Milestones</h3>
                <p className="text-sm text-slate-600">Enter your three external anchor dates. The system automatically calculates when each workflow step must start based on project complexity.</p>
              </div>
              <div className="mb-4 p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <div className="text-sm font-medium text-purple-900 mb-1">AI-calculated complexity</div>
                    <p className="text-xs text-purple-700">Based on target markets, device category, and study scope.</p>
                  </div>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                <span>Estimated complexity: <strong className="text-slate-900">{calculateComplexity(projectData)}</strong></span>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ethics Submission Target</label>
                  <p className="text-xs text-slate-500 mb-2 flex-1">When you plan to submit to ethics committee</p>
                  <input type="date" value={projectData.ethicsSubmissionTarget} onChange={(e) => handleInputChange('ethicsSubmissionTarget', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Patient In (FPI) Target</label>
                  <p className="text-xs text-slate-500 mb-2 flex-1">Planned date for first enrolled patient</p>
                  <input type="date" value={projectData.firstPatientInTarget} onChange={(e) => handleInputChange('firstPatientInTarget', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Regulatory Submission Target</label>
                  <p className="text-xs text-slate-500 mb-2 flex-1">Final deadline for regulatory submission</p>
                  <input type="date" value={projectData.regulatorySubmissionTarget} onChange={(e) => handleInputChange('regulatorySubmissionTarget', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>
            </section>

            {/* Section 4: Readiness */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Readiness & Dependencies</h3>
              </div>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${identityComplete ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  {identityComplete ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
                  <span className={`font-medium ${identityComplete ? 'text-blue-900' : 'text-slate-700'}`}>Project identity completed</span>
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${projectManagerAssigned ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  {projectManagerAssigned ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
                  <span className={`font-medium ${projectManagerAssigned ? 'text-blue-900' : 'text-slate-700'}`}>Project Manager assigned</span>
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${allRolesAssigned ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  {allRolesAssigned ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
                  <span className={`font-medium ${allRolesAssigned ? 'text-blue-900' : 'text-slate-700'}`}>All required roles assigned</span>
                </div>
              </div>
              <LockedStateContainer title="Synopsis is locked" message="Complete all requirements above to unlock the next phase of protocol development." />
            </section>

            {/* Primary Action */}
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              {saveError && (
                <div className={`flex items-center gap-2 p-3 mb-4 ${theme.status.error} rounded-md text-sm`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">Ready to proceed?</div>
                  <div className="text-sm text-slate-600 mt-1">{isSetupComplete ? 'All requirements met.' : 'Complete all required fields and role assignments to proceed.'}</div>
                </div>
                <button
                  disabled={!isSetupComplete || isSaving}
                  onClick={handleCompleteSetup}
                  className={`...`}
                >
                  {isSaving
                    ? 'Saving...'
                    : isNew
                      ? 'Create Project'
                      : 'Complete Setup'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>{/* end protocolFinalized overlay */}
      </main>

      <AuditLog entries={auditTrail} onExport={handleExportAuditTrail} isOpen={isAuditTrailOpen} onToggle={() => setIsAuditTrailOpen(!isAuditTrailOpen)} />

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Leave without saving?</h2>
            <p className="text-sm text-slate-600 mb-6">
              You have unsaved changes on this page. If you leave now, those changes will be lost.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => blocker.reset?.()}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Stay on this page
              </button>
              <button
                onClick={() => blocker.proceed?.()}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}