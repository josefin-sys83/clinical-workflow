import { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { ReportSection, DataAsset, UploadedFile, User, AuditLogEntry, ProtocolDeviation, ProtocolAmendment, ReportCompletenessStatus } from '../types';
import { ReportNavigation } from '../components/ReportNavigation';
import { ReportContent } from '../components/ReportContent';
import { RightSidebar } from '../components/RightSidebar';
import { WorkflowProgressIndicator } from '../components/WorkflowProgressIndicator';
import { AuditLogModal } from '../components/AuditLogModal';
import { DeviationsModal } from '../components/DeviationsModal';
import { ProtocolAmendmentModal } from '../components/ProtocolAmendmentModal';
import { ProtocolAmendmentsList } from '../components/ProtocolAmendmentsList';
import { initialReportSections, mockDataAssets, mockProtocolSections, mockUploadedFiles, mockUsers, mockAuditLog, mockCompletenessStatus } from '../data/mockData';
import { generateSectionDraft } from '../services/aiService';
import { validateReportContent } from '../services/validationService';
import { generateAssetNarrative } from '../services/narrativeService';
import { InsertedAsset } from '../types';
import { Clock } from 'lucide-react';

// Helper function to create audit log entries
function createAuditEntry(
  domain: AuditLogEntry['domain'],
  action: string,
  user: User | 'System',
  details?: string,
  newValue?: string
): AuditLogEntry {
  const now = new Date();
  const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  return {
    id: `audit-${Date.now()}-${Math.random()}`,
    domain,
    timestamp,
    action,
    userBy: user === 'System' ? 'System' : user.name,
    userEmail: user === 'System' ? 'system@medtech.com' : user.email,
    details,
    newValue,
  };
}

export function ReportWorkspace() {
  const [sections, setSections] = useState<ReportSection[]>(initialReportSections);
  const [dataAssets, setDataAssets] = useState<DataAsset[]>(mockDataAssets);
  const [uploadedFiles] = useState<UploadedFile[]>(mockUploadedFiles);
  const [currentSection, setCurrentSection] = useState<string>(sections[0].id);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(mockAuditLog);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showDeviations, setShowDeviations] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [showAmendmentsList, setShowAmendmentsList] = useState(false);
  const [amendments, setAmendments] = useState<ProtocolAmendment[]>([]);
  const [completenessStatus, setCompletenessStatus] = useState<ReportCompletenessStatus>(mockCompletenessStatus);

  // Mock protocol deviations
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([
    {
      id: 'dev-1',
      deviationType: 'major',
      protocolSection: 'Section 6.2 - Follow-up Schedule',
      protocolRequirement: '6-month follow-up visit required for all subjects',
      actualImplementation: '4-month follow-up conducted due to site availability constraints',
      rationale: 'Primary endpoint data collection completed at 3 months. Extended follow-up period reduced to 4 months to accommodate site scheduling constraints while maintaining data integrity.',
      impactAssessment: 'No impact on primary endpoint analysis. Secondary safety endpoints unaffected as critical safety data collected within first 90 days per protocol. Statistical power maintained at 95% confidence level.',
      reportedBy: mockUsers[0],
      reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending-review',
    },
    {
      id: 'dev-2',
      deviationType: 'minor',
      protocolSection: 'Section 7.4 - Blood Sample Volume',
      protocolRequirement: '10ml blood sample per visit',
      actualImplementation: '8ml blood sample collected in 3 cases',
      rationale: 'Subjects with difficult venous access. Reduced volume deemed sufficient for all planned assays per laboratory protocol.',
      impactAssessment: 'Minimal impact. All required biomarker assays successfully performed. No effect on study conclusions or statistical analysis.',
      reportedBy: mockUsers[1],
      reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedBy: mockUsers[2],
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
  ]);

  // Simulate current user - in real app this would come from auth context
  const currentUser: User = mockUsers[0];

  // Auto-generate AI draft when section is opened for the first time
  useEffect(() => {
    const section = sections.find(s => s.id === currentSection);
    if (section && !section.aiDraftGenerated && !section.content && !section.userEdited) {
      // Generate AI draft
      const draft = generateSectionDraft(
        section,
        mockProtocolSections,
        dataAssets,
        uploadedFiles,
        sections
      );

      if (draft) {
        setSections(sections.map(s => 
          s.id === currentSection 
            ? { ...s, aiDraft: draft, aiDraftGenerated: true }
            : s
        ));

        // Add to audit log
        const newEntry: AuditLogEntry = createAuditEntry(
          'Content',
          'AI-Assisted Draft Generated',
          'System',
          `AI generated draft content for ${section.title}`
        );
        setAuditLog([...auditLog, newEntry]);
      }
    }
  }, [currentSection, sections, dataAssets, uploadedFiles, auditLog]);

  const handleSectionUpdate = (sectionId: string, content: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Update content
    const updatedSection = { ...section, content, userEdited: true, aiDraft: undefined };

    // Run validation
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, content, userEdited: true, aiDraft: undefined, validationFindings }
        : s
    ));
    
    // Add to audit log
    const hadAiDraft = section?.aiDraft;
    
    const newEntry: AuditLogEntry = createAuditEntry(
      'Content',
      hadAiDraft ? 'Content Added with AI Assistance' : 'Content Edited',
      currentUser,
      hadAiDraft 
        ? `Content added by ${currentUser.name} with AI assistance`
        : 'Updated section content'
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleAcceptAIDraft = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.aiDraft) {
      setSections(sections.map(s => 
        s.id === sectionId 
          ? { ...s, content: s.aiDraft || '', aiDraft: undefined, userEdited: true }
          : s
      ));

      // Add to audit log
      const newEntry: AuditLogEntry = createAuditEntry(
        'Content',
        'AI Draft Accepted',
        currentUser,
        `Content accepted by ${currentUser.name} with AI assistance`
      );
      setAuditLog([...auditLog, newEntry]);
    }
  };

  const handleDismissAIDraft = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, aiDraft: undefined } : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'Content',
      'AI Draft Dismissed',
      currentUser,
      `AI draft dismissed by ${currentUser.name}`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleAssetToggle = (assetId: string) => {
    setDataAssets(dataAssets.map(asset => 
      asset.id === assetId ? { ...asset, selected: !asset.selected } : asset
    ));
    
    // Add to audit log
    const asset = dataAssets.find(a => a.id === assetId);
    if (asset) {
      const newEntry: AuditLogEntry = createAuditEntry(
        'Content',
        asset.selected ? 'Asset Removed' : 'Asset Added',
        currentUser,
        `${asset.selected ? 'Removed' : 'Added'} ${asset.name}`
      );
      setAuditLog([...auditLog, newEntry]);
    }
  };

  const handleAddComment = (sectionId: string, text: string, commentType?: 'general' | 'issue' | 'approval-request', regarding?: string) => {
    const newComment: SectionComment = {
      id: `comment-${Date.now()}`,
      sectionId,
      author: currentUser,
      text,
      timestamp: new Date().toISOString(),
      resolved: false,
      commentType: commentType || 'general',
      regarding,
    };
    
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, comments: [...s.comments, newComment] } : s
    ));
    
    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'Review',
      'Comment Added',
      currentUser,
      text
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleInsertAsset = (sectionId: string, assetId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const asset = dataAssets.find(a => a.id === assetId);
    
    if (!section || !asset) return;

    // Generate AI narrative suggestion
    const aiNarrative = generateAssetNarrative(asset, section);

    // Create inserted asset
    const insertedAsset: InsertedAsset = {
      id: `inserted-${Date.now()}`,
      assetId,
      insertedAt: new Date().toISOString(),
      insertedBy: currentUser,
      order: section.insertedAssets.length,
      narrativeText: '',
      aiNarrativeSuggestion: aiNarrative,
      narrativeAccepted: false,
    };

    // Add to section
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, insertedAssets: [...s.insertedAssets, insertedAsset] }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'Content',
      'Data Asset Inserted',
      currentUser,
      `Inserted ${asset.name} into ${section.title}`
    );
    setAuditLog([...auditLog, newEntry]);

    // Run validation after insertion
    const updatedSection = { 
      ...section, 
      insertedAssets: [...section.insertedAssets, insertedAsset] 
    };
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, validationFindings }
        : s
    ));
  };

  const handleRemoveAsset = (sectionId: string, insertedAssetId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const insertedAsset = section?.insertedAssets.find(a => a.id === insertedAssetId);
    const asset = dataAssets.find(a => a.id === insertedAsset?.assetId);
    
    if (!section || !insertedAsset || !asset) return;

    // Remove from section
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, insertedAssets: s.insertedAssets.filter(a => a.id !== insertedAssetId) }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Data Asset Removed',
      currentUser,
      `Removed ${asset.name} from ${section.title}`
    );
    setAuditLog([...auditLog, newEntry]);

    // Run validation after removal
    const updatedSection = {
      ...section,
      insertedAssets: section.insertedAssets.filter(a => a.id !== insertedAssetId)
    };
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, validationFindings }
        : s
    ));
  };

  const handleAcceptNarrative = (sectionId: string, insertedAssetId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            insertedAssets: s.insertedAssets.map(a =>
              a.id === insertedAssetId
                ? { ...a, narrativeText: a.aiNarrativeSuggestion || '', narrativeAccepted: true, aiNarrativeSuggestion: undefined }
                : a
            )
          }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'AI Narrative Accepted',
      currentUser,
      `Accepted AI-generated narrative for inserted asset`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleEditNarrative = (sectionId: string, insertedAssetId: string, text: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            insertedAssets: s.insertedAssets.map(a =>
              a.id === insertedAssetId
                ? { ...a, narrativeText: text, narrativeAccepted: true, aiNarrativeSuggestion: undefined }
                : a
            )
          }
        : s
    ));

    // Add to audit log (only once when user finishes editing)
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Asset Narrative Edited',
      currentUser,
      `Edited narrative text for inserted asset`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const getSectionStatus = (section: ReportSection): 'complete' | 'in-progress' | 'empty' => {
    // A section is complete only if it has been approved
    if (section.state === 'approved' || section.state === 'locked') {
      return 'complete';
    }
    
    // Check if section has content
    const hasContent = section.content && section.content.trim().length > 0;
    const hasInsertedAssets = section.insertedAssets && section.insertedAssets.length > 0;
    
    // Section is in-progress if it has some content or assets but not approved
    if (hasContent || hasInsertedAssets) {
      return 'in-progress';
    }
    
    return 'empty';
  };

  // Calculate overall status
  const completeSections = sections.filter(s => getSectionStatus(s) === 'complete').length;
  const totalSections = sections.length;
  const allSectionsComplete = completeSections === totalSections;

  // Check for unresolved blockers
  const hasUnresolvedBlockers = sections.some(section =>
    section.validationFindings?.some(f => f.type === 'blocker' && !f.resolved)
  );

  // Check for pending deviations
  const hasPendingDeviations = deviations.some(d => d.status === 'pending-review');

  // Check for unapproved sections
  const hasUnapprovedSections = sections.some(section =>
    section.state !== 'approved' && section.state !== 'locked'
  );

  // Assembly blockers list
  const assemblyBlockers: string[] = [];
  if (!allSectionsComplete) assemblyBlockers.push(`${completeSections}/${totalSections} sections complete`);
  if (hasUnresolvedBlockers) assemblyBlockers.push('Regulatory blockers');
  if (hasPendingDeviations) assemblyBlockers.push('Pending deviation reviews');
  if (hasUnapprovedSections) assemblyBlockers.push('Sections pending approval');

  // "Assemble Final Report" is disabled unless:
  // - Protocol is Approved & Locked (already true in this workspace)
  // - All report sections are Complete
  // - All sections are Approved
  // - No blockers remain
  // - All deviations are reviewed and approved
  const canAssembleReport = allSectionsComplete && !hasUnresolvedBlockers && !hasPendingDeviations && !hasUnapprovedSections;
  const hasIssues = !allSectionsComplete || hasUnresolvedBlockers || hasPendingDeviations;

  const handleApproveSection = (sectionId: string, approvalId: string, comment?: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            approvals: s.approvals.map(a =>
              a.id === approvalId
                ? { ...a, status: 'approved' as const, comment, timestamp: new Date().toISOString() }
                : a
            ),
          }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Section Approved',
      currentUser,
      comment || 'Section approved'
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleRejectSection = (sectionId: string, approvalId: string, comment: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            approvals: s.approvals.map(a =>
              a.id === approvalId
                ? { ...a, status: 'rejected' as const, comment, timestamp: new Date().toISOString() }
                : a
            ),
            state: 'draft' as const, // Reset to draft when rejected
          }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Section Rejected',
      currentUser,
      comment
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleReviewDeviation = (deviationId: string, status: 'approved' | 'requires-amendment', comment: string) => {
    setDeviations(deviations.map(d =>
      d.id === deviationId
        ? { ...d, status, reviewedBy: currentUser, reviewedAt: new Date().toISOString() }
        : d
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'protocol',
      status === 'approved' ? 'Deviation Approved' : 'Deviation Amendment Requested',
      currentUser,
      comment
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleMarkSectionReady = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Change status from draft to under-review
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'under-review' as const }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Section Marked Ready',
      currentUser,
      `Section "${section.title}" marked as ready for review`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleMoveSectionToDraft = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Change status from under-review back to draft
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'draft' as const }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Section Moved to Draft',
      currentUser,
      `Section "${section.title}" moved back to draft for edits`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleEditSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Only Content Owners can edit
    if (!section.roles.contentOwner.some(u => u.id === currentUser.id)) {
      return;
    }

    // Change status to draft (unlocks the section for editing)
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'draft' as const }
        : s
    ));

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'report',
      'Section Unlocked for Editing',
      currentUser,
      `Section "${section.title}" unlocked and moved to draft state for editing`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleCreateAmendment = (amendment: Omit<ProtocolAmendment, 'id' | 'createdAt' | 'createdBy'>) => {
    const newAmendment: ProtocolAmendment = {
      ...amendment,
      id: `amendment-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    };

    setAmendments([...amendments, newAmendment]);

    // Add to audit log
    const newEntry: AuditLogEntry = createAuditEntry(
      'protocol',
      'Protocol Amendment Created',
      currentUser,
      `Created ${amendment.amendmentNumber}: ${amendment.protocolSection}`
    );
    setAuditLog([...auditLog, newEntry]);
  };

  const handleVerifyCompletenessElement = (elementId: string) => {
    setCompletenessStatus({
      ...completenessStatus,
      elements: completenessStatus.elements.map(el =>
        el.id === elementId
          ? {
              ...el,
              status: 'verified' as const,
              verifiedBy: currentUser,
              verificationDate: new Date().toISOString(),
            }
          : el
      ),
    });

    // Add to audit log
    const element = completenessStatus.elements.find(el => el.id === elementId);
    if (element) {
      const newEntry: AuditLogEntry = createAuditEntry(
        'report',
        'Completeness Element Verified',
        currentUser,
        `Verified ISO 14155:2020 requirement: ${element.title}`
      );
      setAuditLog([...auditLog, newEntry]);
    }
  };

  const WORKFLOW_STEPS = [
    { id: 'project-setup', label: 'Project setup' },
    { id: 'protocol-authoring', label: 'Protocol authoring' },
    { id: 'protocol-review', label: 'Protocol review' },
    { id: 'protocol-approval', label: 'Protocol approval' },
    { id: 'report-authoring', label: 'Report authoring' },
    { id: 'report-review', label: 'Report review' },
    { id: 'report-approval', label: 'Report approval' },
  ];

  return (
    <div className="h-screen flex bg-white">
      {/* Left: Section Navigation - Full Height */}
      <ReportNavigation
        sections={sections}
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        getSectionStatus={getSectionStatus}
      />

      {/* Right: Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Workflow Progress Indicator - Positioned absolutely to center across entire page */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="relative bg-white border-b border-slate-200 px-6 py-3 flex items-center pointer-events-auto">
            {/* Workflow Steps - Centered to entire page width */}
            <div 
              className="flex items-center gap-2"
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(calc(-50% - 140px))', // Offset to account for left sidebar (~280px / 2)
              }}
            >
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = step.id === 'report-authoring';
                const isLast = index === WORKFLOW_STEPS.length - 1;

                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <span
                      className={`transition-all whitespace-nowrap ${
                        isActive
                          ? 'text-slate-500 font-medium'
                          : 'text-slate-500'
                      }`}
                      style={{
                        fontSize: isActive ? '17px' : '13px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {step.label}
                    </span>
                    {!isLast && (
                      <span className="text-slate-400" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '13px' }}>
                        ›
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area - Two Columns with padding for fixed header */}
        <div className="flex-1 flex overflow-hidden" style={{ marginTop: '57px' }}>{/* Center: Document Content */}
          <ReportContent
            sections={sections}
            currentSection={currentSection}
            onSectionUpdate={handleSectionUpdate}
            dataAssets={dataAssets}
            onAssetToggle={handleAssetToggle}
            currentUser={currentUser}
            onAddComment={handleAddComment}
            onAcceptAIDraft={handleAcceptAIDraft}
            onDismissAIDraft={handleDismissAIDraft}
            onInsertAsset={handleInsertAsset}
            onRemoveAsset={handleRemoveAsset}
            onAcceptNarrative={handleAcceptNarrative}
            onEditNarrative={handleEditNarrative}
            auditLog={auditLog}
            onResolveComment={(sectionId, commentId) => {
              setSections(sections.map(s =>
                s.id === sectionId
                  ? {
                      ...s,
                      comments: s.comments.map(c =>
                        c.id === commentId ? { ...c, resolved: true } : c
                      )
                    }
                  : s
              ));
              
              // Add to audit log
              const newEntry: AuditLogEntry = createAuditEntry(
                'report',
                'Comment Resolved',
                currentUser,
                `Comment marked as resolved`
              );
              setAuditLog([...auditLog, newEntry]);
            }}
            onApproveSection={handleApproveSection}
            onRejectSection={handleRejectSection}
            onMarkSectionReady={handleMarkSectionReady}
            onMoveSectionToDraft={handleMoveSectionToDraft}
            onEditSection={handleEditSection}
            canAssembleReport={canAssembleReport}
            assemblyBlockers={assemblyBlockers}
            completenessStatus={completenessStatus}
            onVerifyCompletenessElement={handleVerifyCompletenessElement}
          />

          {/* Right: Stacked Panels - Quality System + Data Assets */}
          <RightSidebar
            currentSection={currentSection}
            sections={sections}
            onNavigateToSection={setCurrentSection}
            currentUser={currentUser}
            onVerifyElement={handleVerifyCompletenessElement}
            dataAssets={dataAssets}
            uploadedFiles={uploadedFiles}
          />
        </div>
      </div>
    </div>
  );
}