import React, { useState } from 'react';
import { Info, AlertCircle, CheckCircle2, Clock, MessageSquare, History, ChevronDown, User, Lock, UserCheck, FileCheck, AlertTriangle, XCircle, Ban } from 'lucide-react';
import { AuditTrailModal } from './audit-trail-modal';
import { InlineIssueMarker } from './inline-issue-marker';
import { CommentsModal } from './comments-modal';
import { SectionCompletenessIndicator } from './section-completeness-indicator';
import { ReferencedDocumentsPanel } from './referenced-documents-panel';
import { AmendmentWarning } from './amendment-warning';
import { ProtocolTextSeparator, MetadataSeparator } from './protocol-text-separator';
import { AIRoleClarityBanner } from './ai-role-clarity-banner';

interface ProtocolIssue {
  id: string;
  severity: 'blocker' | 'warning';
  subsection: string;
  description: string;
  reference?: string;
  raisedBy: string;
  raisedDate: string;
  status: 'open' | 'potentially-resolved' | 'resolved';
  dueDate?: string;
}

interface RequiredElement {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'missing';
  reference: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

interface AuditEntry {
  timestamp: string;
  timezone: string;
  user: string;
  userRole: string;
  action: string;
  affectedElement: string;
  details?: string;
  aiAssisted?: boolean;
}

interface ProtocolSectionProps {
  section: {
    id: string;
    number: string;
    title: string;
    status: string;
    owner: string;
    updated: string;
    comments: number;
    aiGenerated: boolean;
    reviewStatus: string | null;
    locked?: boolean;
    reviewCycle?: number;
    reviewer?: string;
    approver?: string;
    approverRole?: string;
    ownerRole?: string;
    issues?: ProtocolIssue[];
    requiredElements?: RequiredElement[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  isHighlighted?: boolean;
  isReviewMode?: boolean;
}

function ProtocolSectionComponent(
  { section, isExpanded, onToggle, isHighlighted = false, isReviewMode = false }: ProtocolSectionProps,
  ref: React.Ref<HTMLDivElement>
) {
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showAmendmentWarning, setShowAmendmentWarning] = useState(false);
  const [completenessExpanded, setCompletenessExpanded] = useState(false);
  
  const isBlocked = section.id === '5' || section.id === '6';
  const isApproved = section.status === 'complete';
  
  // Count open issues by severity
  const openIssues = section.issues?.filter(i => i.status === 'open') || [];
  const blockerCount = openIssues.filter(i => i.severity === 'blocker').length;
  const warningCount = openIssues.filter(i => i.severity === 'warning').length;
  const totalIssues = openIssues.length;

  return (
    <div 
      ref={ref}
      className={`bg-white border rounded transition-all duration-300 ${
        isHighlighted 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
          : 'border-slate-200'
      }`}
    >
      {/* Collapsed Header - Always Visible */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-slate-900 font-semibold">
                Section {section.number}: {section.title}
              </h3>
              
              {/* Status Badges */}
              {section.locked && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                  Locked
                </span>
              )}
              {isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                  Approved
                </span>
              )}
              {!isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200">
                  Draft
                </span>
              )}
              {isBlocked && blockerCount > 0 && (
                <span className="text-xs text-slate-600">
                  Approval blocked by
                </span>
              )}
              {/* Issue Count Indicator */}
              {totalIssues > 0 && (
                <>
                  {blockerCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded border border-red-300">
                      {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">
                      {warningCount} Warning{warningCount > 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{section.owner}</span>
              </div>
              {section.reviewCycle && (
                <div className="flex items-center gap-1">
                  <span>Review Cycle {section.reviewCycle}</span>
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentsOpen(true);
                }}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{section.comments} comments</span>
              </button>
              
              {/* Completeness Indicator */}
              {section.requiredElements && section.requiredElements.length > 0 && (
                <div className="ml-auto">
                  <span className="text-xs text-slate-500">
                    {section.requiredElements.filter(e => e.status === 'complete').length}/{section.requiredElements.length} complete
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            <ChevronDown 
              className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 space-y-4">
            {/* 1. REVIEW HEADER */}
            <div className="p-4 bg-white border border-slate-200 rounded">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Review Cycle:</span>
                  <span className="ml-2 text-slate-900">Cycle {section.reviewCycle || 1}</span>
                </div>
                <div>
                  <span className="text-slate-500">Required Approver:</span>
                  <span className="ml-2 text-slate-900">{section.approver || 'Dr. Helena Schmidt'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Reviewer(s):</span>
                  <span className="ml-2 text-slate-900">{section.reviewer || 'Dr. Thomas Weber'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Approval Status:</span>
                  <span className={`ml-2 font-medium ${isApproved ? 'text-blue-700' : 'text-slate-700'}`}>
                    {isApproved ? 'Approved' : 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Final Lock Role:</span>
                  <span className="ml-2 text-slate-900">Clinical Affairs VP</span>
                </div>
                <div>
                  <span className="text-slate-500">Last Updated:</span>
                  <span className="ml-2 text-slate-900">{section.updated}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setAuditTrailOpen(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <History className="w-3 h-3" />
                  View audit trail
                </button>
              </div>
            </div>

            {/* 2. ROLES & APPROVAL CARD */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Content Owner</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-900">{section.owner}</div>
                      <div className="text-xs text-slate-500">{section.ownerRole || 'Principal Investigator'}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-500 mb-1">Required Approver</div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-900">{section.approver || 'Dr. Helena Schmidt'}</div>
                      <div className="text-xs text-slate-500">{section.approverRole || 'VP Clinical Affairs'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. COMPLETENESS STATUS - INSPECTION CRITICAL */}
            {/* Always shown in a collapsible box */}
            {section.requiredElements && section.requiredElements.length > 0 && (
              <SectionCompletenessIndicator
                sectionNumber={section.number}
                requiredElements={section.requiredElements}
              />
            )}

            {/* 4. AI ROLE CLARITY - INSPECTION CRITICAL */}
            {/* Only show in REVIEW mode */}
            {section.aiGenerated && !isApproved && isReviewMode && (
              <AIRoleClarityBanner
                contentType="ai-draft"
                lastHumanReviewer={section.reviewer}
                lastReviewDate={section.updated}
              />
            )}

            {section.aiGenerated && isApproved && isReviewMode && (
              <AIRoleClarityBanner
                contentType="ai-edited"
                aiEditedBy={section.owner}
                lastHumanReviewer={section.approver}
                lastReviewDate={section.updated}
              />
            )}

            {/* 5. LOCKED SECTION BANNER - AMENDMENT REQUIRED */}
            {section.locked && (
              <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      Locked Section - Amendment Required for Changes
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      This section is approved and locked. Any changes will constitute a protocol amendment 
                      requiring formal change control, regulatory notification, and ethics committee review per 
                      ISO 14155:2020 § 6.11 and EU MDR Article 75.
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      <div className="text-xs text-slate-500 flex-1">
                        <strong>Locked by:</strong> {section.approver} on {section.updated}
                      </div>
                      <button 
                        onClick={() => setShowAmendmentWarning(true)}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded transition-colors"
                      >
                        Initiate Amendment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isBlocked && (() => {
              // Get blocker issues for this section
              const blockerIssues = openIssues.filter(i => i.severity === 'blocker');
              
              return (
                <div className="border border-red-400 rounded bg-red-50">
                  <button
                    onClick={() => setIssuesExpanded(!issuesExpanded)}
                    className="w-full p-4 text-left transition-colors hover:bg-red-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-900">
                          Blocked by unresolved Issue
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform ${issuesExpanded || isReviewMode ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {(issuesExpanded || isReviewMode) && (
                    <div className="px-4 pb-4 space-y-2 border-t border-red-200">
                      {blockerIssues.map((issue) => (
                        <button
                          key={issue.id}
                          onClick={() => {
                            // Scroll to the subsection containing this issue
                            const subsectionId = issue.subsection.toLowerCase().replace(/\s+/g, '-');
                            const element = document.getElementById(subsectionId);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className="block w-full text-left text-xs text-red-700 hover:text-red-900 hover:underline leading-relaxed transition-colors pt-3"
                        >
                          {issue.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. WHAT THIS SECTION MUST INCLUDE (GUIDANCE) */}
            <div className={`border-2 rounded ${guidanceExpanded ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-slate-50'}`}>
              <button
                onClick={() => setGuidanceExpanded(!guidanceExpanded)}
                className={`w-full p-4 text-left transition-colors ${guidanceExpanded ? 'hover:bg-slate-200' : 'hover:bg-slate-100'}`}
              >
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${guidanceExpanded ? 'text-slate-600' : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${guidanceExpanded ? 'text-slate-900' : 'text-slate-900'}`}>
                        What this section must include
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 ${guidanceExpanded ? 'text-slate-600' : 'text-slate-400'} transition-transform ${guidanceExpanded ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {!guidanceExpanded && (
                      <div className="text-xs text-slate-500 mt-1">
                        Click to view regulatory requirements and common pitfalls
                      </div>
                    )}
                  </div>
                </div>
              </button>
              
              {guidanceExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="p-3 bg-white border border-slate-200 rounded">
                    {getSectionGuidance(section.id)}
                  </div>
                  
                  {/* Common Pitfalls */}
                  <div className="p-3 bg-white border border-slate-200 rounded">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs font-medium text-slate-900">Common pitfalls</div>
                    </div>
                    {getSectionPitfalls(section.id)}
                  </div>

                  {/* Referenced Documents */}
                  <ReferencedDocumentsPanel 
                    documents={getReferencedDocuments(section.id)}
                    sectionId={section.id}
                  />

                  {/* Amendment Info - Only shown if section is approved or locked */}
                  {(isApproved || section.locked) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900 mb-1">
                            {section.locked ? 'Locked Section' : 'Approved Section'}
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            Changes require formal amendment per ISO 14155:2020 § 6.11
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ISSUES / ERRORS AREA - System Controlled, Non-Editable */}
            {/* In AUTHORING mode: compact with expand. In REVIEW mode: always expanded */}
            {openIssues.length > 0 && !isBlocked && (
              isReviewMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div className="text-sm font-medium text-slate-900">
                      Issues requiring attention ({openIssues.length})
                    </div>
                  </div>
                  
                  {openIssues.map((issue) => (
                    <div 
                      key={issue.id}
                      className={`border-l-4 rounded p-4 ${
                        issue.severity === 'blocker' 
                          ? 'bg-red-50 border-red-500' 
                          : 'bg-amber-50 border-amber-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {issue.severity === 'blocker' && <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                        {issue.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium uppercase tracking-wide ${
                              issue.severity === 'blocker' 
                                ? 'text-red-900' 
                                : 'text-amber-900'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs font-medium text-slate-900">{issue.subsection}</span>
                          </div>
                          
                          <p className={`text-xs leading-relaxed mb-2 ${
                            issue.severity === 'blocker' 
                              ? 'text-red-800' 
                              : 'text-amber-800'
                          }`}>
                            {issue.description}
                          </p>
                          
                          {issue.reference && (
                            <div className="text-xs text-slate-600 italic mb-2">
                              Reference: {issue.reference}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
                            <span>Raised by: {issue.raisedBy}</span>
                            <span>•</span>
                            <span>{issue.raisedDate}</span>
                            {issue.dueDate && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-medium">Due in {issue.dueDate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !issuesExpanded ? (
                  <button
                    onClick={() => setIssuesExpanded(true)}
                    className="w-full p-3 bg-amber-50 border border-amber-200 rounded text-left hover:bg-amber-100 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                        <span className="text-sm text-amber-900">
                          {openIssues.length} {openIssues.length === 1 ? 'Warning' : 'Warnings'} requiring attention
                        </span>
                        {blockerCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded font-medium">
                            {blockerCount} Blocker{blockerCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-600 -rotate-90" />
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <div className="text-sm font-medium text-slate-900">
                          Issues requiring attention ({openIssues.length})
                        </div>
                      </div>
                      <button
                        onClick={() => setIssuesExpanded(false)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Collapse
                      </button>
                    </div>
                    
                    {openIssues.map((issue) => (
                      <div 
                        key={issue.id}
                        className={`border-l-4 rounded p-4 ${
                          issue.severity === 'blocker' 
                            ? 'bg-red-50 border-red-500' 
                            : 'bg-amber-50 border-amber-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {issue.severity === 'blocker' && <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                          {issue.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium uppercase tracking-wide ${
                                issue.severity === 'blocker' 
                                  ? 'text-red-900' 
                                  : 'text-amber-900'
                              }`}>
                                {issue.severity}
                              </span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs font-medium text-slate-900">{issue.subsection}</span>
                            </div>
                            
                            <p className={`text-xs leading-relaxed mb-2 ${
                              issue.severity === 'blocker' 
                                ? 'text-red-800' 
                                : 'text-amber-800'
                            }`}>
                              {issue.description}
                            </p>
                            
                            {issue.reference && (
                              <div className="text-xs text-slate-600 italic mb-2">
                                Reference: {issue.reference}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
                              <span>Raised by: {issue.raisedBy}</span>
                              <span>•</span>
                              <span>{issue.raisedDate}</span>
                              {issue.dueDate && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600 font-medium">Due in {issue.dueDate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )
            )}

            {/* 6. PROTOCOL CONTENT (EDITABLE) - Clearly Separated */}
            <ProtocolTextSeparator>
              {getSectionContent(section.id, section.aiGenerated, section.issues || [])}
            </ProtocolTextSeparator>

            {/* 7. SECTION ACTIONS */}
            {/* In REVIEW mode: emphasize review actions. In AUTHORING mode: standard edit actions */}
            <div className={`flex items-center justify-between pt-4 border-t ${isReviewMode ? 'border-blue-200' : 'border-slate-200'}`}>
              <div className="text-xs text-slate-500">
                {isReviewMode 
                  ? 'Review mode active • Focus on issues and completeness'
                  : `${section.ownerRole || 'Owner'} can edit content • Reviewers can comment and raise issues`
                }
              </div>
              <div className="flex items-center gap-2">
                {isReviewMode ? (
                  <>
                    {section.locked && (
                      <button className="px-4 py-2 border-2 border-amber-400 bg-amber-50 text-amber-900 text-sm rounded hover:bg-amber-100 transition-colors font-medium">
                        Request Changes
                      </button>
                    )}
                    {!isApproved && (
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium">
                        Approve Section
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {section.locked && (
                      <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors">
                        Request Changes
                      </button>
                    )}
                    {!isApproved && (
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                        Approve Section
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={auditTrailOpen}
        onClose={() => setAuditTrailOpen(false)}
        sectionNumber={section.number}
        sectionTitle={section.title}
        entries={getSectionAuditTrail(section.id)}
      />

      {/* Comments Modal */}
      <CommentsModal
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        sectionNumber={section.number}
        sectionTitle={section.title}
        comments={getSectionComments(section.id)}
        onAddComment={(content, type) => {
          console.log('New comment:', content, type);
          // In production: API call to save comment with full audit trail
        }}
      />

      {/* Amendment Warning Modal */}
      {showAmendmentWarning && (
        <AmendmentWarning
          sectionNumber={section.number}
          sectionTitle={section.title}
          lockedBy={section.approver}
          approvedDate={section.updated}
          onProceed={() => {
            setShowAmendmentWarning(false);
            console.log('Amendment initiated for section', section.number);
            // In production: Initiate amendment workflow with audit trail
          }}
          onCancel={() => setShowAmendmentWarning(false)}
        />
      )}
    </div>
  );
}

// Export with forwardRef to support ref forwarding
export const ProtocolSection = React.forwardRef<HTMLDivElement, ProtocolSectionProps>(ProtocolSectionComponent);

ProtocolSection.displayName = 'ProtocolSection';

function getSectionPurpose(sectionId: string): string {
  const purposes: Record<string, string> = {
    '1': 'Establish unique protocol identification and administrative accountability for regulatory traceability.',
    '2': 'Justify clinical need and define measurable objectives that drive study design and endpoint selection.',
    '3': 'Describe the investigational device, intended use, and clinical context to support risk-benefit assessment.',
    '4': 'Define study design and methodology appropriate to address stated objectives with scientific validity.',
    '5': 'Specify subject eligibility criteria that balance scientific objectives, safety, and enrollment feasibility.',
    '6': 'Detail all study procedures, assessments, and data collection to ensure protocol compliance and endpoint evaluation.',
    '7': 'Establish safety monitoring framework and adverse event management aligned with regulatory vigilance requirements.',
    '8': 'Define analysis approach and statistical considerations to support valid interpretation of study results.',
    '9': 'Document ethical principles, consent process, and regulatory compliance framework governing the investigation.',
  };
  return purposes[sectionId] || 'Define section content per regulatory requirements.';
}

function getSectionComments(sectionId: string) {
  // Example comments - in production, these would come from API
  const commentsData: Record<string, any[]> = {
    '1': [
      {
        id: 'c1',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 09:15 CET',
        content: 'Protocol title should include device commercial name per MDR requirements. Please revise to: "Clinical Investigation of the ValveTech TAVI System..."',
        type: 'issue',
        subsection: 'Protocol Title',
        status: 'open'
      },
      {
        id: 'c2',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-07 14:30 CET',
        content: 'Sponsor contact information is complete and complies with EU MDR Article 62 requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c3',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 11:20 CET',
        content: 'Please verify that the protocol identification code follows the sponsor\'s standard naming convention.',
        type: 'general',
        status: 'open'
      }
    ],
    '2': [
      {
        id: 'c2-1',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 13:45 CET',
        content: 'The clinical rationale section effectively establishes the medical need. Well done.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-2',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 10:30 CET',
        content: 'Primary objective needs to explicitly reference the 12-month timepoint.',
        type: 'issue',
        subsection: 'Primary Objective',
        status: 'open'
      },
      {
        id: 'c2-3',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-07 15:20 CET',
        content: 'Should we add a reference to recent PARTNER 3 trial data?',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-4',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 14:15 CET',
        content: 'Risk-benefit assessment is well structured and comprehensive.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-5',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-05 16:30 CET',
        content: 'Confirmed alignment with ISO 14155:2020 requirements for objectives.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-6',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-05 11:45 CET',
        content: 'Secondary objectives are clearly defined and measurable.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c2-7',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-04 09:20 CET',
        content: 'Literature review section provides solid scientific foundation.',
        type: 'general',
        status: 'open'
      }
    ],
    '3': [
      {
        id: 'c3-1',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-08 10:45 CET',
        content: 'Device classification rationale should be expanded to include explicit reference to Rule 8.',
        type: 'issue',
        subsection: 'Clinical Context',
        status: 'open'
      },
      {
        id: 'c3-2',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 13:30 CET',
        content: 'Device specifications are complete and accurate.',
        type: 'general',
        status: 'open'
      }
    ],
    '5': [
      {
        id: 'c5-1',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 11:20 CET',
        content: 'Critical concern: The inclusion/exclusion criteria appear too restrictive for the target sample size of N=120. Based on typical TAVR patient populations, we may struggle to enroll within the proposed 6-month timeline. Recommend either relaxing STS-PROM range to 3-9% or extending enrollment period to 9 months.',
        type: 'issue',
        subsection: 'Inclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-2',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 10:15 CET',
        content: 'Each exclusion criterion must include explicit justification per ISO 14155:2020 § 6.6.3. Current draft lists criteria but lacks rationale. Please add justification for each criterion (safety, scientific validity, or feasibility).',
        type: 'issue',
        subsection: 'Exclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-3',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 16:45 CET',
        content: 'I have updated the LVEF exclusion threshold from <25% to <30% to align with the device IFU contraindications. This ensures consistency with the approved intended use statement.',
        type: 'general',
        subsection: 'Exclusion Criteria',
        status: 'open'
      },
      {
        id: 'c5-4',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-06 13:20 CET',
        content: 'Confirmed: Age criterion of ≥65 years aligns with device intended use for elderly patients with intermediate surgical risk. No changes needed.',
        type: 'general',
        subsection: 'Inclusion Criteria',
        status: 'resolved',
        resolvedBy: 'Dr. Marcus Rivera',
        resolvedDate: '2026-02-07 09:00 CET'
      },
      {
        id: 'c5-5',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-06 09:45 CET',
        content: 'Please verify that contraindications align with the latest IFU version.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-6',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-05 14:30 CET',
        content: 'Screening procedures need to be detailed further.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-7',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-05 11:15 CET',
        content: 'Enrollment timeline appears aggressive - feasibility assessment needed.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-8',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-04 16:20 CET',
        content: 'Anatomical criteria are well-defined and measurable.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-9',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-04 10:50 CET',
        content: 'Inclusion criteria comply with MDR requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-10',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-03 15:30 CET',
        content: 'Consider adding comorbidity exclusions.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-11',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-03 09:15 CET',
        content: 'Subject eligibility documentation requirements should be specified.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c5-12',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-02 13:40 CET',
        content: 'Good progress on eligibility criteria definition.',
        type: 'general',
        status: 'open'
      }
    ],
    '6': [
      {
        id: 'c6-1',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-08 14:10 CET',
        content: 'Section 6.3 (Follow-up Schedule) references "clinical assessment at 6 months" but Section 4.8 (Primary Endpoint) specifies primary endpoint evaluation at 30 days. Please clarify if 6-month follow-up is for secondary endpoints only.',
        type: 'issue',
        subsection: 'Follow-up Schedule',
        status: 'open'
      },
      {
        id: 'c6-2',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-08 13:45 CET',
        content: 'Echocardiography assessment protocol should reference specific VARC-3 criteria for standardization. Please add citation and core lab requirements.',
        type: 'approval-request',
        subsection: 'Imaging Assessments',
        status: 'open'
      },
      {
        id: 'c6-3',
        author: 'Dr. Elena Kowalski',
        authorRole: 'Clinical Operations Lead',
        timestamp: '2026-02-08 10:30 CET',
        content: 'Visit windows need to be clearly defined for all timepoints.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-4',
        author: 'Dr. Marcus Rivera',
        authorRole: 'Medical Device Specialist',
        timestamp: '2026-02-07 15:20 CET',
        content: 'Laboratory procedures are well documented.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-5',
        author: 'Dr. Sarah Chen',
        authorRole: 'Principal Investigator',
        timestamp: '2026-02-07 11:45 CET',
        content: 'Assessment schedule aligns with study objectives.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-6',
        author: 'Dr. Emma Chen',
        authorRole: 'Regulatory Affairs Manager',
        timestamp: '2026-02-06 14:30 CET',
        content: 'Procedure documentation meets ISO 14155 requirements.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-7',
        author: 'Dr. Thomas Weber',
        authorRole: 'Senior Reviewer',
        timestamp: '2026-02-06 09:15 CET',
        content: 'Clinical assessments are comprehensive and appropriate.',
        type: 'general',
        status: 'open'
      },
      {
        id: 'c6-8',
        author: 'Dr. Helena Schmidt',
        authorRole: 'VP Clinical Affairs',
        timestamp: '2026-02-05 16:50 CET',
        content: 'Good structure for study procedures section.',
        type: 'general',
        status: 'open'
      }
    ]
  };

  return commentsData[sectionId] || [];
}

function getSectionCompleteness(sectionId: string) {
  // Example completeness data - in production, this would be calculated from actual content analysis
  const completenessData: Record<string, any> = {
    '1': { complete: 8, partial: 0, missing: 0, total: 8 },
    '2': { complete: 4, partial: 1, missing: 0, total: 5 },
    '3': { complete: 6, partial: 0, missing: 1, total: 7 },
    '4': { complete: 5, partial: 2, missing: 1, total: 8 },
    '5': { complete: 5, partial: 1, missing: 2, total: 8 },
    '6': { complete: 7, partial: 2, missing: 3, total: 12 },
    '7': { complete: 8, partial: 1, missing: 1, total: 10 },
    '8': { complete: 6, partial: 0, missing: 0, total: 6 },
    '9': { complete: 9, partial: 1, missing: 0, total: 10 }
  };
  
  return completenessData[sectionId] || { complete: 0, partial: 0, missing: 0, total: 0 };
}

function getReferencedDocuments(sectionId: string) {
  // Example referenced documents - in production, this would come from API
  const allDocuments = [
    {
      id: 'rmf-001',
      title: 'Risk Management File - ValveTech TAVI System',
      type: 'risk-management' as const,
      version: '2.1',
      date: '2026-01-15',
      status: 'approved' as const,
      sections: ['3', '5', '6', '7']
    },
    {
      id: 'cer-001',
      title: 'Clinical Evaluation Report',
      type: 'clinical-evaluation' as const,
      version: '1.3',
      date: '2025-12-10',
      status: 'approved' as const,
      sections: ['2', '3', '4']
    },
    {
      id: 'ib-001',
      title: "Investigator's Brochure - ValveTech TAVI v3.2",
      type: 'investigators-brochure' as const,
      version: '3.2',
      date: '2026-01-20',
      status: 'approved' as const,
      sections: ['3', '5', '6', '7']
    },
    {
      id: 'ifu-001',
      title: 'Instructions for Use & Intended Purpose Statement',
      type: 'ifu' as const,
      version: '2.0',
      date: '2026-01-10',
      status: 'approved' as const,
      sections: ['3', '5']
    },
    {
      id: 'sap-001',
      title: 'Statistical Analysis Plan',
      type: 'sap' as const,
      version: '1.0-draft',
      date: '2026-02-01',
      status: 'draft' as const,
      sections: ['4', '8']
    },
    {
      id: 'pms-001',
      title: 'Post-Market Surveillance Plan',
      type: 'pms' as const,
      version: '1.1',
      date: '2025-11-30',
      status: 'approved' as const,
      sections: ['2', '9']
    }
  ];

  return allDocuments;
}

function getSectionGuidance(sectionId: string) {
  const guidance: Record<string, JSX.Element> = {
    '1': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.1</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Protocol title (full and abbreviated)</li>
          <li>Unique protocol identification code</li>
          <li>Protocol version and date</li>
          <li>Sponsor legal entity and regulatory contact</li>
          <li>Coordinating investigator (name, credentials, site affiliation)</li>
          <li>Study phase designation per EU MDR classification</li>
          <li>EudraCT or equivalent registry number</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: ClinicalTrials.gov registration, sponsor organization records, investigator site agreement
        </p>
      </>
    ),
    '2': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.3, 6.4</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Clinical background and unmet medical need</li>
          <li>Summary of existing evidence (clinical data, literature)</li>
          <li>Scientific rationale for the investigation</li>
          <li>Clear statement of primary objective (singular, measurable)</li>
          <li>Secondary objectives (exploratory, supporting)</li>
          <li>Alignment with device intended use and indications</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Synopsis objectives, endpoint definitions (Section 4.6), statistical analysis plan
        </p>
      </>
    ),
    '3': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.7 · MDR Annex XV</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Device description (design, materials, mechanism of action)</li>
          <li>Intended clinical use and target patient population</li>
          <li>Device classification and regulatory status</li>
          <li>Instructions for use and clinical administration</li>
          <li>Known or foreseeable risks</li>
          <li>Preclinical and prior clinical experience summary</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Instructions for Use (IFU), Clinical Evaluation Report, Investigator's Brochure
        </p>
      </>
    ),
    '4': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.5</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Study type (observational, interventional, randomized, etc.)</li>
          <li>Study design rationale (why this design addresses objectives)</li>
          <li>Number of sites and geographic scope</li>
          <li>Target enrollment and enrollment duration</li>
          <li>Randomization and stratification (if applicable)</li>
          <li>Blinding approach (subject, investigator, assessor)</li>
          <li>Study duration and follow-up schedule</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Primary objective, endpoint timing, sample size justification
        </p>
      </>
    ),
    '5': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.6 · MDR Article 62(4)</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Inclusion criteria (population definition, disease characteristics)</li>
          <li>Exclusion criteria (safety, confounding factors, feasibility)</li>
          <li>Justification for each criterion</li>
          <li>Special population considerations (vulnerable subjects)</li>
          <li>Subject withdrawal and discontinuation rules</li>
          <li>Recruitment feasibility assessment</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Device intended use, sample size target (Section 4.8), enrollment feasibility
        </p>
      </>
    ),
    '6': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.8</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Study flow diagram (screening through final follow-up)</li>
          <li>Screening and baseline assessments</li>
          <li>Index procedure or intervention specifications</li>
          <li>Follow-up visit schedule and assessment timing</li>
          <li>Clinical assessments, imaging, laboratory tests</li>
          <li>Endpoint measurement methods</li>
          <li>Source documentation and data collection forms</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Endpoint definitions, assessment timing, statistical analysis windows
        </p>
      </>
    ),
    '7': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.12 · MDR Article 80-82</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Safety oversight structure (DSMB, safety committee)</li>
          <li>Definitions: AE, SAE, SADE, USADE, device deficiency</li>
          <li>Event assessment and causality determination</li>
          <li>Reporting timelines (sponsor, competent authority, ethics)</li>
          <li>Stopping rules and safety signals</li>
          <li>Post-market vigilance linkage</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: EU MDR vigilance requirements, Sponsor SOPs, regulatory reporting obligations
        </p>
      </>
    ),
    '8': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.10 · ICH E9</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Analysis populations (ITT, mITT, per-protocol, safety)</li>
          <li>Primary endpoint analysis method</li>
          <li>Sample size justification with assumptions</li>
          <li>Statistical significance level and power</li>
          <li>Handling of missing data and dropouts</li>
          <li>Interim analysis plan (if applicable)</li>
          <li>Reference to detailed Statistical Analysis Plan (SAP)</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Primary objective, endpoint definitions, study design, enrollment target
        </p>
      </>
    ),
    '9': (
      <>
        <div className="text-xs font-medium text-slate-900 mb-2">Required Elements · ISO 14155:2020 § 6.13 · MDR Article 62-63</div>
        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Ethical framework (Declaration of Helsinki, GCP)</li>
          <li>Informed consent process and documentation</li>
          <li>Ethics committee approval and ongoing reporting</li>
          <li>Competent authority authorization (EU MDR)</li>
          <li>Data protection and confidentiality (GDPR)</li>
          <li>Subject compensation for injury</li>
          <li>Protocol amendments and deviation management</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3 italic">
          Must align with: Local regulatory requirements, institutional policies, data management plan
        </p>
      </>
    ),
  };

  return guidance[sectionId] || null;
}

function getSectionPitfalls(sectionId: string) {
  const pitfalls: Record<string, JSX.Element> = {
    '1': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Protocol ID does not match sponsor numbering convention</li>
        <li>Coordinating PI credentials incomplete or unverifiable</li>
        <li>EudraCT number not yet obtained (delays submission)</li>
      </ul>
    ),
    '2': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Objectives vague or not measurable ("assess feasibility" without criteria)</li>
        <li>Primary objective misaligned with primary endpoint</li>
        <li>Rationale does not address known device risks or limitations</li>
        <li>Insufficient prior evidence to justify investigation</li>
      </ul>
    ),
    '3': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Device description conflicts with IFU or regulatory dossier</li>
        <li>Intended use broader than supported by preclinical data</li>
        <li>Known risks omitted or understated</li>
        <li>Device classification incorrect or not substantiated</li>
      </ul>
    ),
    '4': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Design inappropriate for primary objective (e.g., single-arm for superiority claim)</li>
        <li>Follow-up duration shorter than endpoint assessment window</li>
        <li>No justification for control group selection</li>
        <li>Site number unrealistic for enrollment target and timeline</li>
      </ul>
    ),
    '5': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Criteria too restrictive (enrollment infeasible within study timeline)</li>
        <li>Criteria too broad (heterogeneous population, confounded analysis)</li>
        <li>Exclusions omit contraindications from device IFU</li>
        <li>No feasibility assessment of target population prevalence</li>
      </ul>
    ),
    '6': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Assessment timing does not match endpoint definition windows</li>
        <li>Endpoint measurement methods not validated or standardized</li>
        <li>Missing procedures required for safety monitoring</li>
        <li>Source documentation requirements undefined</li>
      </ul>
    ),
    '7': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Reporting timelines conflict with regulatory requirements</li>
        <li>DSMB charter missing or not referenced</li>
        <li>Causality assessment criteria not defined</li>
        <li>No process for USADE determination</li>
      </ul>
    ),
    '8': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Sample size assumptions unrealistic (event rate, dropout rate)</li>
        <li>Analysis method inappropriate for data type (non-normal distribution)</li>
        <li>Missing data handling not specified</li>
        <li>No SAP reference or finalization timeline</li>
      </ul>
    ),
    '9': (
      <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
        <li>Consent form not approved by local ethics committee</li>
        <li>GDPR compliance not addressed for cross-border data transfer</li>
        <li>Amendment process not defined</li>
        <li>Subject compensation for injury not specified or insufficient</li>
      </ul>
    ),
  };

  return pitfalls[sectionId] || null;
}

function getSectionContent(sectionId: string, aiGenerated: boolean, issues: ProtocolIssue[]) {
  const contents: Record<string, JSX.Element> = {
    '1': (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Administrative Identifiers</div>
          <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 text-xs">
            <div className="text-slate-500">Protocol Title (Full)</div>
            <textarea 
              className="text-sm text-slate-900 border border-slate-200 rounded p-2 min-h-[60px] resize-none"
              defaultValue="A Prospective, Multi-Center, Randomized Controlled Study Evaluating the Safety and Performance of the CardiaFlow Transcatheter Aortic Valve System in Patients with Severe Symptomatic Aortic Stenosis"
            />
            
            <div className="text-slate-500">Short Title</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="CARDIA-FLOW-2026"
            />
            
            <div className="text-slate-500">Protocol ID</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="CF-EU-2026-001"
            />
            
            <div className="text-slate-500">Version & Date</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="Version 1.3 (Draft) — 08 February 2026"
            />
            
            <div className="text-slate-500">EudraCT Number</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="2026-000547-19 (pending)"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Sponsor Organization</div>
          <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 text-xs">
            <div className="text-slate-500">Legal Entity</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="CardiaFlow Medical Technologies GmbH"
            />
            
            <div className="text-slate-500">Address</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="Technologiepark 15, 80992 München, Germany"
            />
            
            <div className="text-slate-500">Regulatory Contact</div>
            <textarea 
              className="text-sm text-slate-900 border border-slate-200 rounded p-2 min-h-[50px] resize-none"
              defaultValue="Dr. Helena Schmidt, VP Clinical Affairs&#10;regulatory@cardiaflow-med.eu"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Coordinating Investigator</div>
          <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 text-xs">
            <div className="text-slate-500">Name & Credentials</div>
            <input 
              type="text"
              className="text-sm text-slate-900 border border-slate-200 rounded p-2"
              defaultValue="Prof. Dr. Andreas Müller, MD, PhD"
            />
            
            <div className="text-slate-500">Affiliation</div>
            <textarea 
              className="text-sm text-slate-900 border border-slate-200 rounded p-2 min-h-[50px] resize-none"
              defaultValue="University Heart Center Hamburg, Department of Interventional Cardiology&#10;Martinistraße 52, 20246 Hamburg, Germany"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Study Phase</div>
          <input 
            type="text"
            className="text-sm text-slate-900 border border-slate-200 rounded p-2 w-full"
            defaultValue="Pivotal Clinical Investigation (EU MDR Article 62)"
          />
        </div>
      </div>
    ),
    '2': (() => {
      const primaryObjectiveIssue = issues.find(i => i.subsection.includes('Primary Objective'));
      
      return (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Clinical Background</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>Severe aortic stenosis affects 2-7% of individuals over 65 years and carries a grave prognosis without intervention. Transcatheter aortic valve replacement (TAVR) is established as standard of care for high-risk patients and increasingly adopted for intermediate-risk cohorts. Current devices face persistent challenges including paravalvular leak (5-15% moderate or greater), conduction disturbances requiring pacemaker implantation (10-20%), and subclinical leaflet thrombosis.</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Scientific Rationale</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>The CardiaFlow system incorporates three design innovations: an adaptive external sealing skirt to minimize paravalvular regurgitation, a fully repositionable deployment mechanism, and modified frame geometry to reduce conduction system interference. Preclinical data (porcine model, n=24) demonstrated significant reduction in paravalvular leak and 100% successful repositioning. This investigation evaluates whether these design features translate to clinical benefit in the target population.</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              Primary Objective
              {primaryObjectiveIssue && <InlineIssueMarker issue={primaryObjectiveIssue} />}
            </div>
            <div className={`text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed ${primaryObjectiveIssue ? 'bg-amber-50/30 border-amber-500' : ''}`}>
              <p>
                To demonstrate non-inferiority of the CardiaFlow Transcatheter Aortic Valve System compared to an active control (Edwards SAPIEN 3) with respect to the composite rate of all-cause mortality and major adverse cardiovascular events 
                <span className={primaryObjectiveIssue ? 'bg-amber-100 border-b-2 border-amber-500 px-1' : ''}>
                  at 12 months
                </span> {primaryObjectiveIssue && <InlineIssueMarker issue={primaryObjectiveIssue} />} post-implantation in patients with severe symptomatic aortic stenosis at intermediate surgical risk.
              </p>
              {primaryObjectiveIssue && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                  <strong>Warning:</strong> Timepoint should be explicitly stated and aligned with Section 4.8 calculations.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Secondary Objectives</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>To assess device technical success rate, paravalvular regurgitation severity, hemodynamic performance (effective orifice area, mean gradient), functional status improvement (NYHA class, 6-minute walk distance), quality of life (KCCQ), and new permanent pacemaker implantation rate. Endpoint assessments conducted at discharge, 30 days, 6 months, 12 months, and 24 months.</p>
            </div>
          </div>
        </div>
      );
    })(),
    '3': (() => {
      const classificationIssue = issues.find(i => i.subsection.includes('Clinical Context'));
      
      return (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Device Description</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed space-y-2">
              <p>The CardiaFlow Transcatheter Aortic Valve System is a balloon-expandable bioprosthetic valve consisting of a cobalt-chromium frame, bovine pericardial leaflets, and an external adaptive sealing skirt. The device is available in four sizes (23mm, 26mm, 29mm, 32mm) to accommodate annulus diameters 20-30mm. Delivery is via transfemoral approach using a low-profile 14-16F sheath compatible catheter system with integrated repositioning capability.</p>
              <p>Key design features: (1) external sealing skirt with proprietary geometry intended to conform to irregular native annulus anatomy and minimize paravalvular leak, (2) controlled deployment mechanism enabling repositioning prior to final release, (3) modified frame design to reduce depth of implant into left ventricular outflow tract.</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Intended Clinical Use</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>The device is intended for transcatheter replacement of the native aortic valve in patients with severe symptomatic aortic stenosis who are at intermediate or high risk for surgical aortic valve replacement, as determined by a Heart Team assessment. The device is indicated for transfemoral delivery in patients with suitable iliofemoral vascular anatomy.</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              Clinical Context & User Environment
              {classificationIssue && <InlineIssueMarker issue={classificationIssue} />}
            </div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed space-y-2">
              <p>Implantation performed in hybrid operating room or catheterization laboratory equipped for cardiovascular interventions, with cardiac surgery backup immediately available. Procedure conducted by interventional cardiologist or cardiac surgeon with TAVR training and experience. Patients undergo pre-procedural CT angiography for sizing and anatomical assessment, intra-procedural fluoroscopy and echocardiographic guidance, and post-procedural monitoring per institutional TAVR protocols.</p>
              <p className={classificationIssue ? 'bg-amber-50/30 border-l-2 border-amber-500 pl-2 py-1' : ''}>
                <span className={classificationIssue ? 'bg-amber-100 border-b-2 border-amber-500 px-1' : ''}>
                  Device classification: EU MDR Class III, Rule 8 (implantable device in contact with heart).
                </span> {classificationIssue && <InlineIssueMarker issue={classificationIssue} />} Investigation conducted per MDR Article 62.
              </p>
              {classificationIssue && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                  <strong>Warning:</strong> Classification rationale should be expanded with explicit reference to Rule 8 criteria (cardiac contact duration, implantable nature).
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })(),
    '4': (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Study Type</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[80px] leading-relaxed"
            defaultValue="This is a prospective, multi-center, randomized controlled, assessor-blinded non-inferiority trial. The investigational device (CardiaFlow) is compared to an active control (Edwards SAPIEN 3) with established safety and performance data. Study conducted at 8 sites across Germany, France, and the Netherlands. Target enrollment N=120 subjects randomized 2:1 (CardiaFlow:Control)."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Design Rationale</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="Randomized controlled design provides Class I evidence for device performance assessment. Active control comparison is ethically appropriate given availability of proven effective therapy. Non-inferiority margin (10 percentage points) selected based on FDA TAVR guidance and clinical relevance. 2:1 randomization maximizes exposure to investigational device while maintaining adequate control comparator data. Assessor blinding (Clinical Events Committee, Core Laboratory, statisticians) minimizes ascertainment bias."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Study Scope & Duration</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[80px] leading-relaxed"
            defaultValue="Enrollment period: 6 months (Q2-Q4 2026). Per-subject participation: 24 months (screening, index procedure, follow-up at 30 days, 6 months, 12 months primary endpoint, and 24 months extended). Primary endpoint analysis at 12 months. Total study duration approximately 42 months including analysis and reporting. Subjects randomized after eligibility confirmation, informed consent, and Heart Team assessment."
          />
        </div>
      </div>
    ),
    '5': (() => {
      const blockerIssue = issues.find(i => i.severity === 'blocker' && i.subsection.includes('Inclusion Criteria'));
      const exclusionIssue = issues.find(i => i.subsection.includes('Exclusion Criteria'));
      
      return (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              Inclusion Criteria
              {blockerIssue && <InlineIssueMarker issue={blockerIssue} />}
            </div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed space-y-2">
              <p>Subjects must meet all of the following criteria:</p>
              <p className={blockerIssue ? 'bg-red-50/30 border-l-2 border-red-500 pl-2 py-1' : ''}>
                Age ≥65 years. Severe aortic stenosis defined as aortic valve area ≤1.0 cm² or indexed area ≤0.6 cm²/m² with mean gradient ≥40 mmHg or peak velocity ≥4.0 m/s. Symptomatic disease (NYHA class II or III). Intermediate surgical risk (STS-PROM 4-8%). Heart Team consensus for TAVR appropriateness. Adequate iliofemoral access (vessel diameter ≥5.5mm for 14-16F sheath). Aortic annulus 20-27mm by CT. LVEF ≥30%. Life expectancy &gt;24 months. Willing and able to consent and comply with follow-up.
              </p>
              {blockerIssue && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <strong>Blocker:</strong> These criteria may yield insufficient recruitment pool for N=120 target within 6-month timeline. See cross-section consistency issue.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              Exclusion Criteria
              {exclusionIssue && <InlineIssueMarker issue={exclusionIssue} />}
            </div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed space-y-2">
              <p>Subjects meeting any of the following are excluded:</p>
              <p>
                Congenital unicuspid or bicuspid valve. Mixed valve disease (stenosis with &gt;mild regurgitation). Pre-existing prosthetic valve or ring. Severe mitral/tricuspid regurgitation requiring intervention. 
                <span className={exclusionIssue ? 'bg-orange-50/50 border-b-2 border-orange-500 px-1' : ''}>
                  LVEF &lt;30%
                </span> {exclusionIssue && <InlineIssueMarker issue={exclusionIssue} />} or intracardiac mass. Recent MI (&lt;30d) or revascularization (&lt;90d). Stroke/TIA within 90 days or prior intracranial hemorrhage. Active infection or endocarditis. Severe renal impairment (eGFR &lt;20 or dialysis). Severe hepatic disease (Child-Pugh C). Active malignancy on treatment. Pregnancy or unwillingness to use contraception. Concurrent investigational study participation.
              </p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Withdrawal & Discontinuation Rules</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>Subjects may withdraw consent at any time. Investigators may withdraw subjects for safety concerns, protocol non-compliance, or lost to follow-up (≥3 contact attempts). Withdrawals before device implantation replaced; post-implantation withdrawals included in safety analysis. Vital status ascertained via national registries where permitted.</p>
            </div>
          </div>
        </div>
      );
    })(),
    '6': (() => {
      const assessmentTimingIssue = issues.find(i => i.subsection.includes('Assessment Timing'));
      
      return (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              Study Flow
              {assessmentTimingIssue && <InlineIssueMarker issue={assessmentTimingIssue} />}
            </div>
            <div className={`text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed ${assessmentTimingIssue ? 'bg-red-50/30 border-red-500' : ''}`}>
              <p>
                Screening phase (up to 30 days): eligibility assessment, informed consent, clinical evaluation, echocardiography, CT angiography, laboratory tests, Heart Team review. Following randomization, subjects undergo index TAVR procedure per institutional protocol with protocol-specified assessments. Follow-up visits at discharge, 30 days (±7d), 6 months (±14d), 
                <span className={assessmentTimingIssue ? 'bg-red-100 border-b-2 border-red-500 px-1' : ''}>
                  12 months primary endpoint (±14d)
                </span> {assessmentTimingIssue && <InlineIssueMarker issue={assessmentTimingIssue} />}, and 24 months extended (±30d). Unscheduled visits conducted for adverse events or clinical need.
              </p>
              {assessmentTimingIssue && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <strong>Blocker:</strong> Assessment window specification needed. Must define visit window (e.g., 12 months ±14 days) and specify how assessments outside window will be handled in statistical analysis.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Clinical Assessments</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>Clinical assessments: vital signs, NYHA class, 6-minute walk test, adverse event review. Quality of life: Kansas City Cardiomyopathy Questionnaire (KCCQ). ECG monitoring for conduction disturbances; pacemaker implantation documented with indication.</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Imaging & Endpoint Measurements</div>
            <div className="text-xs text-slate-700 border border-slate-200 rounded p-3 leading-relaxed">
              <p>Transthoracic echocardiography with Doppler (EOA, gradients, paravalvular leak grading per VARC-3) reviewed by independent Core Laboratory. Laboratory: hematology, chemistry, renal function. Endpoint adjudication: Clinical Events Committee reviews all deaths, strokes (neurologist-assessed), bleeding, vascular complications, and valve dysfunction.</p>
            </div>
          </div>
        </div>
      );
    })(),
    '7': (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Safety Oversight Structure</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="An independent Data Safety Monitoring Board (DSMB) provides ongoing safety oversight throughout the investigation. The DSMB reviews unblinded safety data at planned intervals (after 30, 60, and 90 subjects enrolled) and evaluates aggregate adverse event rates against pre-specified stopping rules. The DSMB has authority to recommend study modification, suspension, or termination based on safety concerns.&#10;&#10;Site investigators are responsible for continuous safety monitoring of enrolled subjects. The Sponsor maintains a qualified safety team for event assessment, regulatory reporting, and communication with competent authorities and ethics committees."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Event Definitions</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="Adverse Event (AE): Any untoward medical occurrence in a subject. Serious Adverse Event (SAE): Any AE that results in death, life-threatening condition, hospitalization or prolongation of hospitalization, persistent or significant disability, congenital anomaly, or requires intervention to prevent permanent impairment. Device-related event: Any AE where reasonable possibility exists that the investigational device caused or contributed to the event, as determined by the investigator.&#10;&#10;All adverse events graded per CTCAE v5.0 severity scale where applicable. Cardiovascular and procedural events adjudicated using VARC-3 standardized definitions."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Reporting Timelines & Escalation</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="SAEs reported to Sponsor within 24 hours of investigator awareness. Device-related SAEs and unanticipated serious adverse device effects (USADEs) reported to competent authorities and ethics committees within regulatory timelines: death or serious deterioration within 7 calendar days (preliminary) and 15 days (follow-up); other serious events within 15 days.&#10;&#10;All serious events undergo causality assessment by investigator and independent Clinical Events Committee. Sponsor files periodic safety update reports per MDR requirements."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Roles & Responsibilities</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[80px] leading-relaxed"
            defaultValue="Investigators: identify, document, assess causality, report per protocol timelines. Sponsor: maintain safety database, perform causality review, submit regulatory notifications, provide safety updates to sites and DSMB. Clinical Events Committee: adjudicate all serious events using standardized criteria. DSMB: review aggregate safety data and make recommendations regarding study continuation."
          />
        </div>
      </div>
    ),
    '8': (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Analysis Populations</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="Enrolled population: all subjects who sign informed consent. Intent-to-treat (ITT) population: all randomized subjects. Modified ITT (mITT) population: all randomized subjects who undergo device implantation attempt. Per-protocol (PP) population: mITT subjects without major protocol deviations affecting efficacy assessments. Safety population: all subjects who undergo device implantation attempt.&#10;&#10;Primary analysis uses mITT population for both effectiveness and safety. Per-protocol analysis performed as sensitivity analysis for primary endpoint."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Primary Endpoint Analysis</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="The primary endpoint (composite rate of all-cause mortality and major adverse cardiovascular events at 12 months) analyzed using one-sided 97.5% confidence interval for the difference in event rates (CardiaFlow minus Control). Non-inferiority concluded if the upper bound of the confidence interval is less than 10 percentage points. Confidence interval constructed using Miettinen-Nurminen method for risk difference with stratification by site and baseline STS-PROM score.&#10;&#10;If non-inferiority is demonstrated, superiority will be tested using the same confidence interval approach (two-sided alpha 0.05)."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Secondary Endpoints & Subgroup Analyses</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[80px] leading-relaxed"
            defaultValue="Binary endpoints (device success, pacemaker rate, paravalvular leak grade) analyzed using risk differences with 95% confidence intervals. Continuous endpoints (EOA, mean gradient, KCCQ scores) analyzed using analysis of covariance (ANCOVA) with baseline value as covariate. Time-to-event endpoints analyzed using Kaplan-Meier methods and log-rank tests. Hierarchical testing procedure applied to control Type I error for key secondary endpoints."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Sample Size Justification</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[70px] leading-relaxed"
            defaultValue="Sample size of N=120 (80 CardiaFlow, 40 Control) provides 80% power to demonstrate non-inferiority with a one-sided alpha of 0.025, assuming a 15% event rate in both groups, non-inferiority margin of 10 percentage points, and 15% loss to follow-up. Sample size calculation performed using PASS 2023 software."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Missing Data Handling</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[60px] leading-relaxed"
            defaultValue="Missing primary endpoint data handled using multiple imputation under missing-at-random assumption, with sensitivity analyses exploring missing-not-at-random scenarios. Subjects lost to follow-up have vital status ascertained via national registries where permitted. Major protocol deviations reviewed by blinded adjudication committee prior to database lock."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Statistical Analysis Plan Reference</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[50px] leading-relaxed"
            defaultValue="This section provides high-level statistical considerations. Detailed methodology, interim analyses, subgroup analyses, and sensitivity analyses are specified in the Statistical Analysis Plan (SAP), finalized and approved prior to database lock and unblinding."
          />
        </div>
      </div>
    ),
    '9': (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Ethical Framework</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[90px] leading-relaxed"
            defaultValue="This clinical investigation is conducted in accordance with the ethical principles of the Declaration of Helsinki (2013 revision), ISO 14155:2020 standards for clinical investigation of medical devices, and Good Clinical Practice guidelines. All study procedures respect human dignity, autonomy, privacy, and confidentiality. The investigation design ensures favorable risk-benefit balance for participants and scientific validity to generate meaningful clinical evidence."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Informed Consent Process</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="Written informed consent is obtained from each subject prior to any study-specific procedures. The informed consent form describes study purpose, procedures, risks, benefits, alternatives, confidentiality provisions, compensation for injury, voluntary participation, and right to withdraw. Consent is obtained by a qualified investigator or delegated study team member trained in informed consent procedures.&#10;&#10;Subjects receive adequate time to consider participation and opportunity to ask questions. Consent forms are approved by the relevant ethics committee and available in the local language. Subjects receive a signed copy of the consent document."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Ethics Committee Approval & Ongoing Reporting</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[80px] leading-relaxed"
            defaultValue="The protocol, informed consent forms, and subject-facing materials are submitted to and approved by the ethics committee or institutional review board at each participating site prior to study initiation. Substantive protocol amendments require ethics committee approval before implementation. Annual progress reports and safety updates are submitted per ethics committee requirements. Serious adverse events are reported in accordance with local regulations and ethics committee procedures."
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-900 mb-2 uppercase tracking-wide">Regulatory Compliance</div>
          <textarea 
            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 min-h-[100px] leading-relaxed"
            defaultValue="This investigation is conducted per EU Medical Device Regulation (MDR) 2017/745, Article 62 requirements for clinical investigations. The Sponsor has submitted clinical investigation applications to competent authorities in Germany, France, and the Netherlands. Investigation commences only after receipt of approval or implicit authorization per national timelines.&#10;&#10;The study complies with ISO 14155:2020 standards, including requirements for protocol content, investigator qualifications, monitoring, data management, and reporting. The Sponsor maintains regulatory intelligence for any changes to applicable regulations during the investigation conduct. All data are handled in compliance with EU General Data Protection Regulation (GDPR) 2016/679."
          />
        </div>
      </div>
    ),
  };

  return contents[sectionId] || <p className="text-xs text-slate-500 italic">Content not available</p>;
}

function getSectionAuditTrail(sectionId: string): Array<{
  timestamp: string;
  timezone: string;
  user: string;
  userRole: string;
  action: string;
  affectedElement: string;
  details?: string;
  aiAssisted?: boolean;
}> {
  const auditTrails: Record<string, any[]> = {
    '1': [
      {
        timestamp: '2026-02-05 14:32:18',
        timezone: 'CET',
        user: 'Dr. Helena Schmidt',
        userRole: 'VP Clinical Affairs',
        action: 'Section locked for regulatory submission',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Section locked after final approval. Further changes require formal amendment process per protocol change control.',
      },
      {
        timestamp: '2026-02-05 14:30:45',
        timezone: 'CET',
        user: 'Dr. Helena Schmidt',
        userRole: 'VP Clinical Affairs',
        action: 'Section approved',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Final approval granted for Review Cycle 3. All protocol identifiers verified against sponsor records and registry.',
      },
      {
        timestamp: '2026-02-04 16:20:33',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'EudraCT Number',
        details: 'Confirmed EudraCT number 2026-000547-19 obtained from EU Clinical Trials Register. Status updated from "pending" to confirmed.',
      },
      {
        timestamp: '2026-02-04 11:15:22',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Protocol Version & Date',
        details: 'Version updated from 1.2 to 1.3 following incorporation of review comments from Cycle 2.',
      },
      {
        timestamp: '2026-02-03 09:45:10',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Coordinating Investigator',
        details: 'Added full institutional affiliation and contact details for Prof. Dr. Andreas Müller.',
      },
      {
        timestamp: '2026-02-01 10:30:05',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Section created',
        affectedElement: 'Section 4.1 (entire)',
        details: 'Initial section created with administrative identifiers, sponsor information, and coordinating investigator details.',
        aiAssisted: false,
      },
    ],
    '2': [
      {
        timestamp: '2026-02-06 10:30:12',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Warning issue raised',
        affectedElement: 'Primary Objective',
        details: 'Primary objective statement should explicitly reference the 12-month timepoint to align with Section 4.8.',
      },
      {
        timestamp: '2026-02-05 16:18:45',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Primary Objective',
        details: 'Refined primary objective wording to clarify non-inferiority hypothesis and comparator device.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 15:50:22',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'Scientific Rationale',
        details: 'Rationale section appropriately addresses device design features and expected clinical benefits. Preclinical data adequately summarized.',
      },
      {
        timestamp: '2026-02-05 11:20:33',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Content updated',
        affectedElement: 'Clinical Background',
        details: 'Expanded background with current TAVR device performance data and unmet clinical needs.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-03 14:15:08',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.2 (entire)',
        details: 'AI-generated initial draft based on device preclinical data, literature review, and regulatory templates. Content requires human review and approval.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-03 14:10:00',
        timezone: 'CET',
        user: 'Dr. Sarah Chen',
        userRole: 'Principal Investigator',
        action: 'Section created',
        affectedElement: 'Section 4.2 (entire)',
        details: 'Section initialized for rationale and objectives content development.',
      },
    ],
    '3': [
      {
        timestamp: '2026-02-06 12:15:40',
        timezone: 'CET',
        user: 'System Validation',
        userRole: 'Automated Consistency Check',
        action: 'Warning issue raised',
        affectedElement: 'Clinical Context & User Environment',
        details: 'Device classification rationale should be expanded with explicit reference to Rule 8 criteria.',
      },
      {
        timestamp: '2026-02-06 09:45:18',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Device Description',
        details: 'Added detailed specifications for sealing skirt geometry and repositioning mechanism.',
      },
      {
        timestamp: '2026-02-06 08:30:55',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Review comment added',
        affectedElement: 'Intended Clinical Use',
        details: 'Intended use statement aligns with Synopsis and device IFU. Anatomical eligibility criteria appropriately restrictive.',
      },
      {
        timestamp: '2026-02-04 16:45:33',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Intended Clinical Use',
        details: 'Clarified target patient population and anatomical requirements for transfemoral delivery.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-04 10:20:12',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.3 (entire)',
        details: 'AI-generated device description based on technical documentation, IFU, and regulatory classification records.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-04 10:15:00',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Section created',
        affectedElement: 'Section 4.3 (entire)',
        details: 'Section initialized for device description and clinical use documentation.',
      },
    ],
    '5': [
      {
        timestamp: '2026-02-07 14:20:55',
        timezone: 'CET',
        user: 'System Consistency Check',
        userRole: 'Cross-Section Validator',
        action: 'Blocker issue raised',
        affectedElement: 'Inclusion Criteria & Sample Size Alignment',
        details: 'Enrollment feasibility concern: Current criteria may not support N=120 target within 6-month timeline.',
      },
      {
        timestamp: '2026-02-07 15:45:20',
        timezone: 'CET',
        user: 'Dr. Thomas Weber',
        userRole: 'Regulatory Reviewer',
        action: 'Issue raised',
        affectedElement: 'Exclusion Criteria',
        details: 'LVEF <30% threshold should be cross-referenced with device IFU contraindications.',
      },
      {
        timestamp: '2026-02-07 13:55:30',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Inclusion Criteria',
        details: 'Added Heart Team consensus requirement and life expectancy criterion.',
        aiAssisted: false,
      },
      {
        timestamp: '2026-02-07 11:20:18',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Content updated',
        affectedElement: 'Exclusion Criteria',
        details: 'Expanded exclusion criteria to include valve morphology, cardiac contraindications, and comorbidities.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 09:30:45',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.5 (entire)',
        details: 'AI-generated eligibility criteria based on device intended use, anatomical constraints from Section 4.3, and comparable studies.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-05 09:25:00',
        timezone: 'CET',
        user: 'Dr. Marcus Rivera',
        userRole: 'Medical Device Specialist',
        action: 'Section created',
        affectedElement: 'Section 4.5 (entire)',
        details: 'Section initialized for subject eligibility criteria definition.',
      },
    ],
    '6': [
      {
        timestamp: '2026-02-07 17:30:10',
        timezone: 'CET',
        user: 'System Consistency Check',
        userRole: 'Cross-Section Validator',
        action: 'Blocker issue raised',
        affectedElement: 'Assessment Timing & Endpoint Windows',
        details: 'Primary endpoint assessment window not specified. Define visit window for 12-month primary endpoint.',
      },
      {
        timestamp: '2026-02-07 16:10:42',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Content updated',
        affectedElement: 'Imaging & Endpoint Measurements',
        details: 'Added echocardiography Core Laboratory review requirement and VARC-3 grading standards.',
      },
      {
        timestamp: '2026-02-07 14:35:28',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Content updated',
        affectedElement: 'Study Flow',
        details: 'Defined screening window, visit schedule, and follow-up timepoints.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-06 16:20:15',
        timezone: 'CET',
        user: 'System',
        userRole: 'AI Content Generator',
        action: 'AI draft generated',
        affectedElement: 'Section 4.6 (entire)',
        details: 'AI-generated procedures and assessments based on TAVR clinical standards, VARC-3 definitions, and endpoint requirements from Section 4.2.',
        aiAssisted: true,
      },
      {
        timestamp: '2026-02-06 16:15:00',
        timezone: 'CET',
        user: 'Dr. Elena Kowalski',
        userRole: 'Clinical Operations Lead',
        action: 'Section created',
        affectedElement: 'Section 4.6 (entire)',
        details: 'Section initialized for study procedures and clinical assessments documentation.',
      },
    ],
  };

  return auditTrails[sectionId] || [
    {
      timestamp: '2026-02-01 10:00:00',
      timezone: 'CET',
      user: 'Dr. Sarah Chen',
      userRole: 'Principal Investigator',
      action: 'Section created',
      affectedElement: `Section ${sectionId} (entire)`,
      details: 'Section initialized for protocol development.',
    },
  ];
}
