import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, MessageSquare, History, ChevronUp } from 'lucide-react';
import { SectionGuidanceBlock } from './section-guidance-block';
import { ProtocolTextEditor } from './protocol-text-editor';
import { AuditHistoryModal } from './audit-history-modal';
import { SectionCommentsPanel } from './section-comments-panel';
import { UnlockAmendmentModal } from './unlock-amendment-modal';
import { ConflictResolutionPanel } from './conflict-resolution-panel';

type ReviewMode = 'Draft' | 'Review' | 'Locked';
type SectionStatus = 'Draft' | 'Complete' | 'In Review' | 'Reopened' | 'Approved' | 'Locked';

interface ContentIssue {
  id: string;
  type: 'conflict' | 'missing' | 'regulatory' | 'warning';
  startIndex: number;
  endIndex: number;
  tooltipText: string;
  issueId: string;
}

interface Comment {
  id: string;
  author: string;
  authorRole: string;
  timestamp: string;
  content: string;
  status: 'open' | 'resolved';
  replies?: Comment[];
}

interface ProtocolSectionProps {
  section: {
    id: string;
    number: string;
    title: string;
    status: SectionStatus;
    owner: string;
    ownerName: string;
    requiredApproval: string;
    approverName: string;
    derivedFrom: string;
    lastUpdated: string;
    isExpanded: boolean;
    content: {
      [key: string]: string;
    };
    commentCount?: number;
    hasUnresolvedComments?: boolean;
    currentCycle?: number;
    assignedReviewers?: string[];
    finalApprover?: string;
  };
  reviewMode: ReviewMode;
  onToggle: () => void;
  onResolveConflicts?: (sectionNumber: string) => void;
  currentUser?: {
    name: string;
    role: string;
  };
}

export function ProtocolSection({ section, reviewMode, onToggle, onResolveConflicts, currentUser }: ProtocolSectionProps) {
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [unlockAmendmentModalOpen, setUnlockAmendmentModalOpen] = useState(false);
  const [showConflictResolution, setShowConflictResolution] = useState(false);

  const isLocked = section.status === 'Locked' || reviewMode === 'Locked';
  const isReadOnly = reviewMode === 'Review' || isLocked;

  // Simulate current user
  const defaultCurrentUser = {
    name: 'Dr. James Patterson',
    role: 'Clinical Lead'
  };

  const actualCurrentUser = currentUser || defaultCurrentUser;

  const isAssignedApprover = actualCurrentUser.name === section.approverName || actualCurrentUser.role === section.requiredApproval;

  // Define content issues for specific sections
  const getContentIssues = (sectionNumber: string, fieldName: string): ContentIssue[] => {
    const content = section.content[fieldName] || '';
    
    if (sectionNumber === '4.2' && fieldName === 'primaryObjective') {
      return [
        {
          id: 'issue-4.2-primary-1',
          type: 'conflict',
          startIndex: content.indexOf('all-cause mortality'),
          endIndex: content.indexOf('all-cause mortality') + 'all-cause mortality'.length,
          tooltipText: 'Endpoint definition conflicts with Synopsis § 2.3 which specifies "cardiovascular mortality".',
          issueId: 'C1'
        }
      ];
    }
    
    if (sectionNumber === '4.5' && fieldName === 'inclusionCriteria') {
      return [
        {
          id: 'issue-4.5-age-1',
          type: 'conflict',
          startIndex: content.indexOf('Age ≥65 years'),
          endIndex: content.indexOf('Age ≥65 years') + 'Age ≥65 years'.length,
          tooltipText: 'Age criterion conflicts with Synopsis § 3.2 which specifies "Age ≥70 years".',
          issueId: 'C2'
        }
      ];
    }
    
    if (sectionNumber === '4.3' && fieldName === 'deviceDescription') {
      return [
        {
          id: 'issue-4.3-device-1',
          type: 'missing',
          startIndex: content.indexOf('14-16 French catheter'),
          endIndex: content.indexOf('14-16 French catheter') + '14-16 French catheter'.length,
          tooltipText: 'Missing specific catheter size mapping per valve size.',
          issueId: 'M1'
        }
      ];
    }
    
    if (sectionNumber === '4.7' && fieldName === 'dsmb') {
      return [
        {
          id: 'issue-4.7-dsmb-1',
          type: 'missing',
          startIndex: content.indexOf('DSMB charter'),
          endIndex: content.indexOf('DSMB charter') + 'DSMB charter'.length,
          tooltipText: 'DSMB stopping criteria not specified per ISO 14155:2020.',
          issueId: 'M2'
        }
      ];
    }
    
    if (sectionNumber === '4.8' && fieldName === 'sampleSizeJustification') {
      return [
        {
          id: 'issue-4.8-sample-1',
          type: 'regulatory',
          startIndex: content.indexOf('120 subjects'),
          endIndex: content.indexOf('120 subjects') + '120 subjects'.length,
          tooltipText: 'Sample size justification may not meet MDR requirements per Annex XV Part B § 3.4.',
          issueId: 'R1'
        }
      ];
    }
    
    return [];
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Complete':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In Review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Reopened':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Locked':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Mock comments
  const getSectionComments = (): Comment[] => {
    if (!section.commentCount || section.commentCount === 0) return [];
    
    // Return realistic comments based on section
    if (section.number === '4.2') {
      return [
        {
          id: 'c1',
          author: 'Dr. Sarah Chen',
          authorRole: 'Project Lead',
          timestamp: 'Feb 5, 2026 at 09:15 CET',
          content: 'The primary endpoint definition needs to be reconciled with Synopsis § 2.3. We specified "all-cause mortality at 30 days" in the Synopsis but this section states "composite of all-cause mortality and MACE".',
          status: 'open',
          replies: [
            {
              id: 'r1',
              author: 'Emma Fischer',
              authorRole: 'Medical Writer',
              timestamp: 'Feb 5, 2026 at 10:22 CET',
              content: 'Good catch. I will align this with the Synopsis definition and add MACE as a secondary endpoint instead.',
              status: 'open',
              replies: []
            }
          ]
        },
        {
          id: 'c2',
          author: 'Prof. Klaus Müller',
          authorRole: 'Clinical Expert',
          timestamp: 'Feb 4, 2026 at 14:30 CET',
          content: 'Should we reference the recent PARTNER 3 trial data here as part of the scientific rationale? It would strengthen the clinical justification.',
          status: 'open',
          replies: []
        },
        {
          id: 'c3',
          author: 'Anna Bergström',
          authorRole: 'Regulatory Affairs',
          timestamp: 'Feb 3, 2026 at 16:45 CET',
          content: 'Confirmed that the device classification reference (Class III) is correct per MDR Annex VIII Rule 8.',
          status: 'resolved',
          replies: []
        }
      ];
    }
    
    if (section.number === '4.4') {
      return [
        {
          id: 'c4',
          author: 'Dr. Lisa Anderson',
          authorRole: 'Biostatistician',
          timestamp: 'Feb 5, 2026 at 11:00 CET',
          content: 'The sample size calculation methodology should reference the statistical analysis plan document. Can we add a cross-reference to Gate 7?',
          status: 'open',
          replies: []
        },
        {
          id: 'c5',
          author: 'Dr. Sarah Chen',
          authorRole: 'Project Lead',
          timestamp: 'Feb 4, 2026 at 15:20 CET',
          content: 'Multi-center distribution looks good. All sites have confirmed capacity and PI qualifications.',
          status: 'resolved',
          replies: []
        },
        {
          id: 'c6',
          author: 'Marcus Weber',
          authorRole: 'Quality Assurance',
          timestamp: 'Feb 4, 2026 at 09:30 CET',
          content: 'Please verify that the study duration (24 months follow-up) aligns with the MDR requirements for Class III devices.',
          status: 'open',
          replies: [
            {
              id: 'r2',
              author: 'Anna Bergström',
              authorRole: 'Regulatory Affairs',
              timestamp: 'Feb 4, 2026 at 13:15 CET',
              content: '24 months is compliant. MDR requires minimum 12 months for PMCF, and our extended follow-up exceeds this.',
              status: 'open',
              replies: []
            }
          ]
        }
      ];
    }
    
    if (section.number === '4.7') {
      return [
        {
          id: 'c7',
          author: 'Dr. Thomas Schneider',
          authorRole: 'Safety Officer',
          timestamp: 'Feb 5, 2026 at 08:45 CET',
          content: 'The DSMB charter reference is missing. This is a blocker for protocol finalization per ISO 14155:2020 § 6.5.4.',
          status: 'open',
          replies: []
        },
        {
          id: 'c8',
          author: 'Anna Bergström',
          authorRole: 'Regulatory Affairs',
          timestamp: 'Feb 4, 2026 at 16:00 CET',
          content: 'VARC-3 endpoint definitions are correctly referenced. No changes needed.',
          status: 'resolved',
          replies: []
        }
      ];
    }
    
    return [];
  };

  const handleResolveComment = (commentId: string) => {
    console.log('Resolve comment:', commentId);
  };

  const handleReplyToComment = (commentId: string, content: string) => {
    console.log('Reply to comment:', commentId, content);
  };

  const handleAddComment = (content: string) => {
    console.log('Add new comment:', content);
  };

  const handleIssueClick = (issueId: string) => {
    console.log('Issue clicked:', issueId);
    // In production: Navigate to Issues panel and highlight this issue
  };

  // Get next required action for this section
  const getNextAction = () => {
    if (isLocked) {
      return null; // No action needed for locked sections
    }
    
    if (reviewMode === 'Review') {
      if (section.status === 'Complete' && isAssignedApprover) {
        return {
          text: 'Review content and approve section',
          color: 'text-blue-700',
          isClickable: false
        };
      }
      if (section.status === 'Complete' && !isAssignedApprover) {
        return {
          text: `Waiting for approval from ${section.approverName}`,
          color: 'text-slate-600',
          isClickable: false
        };
      }
      return null;
    }
    
    // Draft mode
    if (section.status === 'Draft') {
      // Check if section has issues
      const hasIssues = Object.keys(section.content).some(key => 
        getContentIssues(section.number, key).length > 0
      );
      
      if (hasIssues) {
        return {
          text: 'Resolve conflicts before marking complete',
          color: 'text-amber-700',
          isClickable: true,
          tooltip: 'This section cannot be marked complete until all blocking conflicts are resolved.'
        };
      }
      
      return {
        text: 'Review AI-generated content and mark complete when ready',
        color: 'text-slate-600',
        isClickable: false
      };
    }
    
    if (section.status === 'Complete' && isAssignedApprover) {
      return {
        text: 'Ready to approve when all sections complete',
        color: 'text-slate-600',
        isClickable: false
      };
    }
    
    return null;
  };

  const nextAction = getNextAction();

  const handleNextActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (nextAction?.isClickable && onResolveConflicts) {
      onResolveConflicts(section.number);
    }
  };

  // Check if current user has permission to complete the section
  const canCompleteSection = () => {
    // Project Lead can complete any section
    if (actualCurrentUser.role === 'Project Lead' || actualCurrentUser.role === 'Project Manager') {
      return { canComplete: true, isOverride: actualCurrentUser.role !== section.owner };
    }
    
    // Section owner can complete their own section
    if (actualCurrentUser.role === section.owner || actualCurrentUser.name === section.ownerName) {
      return { canComplete: true, isOverride: false };
    }
    
    return { canComplete: false, isOverride: false };
  };

  // Check if there are blocking conflicts
  const hasBlockingConflicts = () => {
    return Object.keys(section.content).some(key => {
      const issues = getContentIssues(section.number, key);
      return issues.some(issue => issue.type === 'conflict');
    });
  };

  const completionPermission = canCompleteSection();
  const hasConflicts = hasBlockingConflicts();
  const canClickComplete = completionPermission.canComplete && !hasConflicts;

  const getCompleteButtonTooltip = () => {
    if (hasConflicts) {
      return 'Resolve all blocking conflicts before marking complete';
    }
    if (!completionPermission.canComplete) {
      return 'Only the section owner or Project Lead can mark this section as complete.';
    }
    if (completionPermission.isOverride) {
      return 'You can complete this section using Project Lead override';
    }
    return 'Mark this section as complete';
  };

  const handleCompleteSection = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canClickComplete) return;
    
    // Log the completion action
    console.log('Section completed:', {
      sectionId: section.id,
      completedBy: actualCurrentUser.name,
      role: actualCurrentUser.role,
      isOverride: completionPermission.isOverride,
      timestamp: new Date().toISOString()
    });
    
    // In production: Update section status, create audit log entry
    alert(`Section ${section.number} marked complete by ${actualCurrentUser.name} (${actualCurrentUser.role})${completionPermission.isOverride ? ' - Project Lead override' : ''}`);
  };

  return (
    <div id={`section-${section.id}`} className={`bg-white border rounded-lg overflow-hidden transition-all ${section.isExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>
      {/* Section Header */}
      <div
        className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${section.isExpanded ? 'border-b border-slate-200 bg-slate-50' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          <button className="mt-0.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none">
            {section.isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Section title */}
            <div className="flex items-baseline gap-3 mb-2">
              <h3 className="text-base font-semibold text-slate-900">
                {section.number} {section.title}
              </h3>
              {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5" />}
            </div>

            {/* Metadata - Clearer responsibility */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
              <div>
                <span className="text-slate-400">Owner:</span>{' '}
                <span className="font-medium text-slate-700">{section.ownerName}</span>
                <span className="text-slate-500"> ({section.owner})</span>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-slate-400">Required approval:</span>{' '}
                <span className="font-medium text-slate-700">{section.approverName}</span>
                <span className="text-slate-500"> ({section.requiredApproval})</span>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-slate-400">Last updated:</span>{' '}
                <span className="text-slate-600">{section.lastUpdated}</span>
              </div>
            </div>

            {/* Comments and Audit trail row */}
            <div className="flex items-center gap-3 text-xs">
              {section.commentCount && section.commentCount > 0 && (
                <button
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{section.commentCount} comment{section.commentCount !== 1 ? 's' : ''}</span>
                </button>
              )}
              {section.commentCount && section.commentCount > 0 && (
                <span className="text-slate-300">•</span>
              )}
              <button
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAuditHistory(true);
                }}
              >
                <History className="w-3 h-3" />
                <span>View audit trail</span>
              </button>
            </div>

            {/* Next Action - Subtle guidance */}
            {nextAction && (
              nextAction.isClickable ? (
                <button
                  className={`mt-2 text-xs ${nextAction.color} flex items-center gap-1.5 hover:underline focus:outline-none focus:underline transition-all`}
                  onClick={handleNextActionClick}
                  title={nextAction.tooltip}
                >
                  <ChevronRight className="w-3 h-3" />
                  <span>{nextAction.text}</span>
                </button>
              ) : (
                <div className={`mt-2 text-xs ${nextAction.color} flex items-center gap-1.5`}>
                  <ChevronRight className="w-3 h-3" />
                  <span>{nextAction.text}</span>
                </div>
              )
            )}
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0">
            <span className={`px-3 py-1.5 text-xs font-medium border rounded-md whitespace-nowrap ${getStatusStyles(section.status)}`}>
              {section.status}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {section.isExpanded && (
        <div className="px-6 py-6 bg-white">
          {/* Section Guidance Block - Subtle and compact */}
          <div className="mb-8">
            <SectionGuidanceBlock
              sectionNumber={section.number}
              sectionTitle={section.title}
              ownerRole={section.owner}
              ownerName={section.ownerName}
              status={section.status}
            />
          </div>

          {isLocked ? (
            // Locked Content - Clear but calm
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-green-900 mb-1">
                      This section is locked
                    </div>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Content cannot be edited. Further changes require formal amendment approval.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(section.content).map(([key, value]) => (
                  <div key={key} className="p-4 bg-white border border-slate-200 rounded-md">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm text-slate-900 leading-relaxed">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button 
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUnlockAmendmentModalOpen(true);
                  }}
                >
                  Request Amendment
                </button>
                <p className="text-xs text-slate-500 mt-2">Amendment requests are logged and require regulatory approval</p>
              </div>
            </div>
          ) : (
            // Editable/Review Content - Generous spacing
            <div className="space-y-6">
              {/* Content Fields - Clean text editors with margin indicators */}
              {Object.entries(section.content).map(([key, value]) => {
                const issues = getContentIssues(section.number, key);
                
                return (
                  <ProtocolTextEditor
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1').trim()}
                    content={value}
                    isEditable={!isReadOnly}
                    isLocked={isLocked}
                    issues={issues}
                    onIssueClick={handleIssueClick}
                  />
                );
              })}

              {/* Section Actions - Clear primary action */}
              {!isReadOnly && (
                <div className="flex justify-end pt-6 border-t border-slate-200">
                  <div className="flex gap-3">
                    {section.status === 'Draft' && (
                      <button
                        className={`px-5 py-2.5 text-sm rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                          canClickComplete
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                        onClick={handleCompleteSection}
                        title={getCompleteButtonTooltip()}
                        disabled={!canClickComplete}
                      >
                        Mark Complete
                      </button>
                    )}
                    {section.status === 'Complete' && isAssignedApprover && (
                      <button className="px-5 py-2.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                        Approve Section
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit History Modal */}
      {showAuditHistory && (
        <AuditHistoryModal
          sectionNumber={section.number}
          sectionTitle={section.title}
          entries={[
            {
              id: 'a1',
              timestamp: 'Feb 5, 2026 at 09:23 CET',
              action: 'Section created from approved Synopsis',
              actionType: 'edit',
              user: section.ownerName,
              userRole: section.owner,
              details: `Initial protocol content generated from Synopsis`,
              versionId: '4.0.1'
            },
            {
              id: 'a2',
              timestamp: 'Feb 4, 2026 at 14:15 CET',
              action: 'AI consistency check completed',
              actionType: 'ai_check',
              user: 'System',
              userRole: 'Automated Process',
              details: 'Verified alignment with Synopsis',
              versionId: '4.0.1'
            }
          ]}
          onClose={() => setShowAuditHistory(false)}
        />
      )}

      {/* Section Comments Panel */}
      {showComments && (
        <SectionCommentsPanel
          sectionNumber={section.number}
          sectionTitle={section.title}
          comments={getSectionComments()}
          onResolveComment={handleResolveComment}
          onReplyToComment={handleReplyToComment}
          onAddComment={handleAddComment}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Unlock Amendment Modal */}
      {unlockAmendmentModalOpen && (
        <UnlockAmendmentModal
          sectionNumber={section.number}
          sectionTitle={section.title}
          onClose={() => setUnlockAmendmentModalOpen(false)}
        />
      )}

      {/* Conflict Resolution Panel */}
      {showConflictResolution && (
        <ConflictResolutionPanel
          sectionNumber={section.number}
          sectionTitle={section.title}
          onClose={() => setShowConflictResolution(false)}
        />
      )}
    </div>
  );
}