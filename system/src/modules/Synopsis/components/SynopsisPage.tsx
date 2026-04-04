import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertCircle, FileText, Users, Target, ClipboardCheck, Upload, Lock, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { WorkflowBreadcrumb } from './WorkflowBreadcrumb';
import { useNavigate } from 'react-router-dom';
import { AuditTrail, AuditEntry } from './AuditTrail';
import { LockedStateContainer } from './LockedStateContainer';

interface ReadinessItem {
  id: string;
  label: string;
  status: 'complete' | 'needs-review' | 'missing';
}

interface AIGap {
  id: string;
  message: string;
  section: string;
}

type SectionStatus = 'complete' | 'needs-review' | 'missing';

interface AISummary {
  studyRationale: string;
  targetPopulation: {
    indication: string;
    ageRange: string;
    inclusionCriteria: string;
    exclusionCriteria: string;
  };
  studyObjectives: {
    primaryObjective: string;
    secondaryObjectives: string;
    endpoints: string;
    duration: string;
  };
  feasibilityAssumptions: {
    siteRequirements: string;
    enrollmentRate: string;
    risks: string;
    mitigationStrategies: string;
  };
}

type SynopsisStatus = 'not-started' | 'in-progress' | 'completed';

interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'locked';
  description?: string;
  substeps?: WorkflowStep[];
}

export function SynopsisPage() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiReviewComplete, setAiReviewComplete] = useState(false);
  const [aiGaps, setAiGaps] = useState<AIGap[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [synopsisStatus, setSynopsisStatus] = useState<SynopsisStatus>('not-started');
  const [gate1Unlocked, setGate1Unlocked] = useState(false);
  const [protocolApproved, setProtocolApproved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [manuallyAdjusted, setManuallyAdjusted] = useState<Record<string, boolean>>({});
  const [editedContent, setEditedContent] = useState<Partial<AISummary>>({});
  
  const [readinessChecklist, setReadinessChecklist] = useState<ReadinessItem[]>([
    // 1️⃣ Grundläggande innehåll
    { id: '1', label: 'Synopsis document uploaded', status: 'missing' },
    { id: '2', label: 'Study rationale defined', status: 'missing' },
    { id: '3', label: 'Study objectives stated', status: 'missing' },
    { id: '4', label: 'Target population described', status: 'missing' },
    
    // 2️⃣ Studiedesign (hög nivå)
    { id: '5', label: 'Study design identified', status: 'missing' },
    { id: '6', label: 'Primary endpoint(s) defined', status: 'missing' },
    { id: '7', label: 'High-level methodology described', status: 'missing' },
    
    // 3️⃣ Scope & antaganden
    { id: '8', label: 'Study scope defined', status: 'missing' },
    { id: '9', label: 'Key assumptions documented', status: 'missing' },
    
    // 4️⃣ Regulatorisk kontext (översiktlig)
    { id: '10', label: 'Regulatory context stated', status: 'missing' },
    { id: '11', label: 'Intended use context aligned', status: 'missing' },
    
    // 5️⃣ Feasibility-signal (inte plan)
    { id: '12', label: 'High-level feasibility considerations present', status: 'missing' },
    { id: '13', label: 'No obvious feasibility blockers identified', status: 'missing' },
    
    // 6️⃣ Konsistens & spårbarhet
    { id: '14', label: 'Internal consistency verified', status: 'missing' },
    { id: '15', label: 'Key sections identifiable for downstream use', status: 'missing' }
  ]);

  // Phase 1: Study & Protocol Setup
  const phase1Steps: WorkflowStep[] = [
    { id: '1', label: 'Setup', status: 'completed' },
    { id: '2', label: 'Synopsis', status: 'active' },
    { id: '3', label: 'Scope & Intended Use', status: 'locked' }
  ];

  // Audit Trail Entries
  const auditEntries: AuditEntry[] = [
    {
      id: '1',
      timestamp: new Date('2026-02-18T08:14:00'),
      user: 'Dr. Sarah Johnson',
      action: 'Project Manager role assigned',
      category: 'role',
      details: 'Emma Wilson assigned as Project Manager',
      impact: 'high',
      newValue: 'Emma Wilson (emma.wilson@medtech.com)'
    },
    {
      id: '2',
      timestamp: new Date('2026-02-18T07:59:00'),
      user: 'Dr. Sarah Johnson',
      action: 'ISO 14155 requirement accepted',
      category: 'requirement',
      details: 'Clinical Investigation Compliance requirement accepted',
      impact: 'medium'
    },
    {
      id: '3',
      timestamp: new Date('2026-02-18T07:44:00'),
      user: 'Dr. Sarah Johnson',
      action: 'Device category confirmed',
      category: 'scope',
      details: 'Device category set to Implantable Device',
      impact: 'medium',
      newValue: 'Implantable Device'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setSynopsisStatus('in-progress');
      
      // Simulate AI review and extraction
      setTimeout(() => {
        setAiReviewComplete(true);
        
        // Generate AI summary
        const mockSummary: AISummary = {
          studyRationale: 'The proposed study addresses an unmet medical need in patients with moderate to severe chronic heart failure (CHF). Current standard treatments show limited efficacy in improving long-term outcomes and quality of life. Preclinical studies suggest that the investigational device, the CardioAssist implantable sensor, may provide early detection of fluid accumulation, enabling timely intervention and reducing hospitalization rates. This pilot study aims to assess the device safety and preliminary efficacy signals in a controlled population.',
          targetPopulation: {
            indication: 'Chronic Heart Failure (NYHA Class II-III)',
            ageRange: '40-75 years',
            inclusionCriteria: 'Diagnosed with chronic heart failure (NYHA Class II-III), Left ventricular ejection fraction ≤40%, On stable heart failure medication for ≥3 months, At least one hospitalization for heart failure in the past 12 months',
            exclusionCriteria: 'Active infection or recent cardiac surgery (<3 months), Known contraindication to device implantation, Severe renal impairment (eGFR <30 mL/min), Pregnancy or planned pregnancy during study period'
          },
          studyObjectives: {
            primaryObjective: 'To evaluate the safety and tolerability of the CardioAssist implantable sensor in patients with chronic heart failure over a 6-month period',
            secondaryObjectives: 'Assess device performance in detecting fluid accumulation events, Evaluate impact on heart failure-related hospitalizations compared to historical controls, Measure changes in quality of life using the Kansas City Cardiomyopathy Questionnaire (KCCQ)',
            endpoints: 'Primary: Incidence of device-related adverse events at 6 months. Secondary: Sensitivity and specificity of fluid detection, Number of heart failure hospitalizations, Change in KCCQ score from baseline',
            duration: '6 months active monitoring + 3 months safety follow-up'
          },
          feasibilityAssumptions: {
            siteRequirements: 'Sites must have cardiology department with interventional capabilities, 24/7 monitoring infrastructure, Experience with implantable device studies, Access to echo and device programming facilities',
            enrollmentRate: '2-3 patients per site per month across 5 sites (projected total N=60)',
            risks: 'Slow enrollment due to strict inclusion criteria, Device implantation complications, Patient compliance with remote monitoring requirements, Potential for early study termination if safety signals emerge',
            mitigationStrategies: 'Pre-qualify sites with documented patient populations meeting criteria, Implement comprehensive investigator training program on device implantation, Establish dedicated patient support hotline for monitoring compliance, Form independent Data Safety Monitoring Board (DSMB) for ongoing safety oversight'
          }
        };
        
        setAiSummary(mockSummary);
        
        // Update checklist items based on AI validation
        setReadinessChecklist(prev =>
          prev.map(item => ({
            ...item,
            status: 'complete'
          }))
        );
        
        setAiGaps([]);
      }, 2000);
    }
  };

  const handleEnableEditing = () => {
    setIsEditing(true);
  };

  const toggleChecklistItem = (id: string) => {
    setReadinessChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: item.status === 'complete' ? 'needs-review' : 'complete' } : item
      )
    );
  };

  const allChecked = readinessChecklist.every(item => item.status === 'complete');
  const completionPercentage = Math.round(
    (readinessChecklist.filter(item => item.status === 'complete').length / readinessChecklist.length) * 100
  );

  const getSectionStatus = (sectionId: string): SectionStatus => {
    const item = readinessChecklist.find(i => i.id === sectionId);
    return item?.status || 'missing';
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const isSectionExpanded = (sectionId: string): boolean => {
    const status = getSectionStatus(sectionId);
    // Auto-expand if needs review or missing
    if (status === 'needs-review' || status === 'missing') {
      return true;
    }
    // Otherwise check manual expansion state
    return expandedSections[sectionId] || false;
  };

  const startEditingSection = (sectionId: string) => {
    setEditingSections(prev => ({ ...prev, [sectionId]: true }));
    if (!expandedSections[sectionId]) {
      toggleSectionExpansion(sectionId);
    }
  };

  const cancelEditingSection = (sectionId: string) => {
    setEditingSections(prev => ({ ...prev, [sectionId]: false }));
  };

  const saveEditingSection = (sectionId: string) => {
    setEditingSections(prev => ({ ...prev, [sectionId]: false }));
    setManuallyAdjusted(prev => ({ ...prev, [sectionId]: true }));
  };

  const getDisplayContent = (field: string): any => {
    if (editedContent && field in editedContent) {
      return (editedContent as any)[field];
    }
    return aiSummary ? (aiSummary as any)[field] : '';
  };

  const updateEditedContent = (field: string, value: any) => {
    setEditedContent(prev => ({ ...prev, [field]: value }));
  };

  const StatusBadge = ({ status }: { status: SectionStatus }) => {
    if (status === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    }
    if (status === 'needs-review') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          Needs review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
        <Circle className="w-3 h-3" />
        Missing
      </span>
    );
  };

  const handleCompleteSynopsis = () => {
    if (allChecked) {
      setSynopsisStatus('completed');
      setGate1Unlocked(true);
      // Open Scope page in new tab
      window.open('https://www.figma.com/make/SloY1AFzt5PC60bzyLQhpS/Scope', '_blank');
    } else {
      alert('Please complete all readiness checklist items before proceeding.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar - Step Navigation */}
      <aside className="w-80 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Workflow Steps</h2>
          <nav className="space-y-4">
            {/* Phase 1: Study & Protocol Setup */}
            <div>
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project setup</span>
              </div>
              <div className="space-y-1">
                {phase1Steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 transition-colors ${
                      step.status === 'active'
                        ? 'bg-blue-50 border border-blue-200 rounded-lg p-3'
                        : step.status === 'completed'
                        ? 'px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50'
                        : 'px-3 py-2 rounded-md text-slate-400'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      )}
                      {step.status === 'active' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                          {index + 1}
                        </div>
                      )}
                      {step.status === 'locked' && (
                        <Lock className="w-5 h-5 text-slate-300" />
                      )}
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
        
        {/* System Information */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="text-xs text-slate-600">
            <div className="font-medium mb-1">System Information</div>
            <div>Version 2.4.1</div>
            <div>Last updated: Jan 24, 2026</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Breadcrumb */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <WorkflowBreadcrumb currentStep="project-setup" />
              <AuditTrail entries={auditEntries} pageTitle="Synopsis" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="space-y-6">
              {/* Contextual Warning Banner - shown when content is missing */}
              {aiReviewComplete && readinessChecklist.some(item => item.status !== 'complete') && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        Some required elements are missing or unclear. Please review the highlighted sections before completing the Synopsis.
                      </p>
                      <ul className="text-xs text-amber-800 space-y-1">
                        {readinessChecklist
                          .filter(item => item.status !== 'complete')
                          .map(item => (
                            <li key={item.id}>• {item.label}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Synopsis Document Section */}
              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Synopsis Document</h2>
                
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Upload Synopsis Document
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      PDF or DOCX format • Max 10 MB
                    </p>
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      {!aiReviewComplete && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span className="text-xs font-medium">Validating...</span>
                        </div>
                      )}
                      {aiReviewComplete && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Readiness & Dependencies - Always visible as separate section */}
              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Readiness & Dependencies</h3>
                
                <div className="space-y-3 mb-4">
                  {readinessChecklist.slice(0, -1).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <div className="flex-shrink-0">
                        {item.status === 'complete' ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {item.label}
                      </span>
                    </div>
                  ))}
                  
                  {/* Locked Synopsis item */}
                  <div className="flex items-start gap-3 p-3 rounded-md border border-slate-200 bg-slate-50">
                    <Lock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Synopsis is locked</p>
                      <p className="text-xs text-slate-500">
                        Complete all requirements above to unlock the next phase of protocol development.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ready to proceed section */}
              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-1">Ready to proceed?</h4>
                    <p className="text-sm text-slate-500">
                      Complete all required fields and role assignments to proceed.
                    </p>
                  </div>
                  <button
                    onClick={handleCompleteSynopsis}
                    disabled={!allChecked}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ml-4 ${
                      allChecked
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Complete Synopsis
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}