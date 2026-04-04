import React, { useState, useRef, useEffect } from 'react';
import { ReportSection, DataAsset, User, ReportCompletenessStatus } from '../types';
import { AlertCircle, Table2, BarChart3, FileSpreadsheet, ChevronDown, UserIcon, MessageSquare, Clock, Check, X, Plus, Info, CheckCircle } from 'lucide-react';
import { SectionCompletenessStatus } from './SectionCompletenessStatus';
import { SectionGuidancePanel } from './SectionGuidancePanel';
import { TextWithInlineMarkers } from './TextWithInlineMarkers';
import { AssetSelectorModal } from './AssetSelectorModal';
import { AuditTrailModal } from './AuditTrailModal';
import { CommentsPanel } from './CommentsPanel';
import { SectionApprovalsModal } from './SectionApprovalsModal';
import { AppendicesSection } from './AppendicesSection';
import { EnterReviewModeModal } from './EnterReviewModeModal';
import aiDraftBanner from '../assets/ai-draft-banner.png';

interface ReportContentProps {
  sections: ReportSection[];
  currentSection: string;
  onSectionUpdate: (sectionId: string, content: string) => void;
  dataAssets: DataAsset[];
  onAssetToggle: (assetId: string) => void;
  currentUser: User;
  onAddComment: (sectionId: string, text: string, commentType?: 'general' | 'issue' | 'approval-request', regarding?: string) => void;
  onAcceptAIDraft: (sectionId: string) => void;
  onDismissAIDraft: (sectionId: string) => void;
  onInsertAsset: (sectionId: string, assetId: string) => void;
  onRemoveAsset: (sectionId: string, insertedAssetId: string) => void;
  onAcceptNarrative: (sectionId: string, insertedAssetId: string) => void;
  onEditNarrative: (sectionId: string, insertedAssetId: string, text: string) => void;
  auditLog: any[];
  onResolveComment: (sectionId: string, commentId: string) => void;
  onApproveSection: (sectionId: string, approvalId: string, comment?: string) => void;
  onRejectSection: (sectionId: string, approvalId: string, comment: string) => void;
  onMarkSectionReady: (sectionId: string) => void;
  onMoveSectionToDraft: (sectionId: string) => void;
  onEditSection: (sectionId: string) => void;
  canAssembleReport: boolean;
  assemblyBlockers: string[];
  completenessStatus: ReportCompletenessStatus;
  onVerifyCompletenessElement: (elementId: string) => void;
}

export function ReportContent({
  sections,
  currentSection,
  onSectionUpdate,
  dataAssets,
  onAssetToggle,
  currentUser,
  onAddComment,
  onAcceptAIDraft,
  onDismissAIDraft,
  onInsertAsset,
  onRemoveAsset,
  onAcceptNarrative,
  onEditNarrative,
  auditLog,
  onResolveComment,
  onApproveSection,
  onRejectSection,
  onMarkSectionReady,
  onMoveSectionToDraft,
  onEditSection,
  canAssembleReport,
  assemblyBlockers,
  completenessStatus,
  onVerifyCompletenessElement,
}: ReportContentProps) {
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [commentingSection, setCommentingSection] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [selectedSectionForAsset, setSelectedSectionForAsset] = useState<string | null>(null);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [selectedSectionForAudit, setSelectedSectionForAudit] = useState<string | null>(null);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [selectedSectionForComments, setSelectedSectionForComments] = useState<string | null>(null);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [selectedSectionForApprovals, setSelectedSectionForApprovals] = useState<string | null>(null);
  const [reviewModeModalOpen, setReviewModeModalOpen] = useState(false);

  useEffect(() => {
    const currentRef = sectionRefs.current[currentSection];
    if (currentRef) {
      const container = currentRef.closest('.overflow-y-auto');
      if (container) {
        container.scrollTo({ 
          top: container.scrollTop + currentRef.getBoundingClientRect().top - 80, 
          behavior: 'smooth' 
        });
      }
    }
  }, [currentSection]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table2 className="w-3.5 h-3.5" />;
      case 'graph':
        return <BarChart3 className="w-3.5 h-3.5" />;
      default:
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
    }
  };

  const isContentOwner = (section: ReportSection) => {
    return section.roles.contentOwner.some(u => u.id === currentUser.id);
  };

  const isReviewer = (section: ReportSection) => {
    return section.roles.reviewer.some(u => u.id === currentUser.id);
  };

  const isApprover = (section: ReportSection) => {
    return section.roles.requiredApprover.some(u => u.id === currentUser.id);
  };

  const canEdit = (section: ReportSection) => {
    return isContentOwner(section) && (section.state === 'draft' || section.state === 'under-review');
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'draft':
        return { label: 'Draft', color: '#9CA3AF' };
      case 'under-review':
        return { label: 'Draft', color: '#9CA3AF' };
      case 'approved':
        return { label: 'Approved', color: '#2563EB' };
      case 'locked':
        return { label: 'Locked', color: '#6B7280' };
      default:
        return { label: 'Draft', color: '#9CA3AF' };
    }
  };

  const handleSubmitComment = (sectionId: string) => {
    if (commentText.trim()) {
      onAddComment(sectionId, commentText);
      setCommentText('');
      setCommentingSection(null);
    }
  };

  // Track figure/table numbers
  let tableCount = 0;
  let figureCount = 0;

  return (
    <main className="flex-1 bg-[#F9FAFB] overflow-y-auto border-r border-[#E5E7EB]">
      <div className="max-w-[920px] mx-auto px-4 py-6">
        {/* Project ID Header - At Top */}
        <div className="mb-6">
          <div className="text-[#6B7280] mb-1" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
            Clinical Investigation Report
          </div>
          <h1 className="text-[#111827] mb-2" style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.01em' }}>
            CIP-2024-MED-0847
          </h1>
          <div className="text-[#6B7280]" style={{ fontSize: '13px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
            CARDIA-SUPPORT-2026 | Implantable Cardiac Support Device
          </div>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-[#111827] mb-1" style={{ fontSize: '17px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
            Report Sections
          </h2>
          <p className="text-[#6B7280]" style={{ fontSize: '13px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
            Review, edit, and approve each section according to your role and responsibilities
          </p>
        </div>

        {/* AI Disclosure Banner */}
        <div className="mb-6 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
          <p className="text-[#1E40AF]" style={{ fontSize: '13px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            This system continuously uses AI to analyze content for completeness, consistency, and regulatory alignment. All decisions, approvals, and final responsibility remain with assigned human roles.
          </p>
        </div>

        {/* Section Cards */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const includedAssets = dataAssets.filter(a => 
              a.selected && a.suggestedSections?.includes(section.id)
            );

            const hasContent = section.content && section.content.trim().length > 0;
            const isEditing = editingSection === section.id;
            const sectionNumber = section.order; // Use section.order instead of index + 1
            const stateBadge = getStateBadge(section.state);
            const isLocked = section.state === 'approved' || section.state === 'locked';
            const unresolvedComments = section.comments.filter(c => !c.resolved);
            
            // Count blockers and issues
            const blockerCount = section.validationFindings?.filter(f => f.type === 'blocker' && !f.resolved).length || 0;
            const issueCount = section.validationFindings?.filter(f => f.type === 'warning' && !f.resolved).length || 0;
            const hasBlockers = blockerCount > 0 || issueCount > 0;

            // Calculate completeness progress
            const totalElements = section.completenessElements?.length || 0;
            const verifiedElements = section.completenessElements?.filter(el => el.status === 'verified').length || 0;
            const completenessText = totalElements > 0 ? `${verifiedElements}/${totalElements}` : (hasContent ? '1/1' : '0/1');

            return (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className="border border-[#E5E7EB] rounded bg-white scroll-mt-16"
              >
                {/* Card Header - New Structure */}
                <div className="px-5 py-3 border-b border-[#E5E7EB] bg-white">
                  {/* Top Row: Title, Badges, Progress */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h2 
                        className="text-[#111827]"
                        style={{ 
                          fontSize: '15px', 
                          fontWeight: 600, 
                          lineHeight: '1.3', 
                          fontFamily: 'system-ui, sans-serif' 
                        }}
                      >
                        Section {sectionNumber}: {section.title}
                      </h2>
                      
                      {/* State Badge */}
                      <span 
                        className="px-2 py-0.5 rounded border"
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 500, 
                          fontFamily: 'system-ui, sans-serif',
                          backgroundColor: section.state === 'approved' ? '#EFF6FF' : '#F9FAFB',
                          borderColor: section.state === 'approved' ? '#3B82F6' : '#E5E7EB',
                          color: section.state === 'approved' ? '#2563EB' : '#6B7280'
                        }}
                      >
                        {stateBadge.label}
                      </span>

                      {/* Approval Blocked By */}
                      {hasBlockers && (
                        <>
                          <span className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}>
                            Approval blocked by
                          </span>
                          
                          {blockerCount > 0 && (
                            <span 
                              className="px-2 py-0.5 rounded"
                              style={{ 
                                fontSize: '11px', 
                                fontWeight: 500, 
                                fontFamily: 'system-ui, sans-serif',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B'
                              }}
                            >
                              {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                            </span>
                          )}
                          
                          {issueCount > 0 && (
                            <span 
                              className="px-2 py-0.5 rounded"
                              style={{ 
                                fontSize: '11px', 
                                fontWeight: 500, 
                                fontFamily: 'system-ui, sans-serif',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E'
                              }}
                            >
                              {issueCount} Warning{issueCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {completenessText}
                      </span>
                      <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                    </div>
                  </div>

                  {/* Second Row: Owner, Review Cycle, Comments */}
                  <div className="flex items-center gap-4 text-[#6B7280] mb-3" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{section.roles.contentOwner[0]?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Review Cycle 1</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSectionForComments(section.id);
                        setCommentsPanelOpen(true);
                      }}
                      className="flex items-center gap-1.5 hover:text-[#111827] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{section.comments.length} comment{section.comments.length !== 1 ? 's' : ''}</span>
                    </button>
                  </div>

                  {/* Metadata Box - White Background with Border */}
                  <div className="mb-3">
                    <div className="bg-white border border-[#E5E7EB] rounded p-3">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-3">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Review Cycle:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              Cycle 1
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Reviewer(s):
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {section.roles.reviewer.map(u => u.name).join(', ')}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[120px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Final Lock Role:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              Clinical Affairs VP
                            </span>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Required Approver:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {section.roles.requiredApprover.map(u => u.name).join(', ')}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Approval Status:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {stateBadge.label}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[#6B7280] min-w-[130px]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                              Last Updated:
                            </span>
                            <span className="text-[#111827]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              2026-02-07 13:55
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Audit Trail Link - Inside White Box */}
                      <div className="pt-3 border-t border-[#E5E7EB]">
                        <button 
                          className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#374151] transition-colors"
                          style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                          onClick={() => {
                            setSelectedSectionForAudit(section.id);
                            setAuditTrailOpen(true);
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Audit log
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Roles Card - White Background with Border */}
                  <div className="bg-white border border-[#E5E7EB] rounded p-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Content Owner */}
                      <div className="flex items-start gap-2">
                        <UserIcon className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[#6B7280] mb-0.5" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Content Owner
                          </div>
                          <div className="text-[#111827]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {section.roles.contentOwner[0]?.name || 'Unassigned'}
                          </div>
                          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Medical Device Specialist
                          </div>
                        </div>
                      </div>

                      {/* Required Approver */}
                      <div className="flex items-start gap-2">
                        <UserIcon className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[#6B7280] mb-0.5" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Required Approver
                          </div>
                          <div className="text-[#111827]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {section.roles.requiredApprover[0]?.name || 'Unassigned'}
                          </div>
                          <div className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            VP Clinical Affairs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4">
                  {/* Completeness Status */}
                  <SectionCompletenessStatus
                    elements={section.completenessElements}
                    sectionTitle={section.title}
                  />

                  {/* Guidance Panel - What this section must include */}
                  <SectionGuidancePanel
                    guidance={section.guidance}
                    onViewDocument={(docName) => {
                      console.log('View document:', docName);
                    }}
                  />

                  {/* AI-Generated Draft Banner */}
                  {section.aiDraft && !hasContent && canEdit(section) && (
                    <div className="mb-4">
                      {/* Banner Image */}
                      <img 
                        src={aiDraftBanner} 
                        alt="AI-generated draft – editable until approved" 
                        className="w-full mb-3 rounded"
                      />
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onAcceptAIDraft(section.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors"
                          style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          <Check className="w-3 h-3" />
                          Acceptera & Redigera
                        </button>
                        <button
                          onClick={() => onDismissAIDraft(section.id)}
                          className="flex items-center gap-1 px-2 py-1 border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F9FAFB] transition-colors"
                          style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          <X className="w-3 h-3" />
                          Avvisa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Draft Content (Read-Only Preview) */}
                  {section.aiDraft && !hasContent && (
                    <div 
                      className="text-[#374151] mb-4 bg-[#F9FAFB] rounded p-3 border-l-2 border-[#2563EB]"
                      style={{ 
                        fontSize: '14px', 
                        lineHeight: '1.6',
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 400,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {section.aiDraft}
                    </div>
                  )}

                  {/* Section Content */}
                  {section.id === 'section-9' && section.appendices ? (
                    <div className="mb-4">
                      <AppendicesSection
                        appendices={section.appendices}
                        onUploadAppendix={(appendixId, file) => {
                          console.log('Upload appendix:', appendixId, file.name);
                          // Handle file upload
                        }}
                        canEdit={canEdit(section)}
                      />
                    </div>
                  ) : hasContent ? (
                    canEdit(section) ? (
                      <div className="mb-4">
                        <textarea
                          value={section.content}
                          onChange={(e) => onSectionUpdate(section.id, e.target.value)}
                          className="w-full text-[#1F2937] focus:outline-none border border-[#D1D5DB] focus:border-[#2563EB] rounded p-3 min-h-[120px]"
                          style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.6',
                            fontFamily: 'system-ui, sans-serif',
                            fontWeight: 400,
                            resize: 'vertical'
                          }}
                          placeholder="Enter section content..."
                        />
                      </div>
                    ) : (
                      <div>
                        <TextWithInlineMarkers
                          text={section.content}
                          findings={section.validationFindings || []}
                          className="text-[#1F2937] mb-4 rounded px-1 -mx-1"
                          style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.6',
                            fontFamily: 'system-ui, sans-serif',
                            fontWeight: 400,
                            whiteSpace: 'pre-wrap'
                          }}
                          onNavigateToSection={(sectionId) => {
                            // Scroll to the target section
                            const targetRef = sectionRefs.current[sectionId];
                            if (targetRef) {
                              const container = targetRef.closest('.overflow-y-auto');
                              if (container) {
                                container.scrollTo({ 
                                  top: container.scrollTop + targetRef.getBoundingClientRect().top - 80, 
                                  behavior: 'smooth' 
                                });
                              }
                            }
                          }}
                        />
                      </div>
                    )
                  ) : (
                    <div className="mb-4">
                      {canEdit(section) ? (
                        <textarea
                          value=""
                          onChange={(e) => onSectionUpdate(section.id, e.target.value)}
                          className="w-full text-[#1F2937] focus:outline-none border border-[#D1D5DB] focus:border-[#2563EB] rounded p-3 min-h-[120px]"
                          style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.6',
                            fontFamily: 'system-ui, sans-serif',
                            fontWeight: 400,
                            resize: 'vertical'
                          }}
                          placeholder="Enter section content..."
                        />
                      ) : (
                        <div className="text-[#9CA3AF] italic" style={{ fontSize: '14px', fontFamily: 'system-ui, sans-serif' }}>
                          No content yet
                        </div>
                      )
                    }
                  </div>
                  )}

                  {/* Insert Data Asset Button */}
                  {isContentOwner(section) && !isLocked && section.id !== 'section-9' && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setSelectedSectionForAsset(section.id);
                          setAssetSelectorOpen(true);
                        }}
                        className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors flex items-center gap-1.5"
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert data asset
                      </button>
                    </div>
                  )}

                  {/* Approve Section or Request Changes Button - Always at Bottom */}
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex justify-end items-center">
                    {!isLocked && (
                      <button
                        onClick={() => {
                          setSelectedSectionForApprovals(section.id);
                          setApprovalsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors"
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                      >
                        Approve Section
                      </button>
                    )}
                    
                    {isLocked && (
                      <button
                        onClick={() => {
                          // Unlock section and move to draft for editing
                          onEditSection(section.id);
                        }}
                        className="px-3 py-1.5 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors bg-white"
                        style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        disabled={!isContentOwner(section)}
                      >
                        Request Changes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ready for Review Section */}
        <div className="mt-8 border-t border-[#E5E7EB] pt-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-[#111827] mb-2" style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                Ready for Review?
              </h3>
              <p className="text-[#6B7280] mb-4" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>
                Enter Review Mode to initiate formal review and approval process. Reviewers will assess completeness, consistency, and regulatory compliance. You can return to editing at any time based on feedback.
              </p>

              {/* Blocker Alert */}
              {canAssembleReport === false && (
                <div className="p-3 mb-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded">
                  <div className="text-[#991B1B] mb-1" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    {assemblyBlockers.filter(b => b.includes('blocker')).length} open blockers detected
                  </div>
                  <div className="text-[#991B1B]" style={{ fontSize: '12px', fontWeight: 400, lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
                    You can still enter review mode. Reviewers will be notified of outstanding blockers and may request resolution before approval.
                  </div>
                </div>
              )}

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-3 bg-[#DBEAFE] border border-[#93C5FD] rounded">
                <Info className="w-5 h-5 text-[#1E40AF] flex-shrink-0 mt-0.5" />
                <div className="text-[#1E3A8A]" style={{ fontSize: '12px', fontWeight: 400, lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
                  Some sections are not yet complete. Review can proceed, but incomplete sections will be flagged for reviewers.
                </div>
              </div>
            </div>

            <button
              className="px-5 py-2.5 bg-[#3B4A5C] text-white rounded hover:bg-[#2C3A48] transition-colors flex items-center gap-2 flex-shrink-0"
              style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
              onClick={() => setReviewModeModalOpen(true)}
            >
              Enter Review Mode
            </button>
          </div>

          {/* Add New Protocol Appendix Button */}
          <div className="mt-4">
            <p className="text-[#6B7280] mb-2" style={{ fontSize: '12px', fontWeight: 400, lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
              If protocol conditions or assumptions have changed during the investigation, document these changes by adding a protocol appendix to maintain regulatory traceability.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  // Find Section 9 and open it for adding appendix
                  const section9 = sections.find(s => s.id === 'section-9');
                  if (section9) {
                    // Scroll to Section 9
                    const section9Ref = sectionRefs.current['section-9'];
                    if (section9Ref) {
                      const container = section9Ref.closest('.overflow-y-auto');
                      if (container) {
                        container.scrollTo({ 
                          top: container.scrollTop + section9Ref.getBoundingClientRect().top - 80, 
                          behavior: 'smooth' 
                        });
                      }
                    }
                  }
                }}
                className="px-4 py-2 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors bg-white flex items-center gap-2"
                style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
              >
                <Plus className="w-4 h-4" />
                Add New Protocol Appendix
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={assetSelectorOpen}
        onClose={() => setAssetSelectorOpen(false)}
        dataAssets={dataAssets}
        uploadedFiles={[]}
        sectionId={selectedSectionForAsset || ''}
        onInsertAsset={(assetId) => {
          if (selectedSectionForAsset) {
            onInsertAsset(selectedSectionForAsset, assetId);
          }
          setAssetSelectorOpen(false);
        }}
      />

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={auditTrailOpen}
        onClose={() => setAuditTrailOpen(false)}
        sectionId={selectedSectionForAudit || ''}
        sectionTitle={selectedSectionForAudit ? sections.find(s => s.id === selectedSectionForAudit)?.title || '' : ''}
        sectionNumber={selectedSectionForAudit ? (sections.findIndex(s => s.id === selectedSectionForAudit) + 1).toString() : ''}
        auditLog={auditLog}
      />

      {/* Comments Panel */}
      <CommentsPanel
        isOpen={commentsPanelOpen}
        onClose={() => setCommentsPanelOpen(false)}
        sectionTitle={selectedSectionForComments ? sections.find(s => s.id === selectedSectionForComments)?.title || '' : ''}
        sectionNumber={selectedSectionForComments ? (sections.findIndex(s => s.id === selectedSectionForComments) + 1).toString() : ''}
        comments={selectedSectionForComments ? sections.find(s => s.id === selectedSectionForComments)?.comments || [] : []}
        currentUser={currentUser}
        onAddComment={(text, commentType, regarding) => {
          if (selectedSectionForComments) {
            onAddComment(selectedSectionForComments, text, commentType, regarding);
          }
        }}
        onResolveComment={(commentId) => {
          if (selectedSectionForComments) {
            onResolveComment(selectedSectionForComments, commentId);
          }
        }}
      />

      {/* Section Approvals Modal */}
      <SectionApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
        sectionTitle={selectedSectionForApprovals ? sections.find(s => s.id === selectedSectionForApprovals)?.title || '' : ''}
        approvals={selectedSectionForApprovals ? sections.find(s => s.id === selectedSectionForApprovals)?.approvals || [] : []}
        currentUser={currentUser}
        onApprove={(approvalId, comment) => {
          if (selectedSectionForApprovals) {
            onApproveSection(selectedSectionForApprovals, approvalId, comment);
          }
        }}
        onReject={(approvalId, comment) => {
          if (selectedSectionForApprovals) {
            onRejectSection(selectedSectionForApprovals, approvalId, comment);
          }
        }}
      />

      {/* Enter Review Mode Modal */}
      <EnterReviewModeModal
        isOpen={reviewModeModalOpen}
        onClose={() => setReviewModeModalOpen(false)}
        onProceed={() => {
          setReviewModeModalOpen(false);
          // Here you would actually trigger the review mode transition
          console.log('Entering review mode...');
        }}
        sections={sections}
      />
    </main>
  );
}