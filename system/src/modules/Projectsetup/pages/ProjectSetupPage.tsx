import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, CheckCircle2, Circle, Info, X, UserPlus, History } from 'lucide-react';
import { AuditLog } from '../components/AuditLog';
import { Breadcrumb } from '../components/Breadcrumb';
import { LockedStateContainer } from '../components/LockedStateContainer';

interface Role {
  title: string;
  assignedTo: Array<{ name: string; email: string }>;
  status: 'assigned' | 'pending';
  mandatory: boolean;
  locked?: boolean;
  description: string;
}

interface ProjectData {
  projectName: string;
  sponsor: string;
  deviceName: string;
  indication: string;
  targetMarkets: string[];
  plannedStudyStart: string;
  targetSubmissionReadiness: string;
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

export function ProjectSetupPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentUser = 'Dr. Sarah Chen (sarah.chen@medtech.com)';
  const currentUserEmail = 'sarah.chen@medtech.com';

  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '',
    sponsor: '',
    deviceName: '',
    indication: '',
    targetMarkets: [],
    plannedStudyStart: '',
    targetSubmissionReadiness: '',
  });

  const [roles, setRoles] = useState<Role[]>([
    { title: 'Project Manager', assignedTo: [], status: 'pending', mandatory: true, locked: false, description: 'Responsible for overall study governance, timeline ownership, and coordination of all required roles.' },
    { title: 'Medical Writer', assignedTo: [], status: 'pending', mandatory: true, description: 'Responsible for drafting and maintaining clinical protocol documentation.' },
    { title: 'Protocol Lead', assignedTo: [], status: 'pending', mandatory: true, description: 'Accountable for clinical and scientific integrity of the protocol.' },
    { title: 'Statistician', assignedTo: [], status: 'pending', mandatory: true, description: 'Responsible for statistical methodology and sample size justification.' },
    { title: 'Regulatory Affairs', assignedTo: [], status: 'pending', mandatory: true, description: 'Ensures compliance with applicable regulatory frameworks.' },
    { title: 'Quality Assurance', assignedTo: [], status: 'pending', mandatory: true, description: 'Ensures quality management compliance and audit readiness.' },
  ]);

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const [tooltipField, setTooltipField] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const previousProjectDataRef = useRef<ProjectData>(projectData);
  const previousRolesRef = useRef<Role[]>(roles);
  const isInitialMount = useRef(true);

  const logAudit = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userBy' | 'userEmail'>) => {
    const now = new Date();
    const formattedTimestamp = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
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
    const identityComplete = projectData.projectName.trim() !== '' && projectData.sponsor.trim() !== '' && projectData.deviceName.trim() !== '' && projectData.targetMarkets.length > 0;
    const rolesComplete = roles.every(role => role.status === 'assigned');
    setIsSetupComplete(identityComplete && rolesComplete);
  }, [projectData, roles]);

  // Load saved data from backend on mount
  useEffect(() => {
    if (!projectId) return;
    fetch(`${window.location.origin.replace('-5173.', '-3001.')}/api/projects/${projectId}`)
      .then(r => r.json())
      .then(project => {
        if (project.data?.projectData) setProjectData(project.data.projectData);
        if (project.data?.roles) setRoles(project.data.roles);
      })
      .catch(() => {});
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

  const getMarketRequirements = () => {
    const requirements: { frameworks: string[]; documents: string[]; standards: string[] } = { frameworks: [], documents: [], standards: [] };
    if (projectData.targetMarkets.includes('EU')) { requirements.frameworks.push('EU MDR 2017/745'); requirements.standards.push('ISO 14155:2020'); }
    if (projectData.targetMarkets.includes('US')) { requirements.frameworks.push('FDA IDE / 21 CFR 812'); requirements.standards.push('FDA Guidance - IDE Policies'); }
    if (projectData.targetMarkets.includes('UK')) requirements.frameworks.push('UK MDR / MHRA');
    if (projectData.targetMarkets.includes('Canada')) requirements.frameworks.push('Health Canada - SOR/98-282');
    if (projectData.targetMarkets.includes('Australia')) requirements.frameworks.push('TGA - Therapeutic Goods Regulations');
    if (projectData.targetMarkets.includes('Japan')) requirements.frameworks.push('PMDA - Pharmaceutical and Medical Device Act');
    if (projectData.targetMarkets.includes('China')) requirements.frameworks.push('NMPA - Medical Device Regulations');
    if (projectData.targetMarkets.length > 0) {
      requirements.documents.push('Clinical Investigation Protocol', "Investigator's Brochure", 'Informed Consent Form (ICF)', 'Risk Management File (ISO 14971)', 'Clinical Evaluation Report (CER)', 'Statistical Analysis Plan (SAP)');
      requirements.standards.push('ISO 14971:2019 - Risk Management', 'ISO 13485:2016 - Quality Management Systems');
    }
    return requirements;
  };

  const getRegulatoryPathwaySummary = () => {
    const summaries: string[] = [];
    if (projectData.targetMarkets.includes('EU')) summaries.push('EU: Clinical Investigation under MDR 2017/745');
    if (projectData.targetMarkets.includes('US')) summaries.push('US: FDA IDE / 21 CFR 812');
    if (projectData.targetMarkets.includes('UK')) summaries.push('UK: Clinical Investigation under UK MDR / MHRA');
    if (projectData.targetMarkets.includes('Canada')) summaries.push('Canada: Health Canada Medical Devices Regulations');
    if (projectData.targetMarkets.includes('Australia')) summaries.push('Australia: TGA Therapeutic Goods Act');
    if (projectData.targetMarkets.includes('Japan')) summaries.push('Japan: PMDA Medical Device Approval');
    if (projectData.targetMarkets.includes('China')) summaries.push('China: NMPA Medical Device Registration');
    return summaries;
  };

  const addPersonToRole = (roleIndex: number) => {
    setRoles(prev => prev.map((role, i) => i !== roleIndex ? role : { ...role, assignedTo: [...role.assignedTo, { name: '', email: '' }] }));
  };

  const removePersonFromRole = (roleIndex: number, personIndex: number) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      const updatedPeople = role.assignedTo.filter((_, idx) => idx !== personIndex);
      return { ...role, assignedTo: updatedPeople, status: updatedPeople.some(p => p.name.trim() !== '' && p.email.trim() !== '') ? 'assigned' : 'pending' };
    }));
  };

  const handleRoleAssignment = (roleIndex: number, personIndex: number, field: 'name' | 'email', value: string) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      const updatedPeople = [...role.assignedTo];
      updatedPeople[personIndex] = { ...updatedPeople[personIndex], [field]: value };
      return { ...role, assignedTo: updatedPeople, status: updatedPeople.some(p => p.name.trim() !== '' && p.email.trim() !== '') ? 'assigned' : 'pending' };
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

  const identityComplete = projectData.projectName.trim() !== '' && projectData.sponsor.trim() !== '' && projectData.deviceName.trim() !== '' && projectData.targetMarkets.length > 0;
  const projectManagerAssigned = roles[0].status === 'assigned';
  const allRolesAssigned = roles.every(role => role.status === 'assigned');

  const workflowSteps = [
    { name: 'Setup', locked: false, active: true, section: 'PROJECT SETUP', path: null },
    { name: 'Synopsis', locked: false, active: false, section: 'PROJECT SETUP', path: `/projects/${projectId}/workflow/synopsis` },
    { name: 'Scope & Intended Use', locked: parseInt(localStorage.getItem(`maxStep_${projectId}`) || '0') < 3, active: false, section: 'PROJECT SETUP', path: `/projects/${projectId}/workflow/scope` },
  ];

  const handleCompleteSetup = async () => {
    logAudit({ domain: 'Approval', action: 'Project Setup completed successfully', details: 'All requirements met. Unlocking Synopsis phase.' });
    try {
      await fetch(`${window.location.origin.replace('-5173.', '-3001.')}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectData.projectName,
          description: `Device: ${projectData.deviceName} | Sponsor: ${projectData.sponsor}`,
          data: { projectData, roles },
        }),
      });
    } catch (e) {
      console.error('Failed to save project', e);
    }
    const current = parseInt(localStorage.getItem(`maxStep_${projectId}`) || '0');
    if (current < 2) localStorage.setItem(`maxStep_${projectId}`, '2');
    navigate(`/projects/${projectId}/workflow/synopsis`);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-40">
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4 px-3">
            <h2 className="text-sm font-semibold text-slate-900">Workflow Steps</h2>
          </div>
          <div className="mb-2 px-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project setup</div>
          </div>
          <div className="space-y-1">
            {workflowSteps.map((step, index) => (
              <div
                key={index}
                onClick={() => !step.locked && step.path && navigate(step.path)}
                style={{ cursor: step.locked ? 'not-allowed' : step.active ? 'default' : 'pointer' }}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${step.active ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'} ${step.locked ? 'opacity-60' : ''}`}
              >
                <div className="mt-0.5">
                  {step.locked ? <Lock className="w-4 h-4 text-slate-400" /> : step.active ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">1</span>
                    </div>
                  ) : <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${step.active ? 'font-medium text-blue-900' : 'text-slate-700'}`}>{step.name}</div>
                </div>
              </div>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-600">
            <div className="font-medium mb-1">System Information</div>
            <div>Version 2.4.1</div>
            <div>Last updated: Jan 24, 2026</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Breadcrumb currentStep="project_setup" />

          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-8 pb-6 border-b border-slate-200">
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
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Project Name <span className="text-red-600">*</span></label>
                <input type="text" value={projectData.projectName} onChange={(e) => handleInputChange('projectName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Enter project name" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Sponsor (Legal Entity) <span className="text-red-600">*</span></label>
                <input type="text" value={projectData.sponsor} onChange={(e) => handleInputChange('sponsor', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Enter sponsor name" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Device Name <span className="text-red-600">*</span></label>
                <input type="text" value={projectData.deviceName} onChange={(e) => handleInputChange('deviceName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="e.g., CardioAssist LVAD System" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Intended Medical Indication</label>
                <input type="text" value={projectData.indication} onChange={(e) => handleInputChange('indication', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="e.g., advanced heart failure" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">Target Markets <span className="text-red-600">*</span></label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['EU', 'US', 'UK', 'Canada', 'Australia', 'Japan', 'China'].map((market) => (
                    <button key={market} type="button" onClick={() => handleMarketToggle(market)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${projectData.targetMarkets.includes(market) ? 'bg-slate-100 border-slate-400 text-slate-900 font-medium' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'}`}>
                      {market === 'EU' && 'European Union (EU MDR)'}
                      {market === 'US' && 'United States (FDA)'}
                      {market === 'UK' && 'United Kingdom (MHRA)'}
                      {market === 'Canada' && 'Canada (Health Canada)'}
                      {market === 'Australia' && 'Australia (TGA)'}
                      {market === 'Japan' && 'Japan (PMDA)'}
                      {market === 'China' && 'China (NMPA)'}
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
                    <div className="space-y-1">{getMarketRequirements().frameworks.map((f, i) => <div key={i} className="text-xs text-slate-800 bg-white rounded px-2 py-1">{f}</div>)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900 mb-2">Mandatory Documents</div>
                    <div className="space-y-1">{getMarketRequirements().documents.slice(0, 6).map((d, i) => <div key={i} className="text-xs text-slate-800 bg-white rounded px-2 py-1">{d}</div>)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900 mb-2">Applicable Standards</div>
                    <div className="space-y-1">{getMarketRequirements().standards.map((s, i) => <div key={i} className="text-xs text-slate-800 bg-white rounded px-2 py-1">{s}</div>)}</div>
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
                    {role.assignedTo.map((person, personIndex) => (
                      <div key={personIndex} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                            <input type="text" value={person.name} onChange={(e) => handleRoleAssignment(roleIndex, personIndex, 'name', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Full name" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                            <input type="email" value={person.email} onChange={(e) => handleRoleAssignment(roleIndex, personIndex, 'email', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="email@example.com" />
                          </div>
                        </div>
                        <button type="button" onClick={() => removePersonFromRole(roleIndex, personIndex)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border border-slate-300 rounded transition-colors">
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    ))}
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

          {/* Section 3: Timeline */}
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Timeline Ownership</h3>
              <p className="text-sm text-slate-600">The Project Manager owns the timeline.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Planned Study Start Date</label>
                <input type="date" value={projectData.plannedStudyStart} onChange={(e) => handleInputChange('plannedStudyStart', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Submission Readiness Date</label>
                <input type="date" value={projectData.targetSubmissionReadiness} onChange={(e) => handleInputChange('targetSubmissionReadiness', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
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
          <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Ready to proceed?</div>
              <div className="text-sm text-slate-600 mt-1">{isSetupComplete ? 'All requirements met.' : 'Complete all required fields and role assignments to proceed.'}</div>
            </div>
            <button disabled={!isSetupComplete} onClick={handleCompleteSetup} className={`px-6 py-3 rounded-lg font-medium transition-all ${isSetupComplete ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              Complete Setup
            </button>
          </div>
        </div>
      </main>

      <AuditLog entries={auditTrail} onExport={handleExportAuditTrail} isOpen={isAuditTrailOpen} onToggle={() => setIsAuditTrailOpen(!isAuditTrailOpen)} />
    </div>
  );
}