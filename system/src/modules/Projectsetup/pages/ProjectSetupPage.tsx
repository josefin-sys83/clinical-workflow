import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, CheckCircle2, Circle, Info, X, UserPlus, History, Copy, UserCircle } from 'lucide-react';
import { AuditLog } from '../components/AuditLog';
import { Breadcrumb } from '../components/Breadcrumb';
import { LockedStateContainer } from '../components/LockedStateContainer';
import { RoleSuggestions } from '../components/RoleSuggestions';
import { PersonAutocomplete } from '../components/PersonAutocomplete';

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
  timestamp: string; // Format: MM/DD/YYYY HH:MM
  action: string; // Primary action description
  userBy: string; // Full name
  userEmail: string;
  details?: string; // Optional details line
  newValue?: string; // Optional "New:" value line
}

export function ProjectSetupPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // Mock current user - in production this would come from authentication
  const currentUser = 'Dr. Sarah Chen (sarah.chen@medtech.com)';
  const currentUserEmail = 'sarah.chen@medtech.com';
  
  // Mock data: People directory for autocomplete
  const PEOPLE_DIRECTORY = [
    { name: 'Dr. Sarah Chen', email: 'sarah.chen@medtech.com', department: 'Clinical Operations', projectCount: 5, lastUsed: '2024-01-15' },
    { name: 'Dr. Michael Rodriguez', email: 'michael.rodriguez@medtech.com', department: 'Medical Affairs', projectCount: 4, lastUsed: '2024-01-10' },
    { name: 'Emma Thompson', email: 'emma.thompson@medtech.com', department: 'Regulatory Affairs', projectCount: 6, lastUsed: '2024-01-12' },
    { name: 'Dr. James Wilson', email: 'james.wilson@medtech.com', department: 'Biostatistics', projectCount: 3, lastUsed: '2024-01-08' },
    { name: 'Lisa Anderson', email: 'lisa.anderson@medtech.com', department: 'Quality Assurance', projectCount: 4, lastUsed: '2024-01-14' },
    { name: 'Robert Kim', email: 'robert.kim@medtech.com', department: 'Regulatory Affairs', projectCount: 2, lastUsed: '2023-12-20' },
    { name: 'Dr. Patricia Martinez', email: 'patricia.martinez@medtech.com', department: 'Clinical Science', projectCount: 3, lastUsed: '2024-01-05' },
    { name: 'David Chang', email: 'david.chang@medtech.com', department: 'Medical Writing', projectCount: 5, lastUsed: '2024-01-11' },
  ];

  // Mock data: Previous project template (CIP-2023-045)
  const PREVIOUS_PROJECT_TEAM = {
    'Project Manager': { name: 'Dr. Sarah Chen', email: 'sarah.chen@medtech.com' },
    'Medical Writer': { name: 'David Chang', email: 'david.chang@medtech.com' },
    'Protocol Lead': { name: 'Dr. Michael Rodriguez', email: 'michael.rodriguez@medtech.com' },
    'Statistician': { name: 'Dr. James Wilson', email: 'james.wilson@medtech.com' },
    'Regulatory Affairs': { name: 'Emma Thompson', email: 'emma.thompson@medtech.com' },
    'Quality Assurance': { name: 'Lisa Anderson', email: 'lisa.anderson@medtech.com' },
  };

  // Mock data: Role-specific suggestions based on history
  const getRoleSuggestions = (roleTitle: string) => {
    const suggestions: { name: string; email: string; reason: string; projectName?: string }[] = [];
    
    switch (roleTitle) {
      case 'Project Manager':
        suggestions.push(
          { 
            name: 'Dr. Sarah Chen', 
            email: 'sarah.chen@medtech.com', 
            reason: 'Led 5 similar projects recently',
            projectName: 'CIP-2023-045'
          },
          { 
            name: 'Dr. Patricia Martinez', 
            email: 'patricia.martinez@medtech.com', 
            reason: 'Experience with EU MDR compliance',
            projectName: 'CIP-2023-032'
          }
        );
        break;
      
      case 'Medical Writer':
        suggestions.push(
          { 
            name: 'David Chang', 
            email: 'david.chang@medtech.com', 
            reason: 'Authored 5 recent protocols',
            projectName: 'CIP-2023-045'
          }
        );
        break;
      
      case 'Protocol Lead':
        suggestions.push(
          { 
            name: 'Dr. Michael Rodriguez', 
            email: 'michael.rodriguez@medtech.com', 
            reason: 'Led protocol for CIP-2023-045',
            projectName: 'CIP-2023-045'
          }
        );
        break;
      
      case 'Statistician':
        suggestions.push(
          { 
            name: 'Dr. James Wilson', 
            email: 'james.wilson@medtech.com', 
            reason: 'Statistician on recent cardiology studies',
            projectName: 'CIP-2023-045'
          }
        );
        break;
      
      case 'Regulatory Affairs':
        suggestions.push(
          { 
            name: 'Emma Thompson', 
            email: 'emma.thompson@medtech.com', 
            reason: 'Handled 6 recent regulatory submissions',
            projectName: 'CIP-2023-045'
          },
          { 
            name: 'Robert Kim', 
            email: 'robert.kim@medtech.com', 
            reason: 'FDA IDE specialist',
            projectName: 'CIP-2023-021'
          }
        );
        break;
      
      case 'Quality Assurance':
        suggestions.push(
          { 
            name: 'Lisa Anderson', 
            email: 'lisa.anderson@medtech.com', 
            reason: 'QA lead on 4 recent projects',
            projectName: 'CIP-2023-045'
          }
        );
        break;
    }
    
    return suggestions;
  };
  
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
    { 
      title: 'Project Manager', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true, 
      locked: false,
      description: 'Responsible for overall study governance, timeline ownership, and coordination of all required roles. Controls milestone generation and unlocks downstream protocol activities.'
    },
    { 
      title: 'Medical Writer', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true,
      description: 'Responsible for drafting and maintaining clinical protocol documentation in alignment with regulatory and scientific requirements.'
    },
    { 
      title: 'Protocol Lead', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true,
      description: 'Accountable for clinical and scientific integrity of the protocol, including study rationale, objectives, and design decisions.'
    },
    { 
      title: 'Statistician', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true,
      description: 'Responsible for statistical methodology, sample size justification, and alignment between study objectives and analysis strategy.'
    },
    { 
      title: 'Regulatory Affairs', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true,
      description: 'Ensures compliance with applicable regulatory frameworks (EU MDR, FDA IDE) and supports regulatory readiness and submissions.'
    },
    { 
      title: 'Quality Assurance', 
      assignedTo: [], 
      status: 'pending', 
      mandatory: true,
      description: 'Ensures quality management compliance, audit readiness, and adherence to approved processes throughout the study lifecycle.'
    },
  ]);

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const [tooltipField, setTooltipField] = useState<string | null>(null);
  
  // Audit Trail State
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const previousProjectDataRef = useRef<ProjectData>(projectData);
  const previousRolesRef = useRef<Role[]>(roles);
  const isInitialMount = useRef(true);

  // Audit logging function
  const logAudit = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userBy' | 'userEmail'>) => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedTimestamp = `${month}/${day}/${year} ${hours}:${minutes}`;
    
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: formattedTimestamp,
      userBy: 'Dr. Sarah Chen',
      userEmail: currentUserEmail,
    };
    setAuditTrail(prev => [...prev, newEntry]);
  };

  // Log project creation on first mount
useEffect(() => {
  logAudit({
    domain: 'Project',
    action: `Project ${projectId} created and Project Setup initiated`,
    details: 'New clinical investigation protocol created for cardiovascular device study',
  });

  logAudit({
    domain: 'Project',
    action: 'Project metadata initialized',
    details: 'System generated project structure and workflow configuration',
  });

  logAudit({
    domain: 'Requirement',
    action: 'Regulatory framework requirements loaded',
    details: 'System initialized compliance requirements based on device classification',
  });

  isInitialMount.current = false;
}, []);
      

  // Track project data changes for audit trail
  useEffect(() => {
    if (isInitialMount.current) return;

    const prev = previousProjectDataRef.current;
    const curr = projectData;

    // Check each field for changes
    Object.keys(curr).forEach((key) => {
      const fieldKey = key as keyof ProjectData;
      const oldValue = prev[fieldKey];
      const newValue = curr[fieldKey];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        const fieldLabels: Record<keyof ProjectData, string> = {
          projectName: 'Project Name',
          sponsor: 'Sponsor',
          deviceName: 'Device Name',
          indication: 'Intended Medical Indication',
          targetMarkets: 'Target Markets',
          plannedStudyStart: 'Planned Study Start Date',
          targetSubmissionReadiness: 'Target Submission Readiness Date',
        };

        const formatValue = (val: any) => {
          if (Array.isArray(val)) return val.join(', ');
          if (val === '') return '(empty)';
          return String(val);
        };

        logAudit({
          domain: 'Requirement',
          action: `Updated ${fieldLabels[fieldKey]} in Project Identity section`,
          details: `Updated ${fieldLabels[fieldKey]} in Project Identity section`,
          newValue: formatValue(newValue),
        });
      }
    });

    previousProjectDataRef.current = curr;
  }, [projectData]);

  // Track role changes for audit trail
  useEffect(() => {
    if (isInitialMount.current) return;

    const prev = previousRolesRef.current;
    const curr = roles;

    curr.forEach((role, index) => {
      const prevRole = prev[index];
      
      // Check for role assignments/removals
      if (prevRole.assignedTo.length < role.assignedTo.length) {
        const newPerson = role.assignedTo[role.assignedTo.length - 1];
        if (newPerson.name && newPerson.email) {
          logAudit({
            domain: 'Role',
            action: `Assigned ${newPerson.name} to ${role.title} Role`,
            details: `Assigned ${newPerson.name} to ${role.title} Role`,
            newValue: `${newPerson.name} (${newPerson.email})`,
          });
        }
      } else if (prevRole.assignedTo.length > role.assignedTo.length) {
        // Find which person was removed
        const removedPerson = prevRole.assignedTo.find(
          p => !role.assignedTo.some(curr => curr.name === p.name && curr.email === p.email)
        );
        if (removedPerson && removedPerson.name) {
          logAudit({
            domain: 'Role',
            action: `Removed ${removedPerson.name} from ${role.title} Role`,
            details: `Removed ${removedPerson.name} from ${role.title} Role`,
            newValue: `${removedPerson.name} (${removedPerson.email})`,
          });
        }
      } else {
        // Check for changes in existing assignments
        role.assignedTo.forEach((person, personIndex) => {
          const prevPerson = prevRole.assignedTo[personIndex];
          if (prevPerson) {
            if (prevPerson.name !== person.name || prevPerson.email !== person.email) {
              if (person.name && person.email && prevPerson.name && prevPerson.email) {
                logAudit({
                  domain: 'Role',
                  action: `Updated ${role.title} assignment`,
                  details: `Updated ${role.title} assignment`,
                  newValue: `${person.name} (${person.email})`,
                });
              }
            }
          }
        });
      }
    });

    previousRolesRef.current = curr;
  }, [roles]);

  const handleExportAuditTrail = () => {
    console.log('Audit Trail Entries:', auditTrail); // Debug log
    
    const exportData = {
      projectId: projectId,
      exportDate: new Date().toISOString(),
      entries: auditTrail,
      totalEntries: auditTrail.length,
      metadata: {
        exported_by: currentUser,
        stage: 'PROJECT_SETUP',
        regulatory_purpose: 'Documentation for regulatory submission and compliance audit',
      },
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    const requirements: {
      frameworks: string[];
      documents: string[];
      standards: string[];
    } = {
      frameworks: [],
      documents: [],
      standards: []
    };

    if (projectData.targetMarkets.includes('EU')) {
      requirements.frameworks.push('EU MDR 2017/745 - Clinical Investigation');
      requirements.standards.push('ISO 14155:2020 - Clinical Investigation of Medical Devices');
    }
    
    if (projectData.targetMarkets.includes('US')) {
      requirements.frameworks.push('FDA IDE / 21 CFR 812 - Investigational Device Exemptions');
      requirements.standards.push('FDA Guidance - IDE Policies and Procedures');
    }

    if (projectData.targetMarkets.includes('UK')) {
      requirements.frameworks.push('UK MDR / MHRA - Clinical Investigations');
    }

    if (projectData.targetMarkets.includes('Canada')) {
      requirements.frameworks.push('Health Canada - Medical Devices Regulations (SOR/98-282)');
    }

    if (projectData.targetMarkets.includes('Australia')) {
      requirements.frameworks.push('TGA - Therapeutic Goods Regulations');
    }

    if (projectData.targetMarkets.includes('Japan')) {
      requirements.frameworks.push('PMDA - Pharmaceutical and Medical Device Act');
    }

    if (projectData.targetMarkets.includes('China')) {
      requirements.frameworks.push('NMPA - Medical Device Regulations');
    }

    // Common documents
    if (projectData.targetMarkets.length > 0) {
      requirements.documents.push(
        'Clinical Investigation Protocol',
        'Investigator\'s Brochure',
        'Informed Consent Form (ICF)',
        'Risk Management File (ISO 14971)',
        'Clinical Evaluation Report (CER)',
        'Statistical Analysis Plan (SAP)'
      );
      
      requirements.standards.push(
        'ISO 14971:2019 - Risk Management',
        'ISO 13485:2016 - Quality Management Systems'
      );
    }

    return requirements;
  };

  const getRegulatoryPathwaySummary = () => {
    const summaries: string[] = [];
    
    if (projectData.targetMarkets.includes('EU')) {
      summaries.push('EU: Clinical Investigation under MDR 2017/745');
    }
    if (projectData.targetMarkets.includes('US')) {
      summaries.push('US: FDA IDE / 21 CFR 812');
    }
    if (projectData.targetMarkets.includes('UK')) {
      summaries.push('UK: Clinical Investigation under UK MDR / MHRA');
    }
    if (projectData.targetMarkets.includes('Canada')) {
      summaries.push('Canada: Health Canada Medical Devices Regulations');
    }
    if (projectData.targetMarkets.includes('Australia')) {
      summaries.push('Australia: TGA Therapeutic Goods Act');
    }
    if (projectData.targetMarkets.includes('Japan')) {
      summaries.push('Japan: PMDA Medical Device Approval');
    }
    if (projectData.targetMarkets.includes('China')) {
      summaries.push('China: NMPA Medical Device Registration');
    }
    
    return summaries;
  };

  const removePersonFromRole = (roleIndex: number, personIndex: number) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      const updatedPeople = role.assignedTo.filter((_, idx) => idx !== personIndex);
      const hasValidAssignments = updatedPeople.some(p => p.name.trim() !== '' && p.email.trim() !== '');
      
      return {
        ...role,
        assignedTo: updatedPeople,
        status: hasValidAssignments ? 'assigned' : 'pending'
      };
    }));
  };

  // NEW: Quick assign from suggestion
  const handleQuickAssign = (roleIndex: number, person: { name: string; email: string }) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      return {
        ...role,
        assignedTo: [person],
        status: 'assigned'
      };
    }));
  };

  // NEW: Assign myself shortcut
  const handleAssignMyself = (roleIndex: number) => {
    const myselfInfo = PEOPLE_DIRECTORY.find(p => p.email === currentUserEmail);
    if (myselfInfo) {
      handleQuickAssign(roleIndex, { name: myselfInfo.name, email: myselfInfo.email });
    }
  };

  // NEW: Load team from previous project
  const handleLoadPreviousTeam = () => {
    setRoles(prev => prev.map((role) => {
      const previousPerson = PREVIOUS_PROJECT_TEAM[role.title as keyof typeof PREVIOUS_PROJECT_TEAM];
      if (previousPerson && !role.locked) {
        return {
          ...role,
          assignedTo: [previousPerson],
          status: 'assigned'
        };
      }
      return role;
    }));

    // Log in audit trail
    logAudit({
      domain: 'Role',
      action: 'Loaded team from previous project CIP-2023-045',
      details: 'Applied team assignments from CIP-2023-045 to all roles',
    });
  };

  // NEW: Updated role assignment with autocomplete support
  const handleRoleAssignmentWithAutocomplete = (
    roleIndex: number, 
    personIndex: number, 
    person: { name: string; email: string }
  ) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      const updatedPeople = [...role.assignedTo];
      updatedPeople[personIndex] = person;
      
      const hasValidAssignments = updatedPeople.some(p => p.name.trim() !== '' && p.email.trim() !== '');
      
      return {
        ...role,
        assignedTo: updatedPeople,
        status: hasValidAssignments ? 'assigned' : 'pending'
      };
    }));
  };

  // Original role assignment handler (for backward compatibility)
  const handleRoleAssignment = (
    roleIndex: number,
    personIndex: number,
    field: 'name' | 'email',
    value: string
  ) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      const updatedPeople = [...role.assignedTo];
      updatedPeople[personIndex] = {
        ...updatedPeople[personIndex],
        [field]: value
      };
      
      const hasValidAssignments = updatedPeople.some(p => p.name.trim() !== '' && p.email.trim() !== '');
      
      return {
        ...role,
        assignedTo: updatedPeople,
        status: hasValidAssignments ? 'assigned' : 'pending'
      };
    }));
  };

  // Add person to role
  const addPersonToRole = (roleIndex: number) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      return {
        ...role,
        assignedTo: [...role.assignedTo, { name: '', email: '' }]
      };
    }));
  };

  // Handlers for Table View
  const handleTableRoleUpdate = (roleIndex: number, person: { name: string; email: string }) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      const hasValidData = person.name.trim() !== '' && person.email.trim() !== '';
      
      return {
        ...role,
        assignedTo: hasValidData ? [person] : [],
        status: hasValidData ? 'assigned' : 'pending'
      };
    }));
  };

  const handleTableRoleRemove = (roleIndex: number) => {
    setRoles(prev => prev.map((role, i) => {
      if (i !== roleIndex) return role;
      
      return {
        ...role,
        assignedTo: [],
        status: 'pending'
      };
    }));
  };

  const identityComplete = 
    projectData.projectName.trim() !== '' &&
    projectData.sponsor.trim() !== '' &&
    projectData.deviceName.trim() !== '' &&
    projectData.targetMarkets.length > 0;

  const projectManagerAssigned = roles[0].status === 'assigned';
  const allRolesAssigned = roles.every(role => role.status === 'assigned');

  const workflowSteps = [
    { name: 'Setup', locked: false, active: true, section: 'PROJECT SETUP' },
    { name: 'Synopsis', locked: true, active: false, section: 'PROJECT SETUP' },
    { name: 'Scope & Intended Use', locked: true, active: false, section: 'PROJECT SETUP' },
  ];

  useEffect(() => {
    const identityComplete = 
      projectData.projectName.trim() !== '' &&
      projectData.sponsor.trim() !== '' &&
      projectData.deviceName.trim() !== '' &&
      projectData.targetMarkets.length > 0;

    const rolesComplete = roles.every(role => role.status === 'assigned');

    setIsSetupComplete(identityComplete && rolesComplete);
  }, [projectData, roles]);

  const handleCompleteSetup = async () => {
  logAudit({
    domain: 'Approval',
    action: 'Project Setup completed successfully',
    details: 'All requirements met. Unlocking Synopsis phase.',
  });

  try {
    await fetch(`${window.location.origin.replace('-5173.', '-3001.')}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 
  'Content-Type': 'application/json',
  ...(localStorage.getItem('clinical_system_token') ? { Authorization: `Bearer ${localStorage.getItem('clinical_system_token')}` } : {}),
},
      body: JSON.stringify({
        name: projectData.projectName,
        description: `Device: ${projectData.deviceName} | Sponsor: ${projectData.sponsor}`,
      }),
    });
  } catch (e) {
    console.error('Failed to save project', e);
  }

  navigate(`/projects/${projectId}/workflow/synopsis`);
};

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
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
                className={`
                  flex items-start gap-3 p-3 rounded-lg transition-colors
                  ${step.active 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'border border-transparent'
                  }
                  ${step.locked ? 'opacity-60' : ''}
                `}
              >
                <div className="mt-0.5">
                  {step.locked ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                  ) : step.active ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">1</span>
                    </div>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${step.active ? 'font-medium text-blue-900' : 'text-slate-700'}`}>
                    {step.name}
                  </div>
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header Bar with Breadcrumb and Audit Log */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Breadcrumb currentStep="project_setup" />
            
            {/* Audit Log Link */}
            <div
              onClick={() => setIsAuditTrailOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors group"
              title="View audit log"
              id="audit-log-trigger"
            >
              <History className="w-4 h-4 opacity-50 group-hover:opacity-70" />
              <span className="text-sm">Audit log</span>
            </div>
          </div>
        </div>

        {/* Project Header */}
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-8 pb-6 border-b border-slate-200">
            <div>
              <div className="text-sm text-slate-600 mb-2">Project ID</div>
              <div className="text-xl text-slate-900">{projectId}</div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Section 1: Project Identity */}
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Project Identity</h3>
              <p className="text-sm text-slate-600">Define the fundamental attributes of this clinical investigation.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  Project Name <span className="text-red-600">*</span>
                  <div 
                    className="relative"
                    onMouseEnter={() => setTooltipField('projectName')}
                    onMouseLeave={() => setTooltipField(null)}
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    {tooltipField === 'projectName' && (
                      <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                        <div className="text-slate-200">Internal project identifier used across all study documentation and approvals.</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  value={projectData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.projectName.trim()
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  Sponsor (Legal Entity) <span className="text-red-600">*</span>
                  <div 
                    className="relative"
                    onMouseEnter={() => setTooltipField('sponsor')}
                    onMouseLeave={() => setTooltipField(null)}
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    {tooltipField === 'sponsor' && (
                      <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                        <div className="text-slate-200">The legal entity that assumes regulatory and legal responsibility for the clinical investigation.</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  value={projectData.sponsor}
                  onChange={(e) => handleInputChange('sponsor', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.sponsor.trim()
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="Enter sponsor name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  Device Name <span className="text-red-600">*</span>
                  <div 
                    className="relative"
                    onMouseEnter={() => setTooltipField('deviceName')}
                    onMouseLeave={() => setTooltipField(null)}
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    {tooltipField === 'deviceName' && (
                      <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                        <div className="text-slate-200">Commercial or development name of the medical device under investigation.</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  value={projectData.deviceName}
                  onChange={(e) => handleInputChange('deviceName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.deviceName.trim()
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="e.g., CardioAssist LVAD System"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  Intended Medical Indication
                  <div 
                    className="relative"
                    onMouseEnter={() => setTooltipField('indication')}
                    onMouseLeave={() => setTooltipField(null)}
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    {tooltipField === 'indication' && (
                      <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                        <div className="text-slate-200">The medical condition or clinical purpose the device is intended for (e.g. severe aortic stenosis).</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  value={projectData.indication}
                  onChange={(e) => handleInputChange('indication', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.indication.trim()
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="e.g., advanced heart failure, chronic heart failure"
                />
                <p className="text-xs text-slate-500 mt-1">
                  In regulatory terms this corresponds to 'Indication for Use' (FDA) and 'Intended Purpose / Medical Indication' (EU MDR).
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  Target Markets <span className="text-red-600">*</span>
                  <div 
                    className="relative"
                    onMouseEnter={() => setTooltipField('targetMarkets')}
                    onMouseLeave={() => setTooltipField(null)}
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    {tooltipField === 'targetMarkets' && (
                      <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                        <div className="text-slate-200">Markets where the device is intended to be approved and commercialized. Selected markets determine applicable regulatory frameworks and requirements.</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['EU', 'US', 'UK', 'Canada', 'Australia', 'Japan', 'China'].map((market) => (
                    <button
                      key={market}
                      type="button"
                      onClick={() => handleMarketToggle(market)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                        projectData.targetMarkets.includes(market) 
                          ? 'bg-slate-100 border-slate-400 text-slate-900 font-medium' 
                          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {market === 'EU' && 'European Union (EU MDR)'}
                      {market === 'US' && 'United States (FDA)'}
                      {market === 'UK' && 'United Kingdom (UK MDR / MHRA)'}
                      {market === 'Canada' && 'Canada (Health Canada)'}
                      {market === 'Australia' && 'Australia (TGA)'}
                      {market === 'Japan' && 'Japan (PMDA)'}
                      {market === 'China' && 'China (NMPA)'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Selected markets automatically determine applicable regulatory frameworks, requirements, and standards.
                </p>
              </div>
            </div>

            {/* Market Profiles Section */}
            {projectData.targetMarkets.length > 0 && (
              <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-start gap-2 mb-4">
                  <Info className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Market Profiles & Auto-Detected Requirements</h4>
                    <p className="text-sm text-slate-700">
                      Requirements are auto-detected based on selected markets and device characteristics and can be refined by Regulatory Affairs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-medium text-slate-900 mb-2">Regulatory Frameworks</div>
                    <div className="space-y-1">
                      {getMarketRequirements().frameworks.map((framework, idx) => (
                        <div key={idx} className="text-xs text-slate-800 bg-white rounded px-2 py-1">
                          {framework}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-900 mb-2">Mandatory Documents</div>
                    <div className="space-y-1">
                      {getMarketRequirements().documents.slice(0, 6).map((doc, idx) => (
                        <div key={idx} className="text-xs text-slate-800 bg-white rounded px-2 py-1">
                          {doc}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-900 mb-2">Applicable Standards</div>
                    <div className="space-y-1">
                      {getMarketRequirements().standards.map((standard, idx) => (
                        <div key={idx} className="text-xs text-slate-800 bg-white rounded px-2 py-1">
                          {standard}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regulatory Pathway Summary */}
            {projectData.targetMarkets.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Regulatory Pathway Summary
                </label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  {getRegulatoryPathwaySummary().length > 0 ? (
                    <div className="space-y-2">
                      {getRegulatoryPathwaySummary().map((summary, idx) => (
                        <div key={idx} className="text-sm text-slate-700">
                          • {summary}
                        </div>
                      ))}
                      <button className="text-xs text-slate-600 hover:text-slate-700 mt-2 underline">
                        Edit details
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No markets selected</div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Roles & Responsibilities */}
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Roles & Responsibilities</h3>
              <p className="text-sm text-slate-600">All mandatory roles must be assigned to enable protocol development and unlock the Synopsis step.</p>
            </div>

            <div className="space-y-4">
              {roles.map((role, roleIndex) => (
                <div 
                  key={roleIndex}
                  className={`border rounded-lg p-4 ${
                    role.locked 
                      ? 'bg-slate-50 border-slate-200' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{role.title}</span>
                      {role.mandatory && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">Required</span>
                      )}
                      {role.locked && (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <div 
                        className="relative group"
                        onMouseEnter={() => setHoveredRole(roleIndex)}
                        onMouseLeave={() => setHoveredRole(null)}
                      >
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                        {hoveredRole === roleIndex && (
                          <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                            <div className="font-medium mb-1">Why this role is mandatory:</div>
                            <div className="text-slate-200">{role.description}</div>
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      {role.status === 'assigned' && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-blue-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {!role.locked && (
                    <div className="space-y-3">
                      {role.assignedTo.length === 0 && (
                        <button
                          type="button"
                          onClick={() => addPersonToRole(roleIndex)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Person to {role.title}
                        </button>
                      )}
                      
                      {role.assignedTo.map((person, personIndex) => (
                        <div key={personIndex} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                              <input
                                type="text"
                                value={person.name}
                                onChange={(e) => handleRoleAssignment(roleIndex, personIndex, 'name', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                                placeholder="Full name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                              <input
                                type="email"
                                value={person.email}
                                onChange={(e) => handleRoleAssignment(roleIndex, personIndex, 'email', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                                placeholder="email@example.com"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => removePersonFromRole(roleIndex, personIndex)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-700 hover:bg-slate-50 border border-slate-300 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {role.assignedTo.length > 0 && (
                        <button
                          type="button"
                          onClick={() => addPersonToRole(roleIndex)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Another Person
                        </button>
                      )}
                    </div>
                  )}
                  
                  {role.locked && (
                    <div className="text-sm text-slate-600">
                      {role.assignedTo.map((person, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-1">
                          <span className="font-medium">{person.name}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-500">{person.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Timeline Ownership */}
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Timeline Ownership</h3>
              <p className="text-sm text-slate-600">
                The Project Manager owns the timeline. Downstream milestones will be auto-generated based on this setup.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Planned Study Start Date
                </label>
                <input
                  type="date"
                  value={projectData.plannedStudyStart}
                  onChange={(e) => handleInputChange('plannedStudyStart', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.plannedStudyStart
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Submission Readiness Date
                </label>
                <input
                  type="date"
                  value={projectData.targetSubmissionReadiness}
                  onChange={(e) => handleInputChange('targetSubmissionReadiness', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    projectData.targetSubmissionReadiness
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Target date by which all required protocol documents, approvals, and system steps are completed and the study is ready for regulatory submission and commercialization activities.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Readiness & Dependencies */}
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Readiness & Dependencies</h3>
            </div>

            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                identityComplete 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                {identityComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400" />
                )}
                <span className={`font-medium ${identityComplete ? 'text-blue-900' : 'text-slate-700'}`}>
                  Project identity completed
                </span>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                projectManagerAssigned 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                {projectManagerAssigned ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400" />
                )}
                <span className={`font-medium ${projectManagerAssigned ? 'text-blue-900' : 'text-slate-700'}`}>
                  Project Manager assigned
                </span>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                allRolesAssigned 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                {allRolesAssigned ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400" />
                )}
                <span className={`font-medium ${allRolesAssigned ? 'text-blue-900' : 'text-slate-700'}`}>
                  All required roles assigned
                </span>
              </div>
            </div>

            <LockedStateContainer
              title="Synopsis is locked"
              message="Complete all requirements above to unlock the next phase of protocol development."
            />
          </section>

          {/* Primary Action */}
          <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Ready to proceed?</div>
              <div className="text-sm text-slate-600 mt-1">
                {isSetupComplete 
                  ? 'All requirements met.' 
                  : 'Complete all required fields and role assignments to proceed.'
                }
              </div>
            </div>
            <button
              disabled={!isSetupComplete}
              onClick={handleCompleteSetup}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isSetupComplete
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Complete Setup
            </button>
          </div>
        </div>
      </main>

      {/* Audit Trail Panel */}
      <AuditLog 
        entries={auditTrail} 
        onExport={handleExportAuditTrail} 
        isOpen={isAuditTrailOpen}
        onToggle={() => setIsAuditTrailOpen(!isAuditTrailOpen)}
      />
    </div>
  );
}