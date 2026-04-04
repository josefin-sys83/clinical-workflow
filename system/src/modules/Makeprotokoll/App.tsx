import React, { useState, useRef } from 'react';
import { Info, AlertCircle, CheckCircle2, Clock, MessageSquare, History, ChevronRight, ChevronDown, User, FileText, Lock, Check, Circle, CheckCircle } from 'lucide-react';
import { ProtocolSection } from './components/protocol-section';
import { ExportReadinessIndicator } from './components/export-readiness-indicator';
import { ReviewModeEntry } from './components/review-mode-entry';
import { ReviewModeIndicator } from './components/review-mode-indicator';
import { ReviewModeConfirmation } from './components/review-mode-confirmation';
import { IssueFilterControl } from './components/issue-filter-control';
import { WorkflowProgressIndicator } from './components/workflow-progress-indicator';
import { AuditLogPanel } from './components/audit-log-panel';

export default function App() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['1', '6']);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('1');
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewCycle, setReviewCycle] = useState<number>(0);
  const [showReviewConfirmation, setShowReviewConfirmation] = useState<boolean>(false);
  const [issueFilter, setIssueFilter] = useState<'my-issues' | 'all-issues'>('my-issues');
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  // Current user context
  const currentUser = 'Dr. Marcus Rivera';

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateToSection = (sectionId: string, subsection?: string) => {
    // Set as active section
    setActiveSection(sectionId);
    
    // Expand the section if collapsed
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }

    // Wait for DOM update, then scroll and highlight
    setTimeout(() => {
      const sectionElement = sectionRefs.current[sectionId];
      if (sectionElement) {
        // Scroll to section
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight the section
        setHighlightedSection(sectionId);
        
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedSection(null), 3000);
      }
    }, 100);
  };

  const protocolSections = [
    { 
      id: '1', 
      number: '1', 
      title: 'Protocol Overview', 
      status: 'complete', 
      owner: 'Dr. Sarah Chen', 
      updated: '2026-02-05 14:32', 
      comments: 3, 
      aiGenerated: false, 
      reviewStatus: null, 
      locked: true,
      reviewCycle: 3,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Principal Investigator',
      issues: [],
      requiredElements: [
        { id: 're1-1', name: 'Protocol title and version', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.2.2', verifiedBy: 'Dr. Helena Schmidt', verifiedDate: '2026-02-05' },
        { id: 're1-2', name: 'Sponsor identification and contact', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.2.2', verifiedBy: 'Dr. Helena Schmidt', verifiedDate: '2026-02-05' },
        { id: 're1-3', name: 'Principal investigator details', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.2.2', verifiedBy: 'Dr. Helena Schmidt', verifiedDate: '2026-02-05' },
        { id: 're1-4', name: 'Protocol signature page', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.2.2', verifiedBy: 'Dr. Helena Schmidt', verifiedDate: '2026-02-05' },
      ]
    },
    { 
      id: '2', 
      number: '2', 
      title: 'Study Rationale & Objectives', 
      status: 'complete', 
      owner: 'Dr. Sarah Chen', 
      updated: '2026-02-05 16:18', 
      comments: 7, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 2,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Principal Investigator',
      issues: [
        {
          id: 'i2-1',
          severity: 'warning',
          subsection: 'Primary Objective',
          description: 'Primary objective statement should explicitly reference the 12-month timepoint to align with Section 4.8 sample size calculation and endpoint timing in Section 4.6.',
          reference: 'ISO 14155:2020 § 6.4 - Objectives must be clearly measurable with defined timepoints',
          raisedBy: 'Dr. Thomas Weber (Reviewer)',
          raisedDate: '2026-02-06 10:30',
          status: 'open',
          dueDate: '7 days'
        }
      ],
      requiredElements: [
        { id: 're2-1', name: 'Clinical need and rationale', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.3', verifiedBy: 'Dr. Thomas Weber', verifiedDate: '2026-02-05' },
        { id: 're2-2', name: 'Primary objective with measurable endpoint', status: 'partial' as const, reference: 'ISO 14155:2020 § 6.4' },
        { id: 're2-3', name: 'Secondary objectives', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.4', verifiedBy: 'Dr. Thomas Weber', verifiedDate: '2026-02-05' },
        { id: 're2-4', name: 'Risk-benefit assessment', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.3', verifiedBy: 'Dr. Thomas Weber', verifiedDate: '2026-02-05' },
      ]
    },
    { 
      id: '3', 
      number: '3', 
      title: 'Device Description & Intended Clinical Use', 
      status: 'complete', 
      owner: 'Dr. Marcus Rivera', 
      updated: '2026-02-06 09:45', 
      comments: 2, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 2,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Medical Device Specialist',
      issues: [
        {
          id: 'i3-1',
          severity: 'warning',
          subsection: 'Clinical Context & User Environment',
          description: 'Device classification statement present but rationale for Class III determination under Rule 8 should be expanded. Include explicit reference to cardiac contact duration and implantable nature.',
          reference: 'EU MDR 2017/745 Annex VIII Rule 8 - Implantable devices in contact with the heart',
          raisedBy: 'System Validation',
          raisedDate: '2026-02-06 12:15',
          status: 'open',
          dueDate: '5 days'
        }
      ],
      requiredElements: [
        { id: 're3-1', name: 'Device name and manufacturer', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.5.2', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-06' },
        { id: 're3-2', name: 'Device classification per EU MDR', status: 'partial' as const, reference: 'EU MDR 2017/745 Article 51' },
        { id: 're3-3', name: 'Intended purpose and indications', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.5.2', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-06' },
        { id: 're3-4', name: 'Device specifications and variants', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.5.2', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-06' },
      ]
    },
    { 
      id: '4', 
      number: '4', 
      title: 'Study Design', 
      status: 'complete', 
      owner: 'Dr. Sarah Chen', 
      updated: '2026-02-06 11:20', 
      comments: 5, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 2,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Principal Investigator',
      issues: [],
      requiredElements: [
        { id: 're4-1', name: 'Study type and design', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.6.2', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-06' },
        { id: 're4-2', name: 'Study duration and timelines', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.6.2', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-06' },
        { id: 're4-3', name: 'Number of subjects and sites', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.6.2', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-06' },
        { id: 're4-4', name: 'Randomization and blinding (if applicable)', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.6.2', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-06' },
      ]
    },
    { 
      id: '5', 
      number: '5', 
      title: 'Subject Eligibility Criteria', 
      status: 'draft', 
      owner: 'Dr. Marcus Rivera', 
      updated: '2026-02-07 13:55', 
      comments: 12, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 1,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Medical Device Specialist',
      issues: [
        {
          id: 'i5-1',
          severity: 'blocker',
          subsection: 'Inclusion Criteria & Sample Size Alignment',
          description: 'Cross-section consistency check failed: Section 4.8 specifies N=120 target enrollment with 6-month enrollment period. Current inclusion criteria (age ≥65, severe AS, intermediate risk, anatomical constraints) may yield insufficient recruitment pool across 8 sites. Provide recruitment feasibility analysis or adjust criteria/timeline.',
          reference: 'Conflicts with Section 4.4 (Study Scope) and Section 4.8 (Sample Size). ISO 14155:2020 § 6.6 requires feasible eligibility criteria.',
          raisedBy: 'System Consistency Check',
          raisedDate: '2026-02-07 14:20',
          status: 'open',
          dueDate: '2 days'
        },
        {
          id: 'i5-2',
          severity: 'warning',
          subsection: 'Exclusion Criteria',
          description: 'Exclusion criterion "LVEF <30%" should be cross-referenced with device Instructions for Use (IFU). Verify this threshold matches IFU contraindications to ensure protocol-IFU consistency.',
          reference: 'EU MDR Article 62(4)(a) - Protocol must align with intended use and contraindications',
          raisedBy: 'Dr. Thomas Weber (Reviewer)',
          raisedDate: '2026-02-07 15:45',
          status: 'open',
          dueDate: '4 days'
        }
      ],
      requiredElements: [
        { id: 're5-1', name: 'Inclusion criteria', status: 'partial' as const, reference: 'ISO 14155:2020 § 6.6.3' },
        { id: 're5-2', name: 'Exclusion criteria', status: 'partial' as const, reference: 'ISO 14155:2020 § 6.6.3' },
        { id: 're5-3', name: 'Recruitment feasibility assessment', status: 'missing' as const, reference: 'ISO 14155:2020 § 6.6.3' },
        { id: 're5-4', name: 'Screening and enrollment procedures', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.6.3', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-07' },
      ]
    },
    { 
      id: '6', 
      number: '6', 
      title: 'Study Procedures & Assessments', 
      status: 'draft', 
      owner: 'Dr. Elena Kowalski', 
      updated: '2026-02-07 16:10', 
      comments: 8, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 1,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Clinical Operations Lead',
      issues: [
        {
          id: 'i6-1',
          severity: 'blocker',
          subsection: 'Assessment Timing & Endpoint Windows',
          description: 'Primary endpoint defined as "12 months" in Section 4.2, but assessment window not specified here. Define visit window (e.g., 12 months ±14 days) and specify how assessments outside window will be handled in statistical analysis.',
          reference: 'Conflicts with Section 4.2 (Objectives) and Section 4.8 (Statistical Considerations). ISO 14155:2020 § 6.8 requires clear assessment timing.',
          raisedBy: 'System Consistency Check',
          raisedDate: '2026-02-07 17:30',
          status: 'open',
          dueDate: '3 days'
        }
      ],
      requiredElements: [
        { id: 're6-1', name: 'Schedule of assessments (visit timeline)', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.8', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-07' },
        { id: 're6-2', name: 'Visit windows and tolerances', status: 'missing' as const, reference: 'ISO 14155:2020 § 6.8' },
        { id: 're6-3', name: 'Clinical assessments per visit', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.8', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-07' },
        { id: 're6-4', name: 'Laboratory and imaging procedures', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.8', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-07' },
      ]
    },
    { 
      id: '7', 
      number: '7', 
      title: 'Safety Monitoring & Reporting', 
      status: 'draft', 
      owner: 'Dr. Marcus Rivera', 
      updated: '2026-02-08 08:22', 
      comments: 4, 
      aiGenerated: false, 
      reviewStatus: null,
      reviewCycle: 1,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Medical Device Specialist',
      issues: [],
      requiredElements: [
        { id: 're7-1', name: 'Adverse event definitions (per ISO 14155)', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.9', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-08' },
        { id: 're7-2', name: 'Serious adverse event reporting timelines', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.9', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-08' },
        { id: 're7-3', name: 'Data Safety Monitoring Board (DSMB) charter', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.9', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-08' },
        { id: 're7-4', name: 'Stopping rules and criteria', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.9', verifiedBy: 'Dr. Marcus Rivera', verifiedDate: '2026-02-08' },
      ]
    },
    { 
      id: '8', 
      number: '8', 
      title: 'Statistical Considerations', 
      status: 'draft', 
      owner: 'Dr. Elena Kowalski', 
      updated: '2026-02-08 10:15', 
      comments: 0, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 1,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Clinical Operations Lead',
      issues: [],
      requiredElements: [
        { id: 're8-1', name: 'Sample size calculation with justification', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.10', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-08' },
        { id: 're8-2', name: 'Statistical analysis plan overview', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.10', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-08' },
        { id: 're8-3', name: 'Handling of missing data', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.10', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-08' },
        { id: 're8-4', name: 'Interim analysis plan (if applicable)', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.10', verifiedBy: 'Dr. Elena Kowalski', verifiedDate: '2026-02-08' },
      ]
    },
    { 
      id: '9', 
      number: '9', 
      title: 'Ethics & Regulatory Considerations', 
      status: 'draft', 
      owner: 'Dr. Sarah Chen', 
      updated: '2026-02-08 11:45', 
      comments: 2, 
      aiGenerated: true, 
      reviewStatus: null,
      reviewCycle: 1,
      reviewer: 'Dr. Thomas Weber',
      approver: 'Dr. Helena Schmidt',
      approverRole: 'VP Clinical Affairs',
      ownerRole: 'Principal Investigator',
      issues: [],
      requiredElements: [
        { id: 're9-1', name: 'Ethics committee approval plan', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.12', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-08' },
        { id: 're9-2', name: 'Informed consent process', status: 'complete' as const, reference: 'ISO 14155:2020 § 6.12', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-08' },
        { id: 're9-3', name: 'Data protection and confidentiality', status: 'complete' as const, reference: 'EU MDR Article 71 / GDPR', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-08' },
        { id: 're9-4', name: 'Regulatory authority notification strategy', status: 'complete' as const, reference: 'EU MDR Article 62', verifiedBy: 'Dr. Sarah Chen', verifiedDate: '2026-02-08' },
      ]
    },
  ];

  const issues = [
    { id: 'i1', type: 'blocker', section: '4.4, 4.5', title: 'Inconsistency: Sample size justification missing', description: 'Section 4.4 specifies N=120 but Section 4.5 inclusion criteria may yield insufficient recruitment pool' },
    { id: 'i2', type: 'warning', section: '4.2, 4.4', title: 'Objectives-design alignment Issue', description: 'Primary objective in Section 4.2 requires endpoint clarification in Section 4.4 study design' },
    { id: 'i3', type: 'warning', section: '4.3', title: 'Device classification requires clarification', description: 'Device description does not explicitly state EU MDR classification rationale' },
  ];

  // Helper function to get section status visualization
  const getSectionStatusIcon = (section: typeof protocolSections[0]) => {
    // Check if locked first
    if (section.locked) {
      return <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
    }

    // Check if complete - blue ring with checkmark
    if (section.status === 'complete') {
      return (
        <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0 bg-blue-500">
          <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      );
    }

    // Default: draft - yellow ring (empty)
    return (
      <div className="w-4 h-4 rounded-full border-2 border-yellow-500 flex-shrink-0" />
    );
  };

  // Review Mode handlers
  const handleEnterReview = () => {
    setShowReviewConfirmation(true);
  };

  const handleConfirmReview = () => {
    setIsReviewMode(true);
    setReviewCycle(prev => prev + 1);
    setShowReviewConfirmation(false);
    // Log audit event
    console.log(`Review Mode entered - Cycle ${reviewCycle + 1}`, new Date().toISOString());
  };

  const handleExitReview = () => {
    setIsReviewMode(false);
    // Log audit event
    console.log(`Review Mode exited - Cycle ${reviewCycle}`, new Date().toISOString());
  };

  // Calculate review readiness metrics
  const totalBlockers = protocolSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'blocker' && i.status === 'open').length || 0), 0
  );
  const totalWarnings = protocolSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'warning' && i.status === 'open').length || 0), 0
  );
  const allOpenIssuesCount = totalBlockers + totalWarnings;
  const allSectionsComplete = protocolSections.every(s => s.status === 'complete');
  const incompleteSections = protocolSections.filter(s => s.status !== 'complete').map(s => s.number);

  // Issue filtering logic
  const getFilteredSections = () => {
    if (issueFilter === 'all-issues') {
      return protocolSections;
    }
    
    // Filter to 'my-issues': sections where current user is owner OR has assigned issues
    return protocolSections.filter(section => {
      // User is section owner
      if (section.owner === currentUser) return true;
      
      // User has issues assigned in this section
      const hasAssignedIssue = section.issues?.some(issue => 
        issue.raisedBy?.includes(currentUser) || 
        section.owner === currentUser
      );
      
      return hasAssignedIssue;
    });
  };

  const filteredSections = getFilteredSections();
  
  // Calculate filtered issue counts
  const filteredBlockers = filteredSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'blocker' && i.status === 'open').length || 0), 0
  );
  const filteredIssues = filteredSections.reduce((count, section) => 
    count + (section.issues?.filter(i => i.severity === 'warning' && i.status === 'open').length || 0), 0
  );
  const myIssuesCount = filteredBlockers + filteredIssues;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Review Mode Indicator */}
      <ReviewModeIndicator 
        isReviewMode={isReviewMode}
        reviewCycle={reviewCycle}
        onExitReview={handleExitReview}
        openIssuesCount={allOpenIssuesCount}
        blockerCount={totalBlockers}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Protocol Structure */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
          <div className="pt-6 px-5 pb-5">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">PROTOCOL SECTIONS</h3>
          </div>
          
          <div className="px-5 pb-4 flex-1 space-y-1">
            {protocolSections.map((section) => {
              const isActive = activeSection === section.id;
              const isComplete = section.status === 'complete';
              return (
                <div
                  key={section.id}
                  onClick={() => navigateToSection(section.id)}
                  className={`py-2 px-3 cursor-pointer flex items-center gap-3 rounded transition-colors ${
                    isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  {isComplete ? (
                    <div className="w-4 h-4 flex-shrink-0 relative flex items-center justify-center">
                      <Circle 
                        className="w-4 h-4 text-blue-600 absolute" 
                        strokeWidth={2}
                      />
                      <Check 
                        className="w-2.5 h-2.5 text-blue-600 relative" 
                        strokeWidth={2.5}
                      />
                    </div>
                  ) : (
                    <Circle 
                      className="w-4 h-4 flex-shrink-0 text-orange-400" 
                      strokeWidth={2}
                    />
                  )}
                  <div className={`text-sm ${
                    isActive ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'
                  }`}>
                    {section.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workflow Progress Indicator */}
          <WorkflowProgressIndicator 
            currentStep="protocol-authoring" 
            onAuditLogClick={() => setShowAuditLog(true)}
          />

          <div className="flex-1 flex overflow-hidden">
            {/* Center Workspace */}
            <div className="flex-1 overflow-y-scroll p-6 protocol-workspace-scroll" style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#64748b #e2e8f0'
            }} ref={mainContentRef}>
              <style>{`
                .protocol-workspace-scroll::-webkit-scrollbar {
                  width: 16px;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-track {
                  background: #e2e8f0;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-thumb {
                  background: #14b8a6;
                  border-radius: 0px;
                  border: 3px solid #e2e8f0;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-thumb:hover {
                  background: #0d9488;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button {
                  background: #e2e8f0;
                  height: 16px;
                  display: block;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:vertical:decrement {
                  background: #cbd5e1 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23475569" d="M8 5l-4 4h8z"/></svg>') center no-repeat;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:vertical:increment {
                  background: #cbd5e1 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23475569" d="M8 11l4-4H4z"/></svg>') center no-repeat;
                }
                .protocol-workspace-scroll::-webkit-scrollbar-button:hover {
                  background-color: #94a3b8;
                }
              `}</style>
              <div className="max-w-4xl">
                {/* Project ID Header */}
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Clinical Investigation Protocol</div>
                  <div className="text-lg font-semibold text-slate-900">CIP-2024-MED-0847</div>
                  <div className="text-sm text-slate-600 mt-1">CARDIA-SUPPORT-2026 | Implantable Cardiac Support Device</div>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Protocol Sections</h2>
                  <p className="text-sm text-slate-600 mb-3">Review, edit, and approve each section according to your role and responsibilities</p>
                  
                  {/* AI Disclaimer */}
                  <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                    <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-blue-700">
                      This system continuously uses AI to analyze content for completeness, consistency, and regulatory alignment. 
                      All decisions, approvals, and final responsibility remain with assigned human roles.
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {protocolSections.map((section) => (
                    <ProtocolSection
                      key={section.id}
                      section={section}
                      isExpanded={expandedSections.includes(section.id)}
                      onToggle={() => toggleSection(section.id)}
                      ref={el => sectionRefs.current[section.id] = el}
                      isHighlighted={highlightedSection === section.id}
                      isReviewMode={isReviewMode}
                    />
                  ))}
                </div>
              </div>

              {/* Review Mode Entry - shown after sections on gray background when not in review mode */}
              {!isReviewMode && (
                <div className="mt-8 max-w-4xl">
                  <ReviewModeEntry
                    onEnterReview={handleEnterReview}
                    hasBlockers={totalBlockers > 0}
                    blockerCount={totalBlockers}
                    allSectionsComplete={allSectionsComplete}
                    userRole="Project Lead"
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Issues & Consistency */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
              {/* Fixed Header */}
              <div className="p-4 border-b border-slate-200 flex-shrink-0">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Issues & Consistency</h3>
                <p className="text-xs text-slate-500 mb-3">System-detected inconsistencies and review flags</p>
                
                {/* Issue Filter Control */}
                <IssueFilterControl
                  filter={issueFilter}
                  onFilterChange={setIssueFilter}
                  myIssuesCount={myIssuesCount}
                  allIssuesCount={allOpenIssuesCount}
                />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 issues-scroll">
                <div className="p-4 space-y-3">
                  {filteredSections.map((section) => {
                    if (!section.issues || section.issues.length === 0) return null;
                    
                    return section.issues.map((issue) => {
                      const isBlocker = issue.severity === 'blocker';
                      const isWarning = issue.severity === 'warning';
                      const bgColor = isBlocker ? 'bg-red-50' : 'bg-amber-50';
                      const borderColor = isBlocker ? 'border-red-200' : 'border-amber-200';
                      const hoverColor = isBlocker ? 'hover:bg-red-100' : 'hover:bg-amber-100';
                      const iconColor = isBlocker ? 'text-red-600' : 'text-amber-600';
                      const badgeBgColor = isBlocker ? 'bg-red-100' : 'bg-amber-100';
                      const badgeTextColor = isBlocker ? 'text-red-700' : 'text-amber-700';
                      const linkColor = isBlocker ? 'text-red-700' : 'text-amber-700';
                      const linkHoverColor = isBlocker ? 'hover:text-red-900' : 'hover:text-amber-900';
                      
                      return (
                        <div 
                          key={issue.id}
                          onClick={() => navigateToSection(section.id)}
                          className={`p-3 rounded border ${bgColor} ${borderColor} cursor-pointer ${hoverColor} transition-colors`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${badgeBgColor} ${badgeTextColor}`}>
                                  {isBlocker ? 'Blocker' : 'Warning'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-900 mb-1">{issue.subsection || 'Issue'}</div>
                              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                                {issue.description}
                              </p>
                              
                              <div className={`pt-2 border-t ${borderColor} space-y-1.5`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Affected section</span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigateToSection(section.id); }}
                                    className={`text-xs ${linkColor} ${linkHoverColor} hover:underline`}
                                  >
                                    {section.number}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Section owner</span>
                                  <span className="text-xs text-slate-700">{section.owner}</span>
                                </div>
                                {issue.dueDate && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Due in</span>
                                    <span className="text-xs text-slate-700 font-medium">{issue.dueDate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div 
                            onClick={(e) => { e.stopPropagation(); navigateToSection(section.id); }}
                            className={`text-xs ${linkColor} ${linkHoverColor} mt-2 flex items-center gap-1 font-medium cursor-pointer`}
                          >
                            <span>Navigate to Section {section.number}</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      );
                    });
                  })}
                  
                  {filteredSections.every(s => !s.issues || s.issues.length === 0) && (
                    <div className="p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-700 mb-1">No issues found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {issueFilter === 'my-issues' 
                          ? 'You have no open issues assigned to your sections.'
                          : 'All issues have been resolved.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-slate-200 flex-shrink-0">
                <ExportReadinessIndicator 
                  checks={[
                    {
                      category: 'All sections complete',
                      passed: false,
                      message: '7 of 9 sections approved',
                      details: 'Sections 4.4 and 4.6 require approval'
                    },
                    {
                      category: 'No open blockers',
                      passed: false,
                      message: '1 Blocker must be resolved',
                      details: 'Sample size feasibility Issue in Section 4.5'
                    },
                    {
                      category: 'Required elements covered',
                      passed: true,
                      message: 'All ISO 14155 elements present'
                    },
                    {
                      category: 'Cross-section consistency',
                      passed: false,
                      message: '2 consistency issues detected',
                      details: 'Objectives-design alignment and sample size justification'
                    },
                    {
                      category: 'Regulatory compliance',
                      passed: true,
                      message: 'EU MDR requirements met'
                    },
                    {
                      category: 'Audit trail complete',
                      passed: true,
                      message: 'All changes logged and traceable'
                    }
                  ]}
                  onExport={() => {
                    console.log('Export protocol document');
                    alert('Export functionality would generate a clean protocol document without AI markers, comments, or system metadata.');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Mode Confirmation Modal */}
      <ReviewModeConfirmation
        isOpen={showReviewConfirmation}
        onClose={() => setShowReviewConfirmation(false)}
        onConfirm={handleConfirmReview}
        blockerCount={totalBlockers}
        warningCount={totalWarnings}
        incompleteSections={incompleteSections}
      />

      {/* Audit Log Panel */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}