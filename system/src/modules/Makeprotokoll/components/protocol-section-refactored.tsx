import React, { useState } from 'react';
import { Info, AlertCircle, CheckCircle2, Clock, MessageSquare, History, ChevronDown, User, Lock, UserCheck, FileCheck, AlertTriangle, XCircle, Ban } from 'lucide-react';
import { AuditTrailModal } from './audit-trail-modal';
import { InlineIssueMarker } from './inline-issue-marker';

interface ProtocolIssue {
  id: string;
  severity: 'blocker' | 'warning';
  subsection: string;
  description: string;
  reference?: string;
  raisedBy: string;
  raisedDate: string;
  status: string;
}

interface ProtocolSectionData {
  id: string;
  number: string;
  title: string;
  status: string;
  owner: string;
  ownerRole?: string;
  updated: string;
  comments: number;
  aiGenerated: boolean;
  reviewStatus: string | null;
  locked?: boolean;
  reviewCycle?: number;
  reviewer?: string;
  approver?: string;
  approverRole?: string;
  issues?: ProtocolIssue[];
}

interface ProtocolSectionProps {
  section: ProtocolSectionData;
  isExpanded: boolean;
  onToggle: () => void;
  isHighlighted?: boolean;
}

export const ProtocolSectionRefactored = React.forwardRef<HTMLDivElement, ProtocolSectionProps>(
  ({ section, isExpanded, onToggle, isHighlighted }, ref) => {
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);

  const isApproved = section.status === 'complete' && !section.locked;
  const isLocked = section.locked;

  const openIssues = section.issues?.filter(issue => issue.status === 'open') || [];
  const blockerCount = openIssues.filter(i => i.severity === 'blocker').length;
  const warningCount = openIssues.filter(i => i.severity === 'warning').length;
  const isBlocked = blockerCount > 0;
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
      {/* ============================================ */}
      {/* ZONE 1: ORIENTATION - Always Visible */}
      {/* ============================================ */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-slate-900">
                Section {section.number}: {section.title}
              </h3>
              
              {/* Status Badges - Compact */}
              {section.locked && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
              {isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Approved
                </span>
              )}
              {!isApproved && !section.locked && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Draft
                </span>
              )}
            </div>
            
            {/* Metadata - Single line, compact */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{section.owner}</span>
              </div>
              {section.reviewCycle && (
                <div className="flex items-center gap-1">
                  <span>Cycle {section.reviewCycle}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{section.comments} comments</span>
              </div>
              {totalIssues > 0 && (
                <div className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{totalIssues} issue{totalIssues > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            <ChevronDown 
              className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 space-y-6">
            {/* ============================================ */}
            {/* ZONE 2: GUIDANCE & FEEDBACK - Collapsed by default */}
            {/* ============================================ */}
            
            {/* Compact Blocker/Warning Summary Banner - Only if critical */}
            {isBlocked && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900 mb-1">
                      {blockerCount} blocker{blockerCount > 1 ? 's' : ''} blocking completion
                    </div>
                    <p className="text-xs text-red-700">
                      Critical issues must be resolved before this section can be approved. See details below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="p-3 bg-slate-50 border-l-4 border-slate-400 rounded">
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      Locked Section
                    </div>
                    <p className="text-xs text-slate-600">
                      Amendments require formal protocol change control and regulatory approval.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Notice - Compact, only if relevant */}
            {section.aiGenerated && !isApproved && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      AI-generated draft
                    </div>
                    <p className="text-xs text-blue-700">
                      Review carefully and edit as needed. All changes are logged.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Issues - Collapsed by default, show summary */}
            {openIssues.length > 0 && (
              <div className="border border-slate-200 rounded overflow-hidden">
                <button
                  onClick={() => setIssuesExpanded(!issuesExpanded)}
                  className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`w-4 h-4 ${isBlocked ? 'text-red-600' : 'text-amber-600'}`} />
                      <span className="text-sm font-medium text-slate-900">
                        {totalIssues} issue{totalIssues > 1 ? 's' : ''} requiring attention
                      </span>
                      {blockerCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                          {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 text-slate-400 transition-transform ${issuesExpanded ? '' : '-rotate-90'}`}
                    />
                  </div>
                </button>
                
                {issuesExpanded && (
                  <div className="p-4 pt-0 space-y-3 bg-slate-50">
                    {openIssues.map((issue) => (
                      <div 
                        key={issue.id}
                        className={`border-l-4 rounded p-3 bg-white ${
                          issue.severity === 'blocker' 
                            ? 'border-red-500' 
                            : 'border-amber-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {issue.severity === 'blocker' && <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                          {issue.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                          
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
                              <div className="text-xs text-slate-600 italic">
                                Reference: {issue.reference}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="p-3 bg-blue-100 border border-blue-300 rounded">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <span className="font-medium">How to resolve: </span>
                          Edit the content below. Issues are flagged as "potentially resolved" and confirmed by reviewer.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* What this section must include - Collapsed by default */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <button
                onClick={() => setGuidanceExpanded(!guidanceExpanded)}
                className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900">
                      What this section must include
                    </span>
                    <span className="text-xs text-slate-500">ISO 14155:2020</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform ${guidanceExpanded ? '' : '-rotate-90'}`}
                  />
                </div>
              </button>
              
              {guidanceExpanded && (
                <div className="p-4 pt-0 space-y-3 bg-slate-50">
                  <div className="p-3 bg-white border border-slate-200 rounded text-xs">
                    <div className="text-xs text-slate-600">
                      Regulatory requirements and guidance content here...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Roles & Approval - Collapsed by default */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <button
                onClick={() => setRolesExpanded(!rolesExpanded)}
                className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900">
                      Roles & approval workflow
                    </span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform ${rolesExpanded ? '' : '-rotate-90'}`}
                  />
                </div>
              </button>
              
              {rolesExpanded && (
                <div className="p-4 pt-0 bg-slate-50">
                  <div className="grid grid-cols-3 gap-6">
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
                    
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Approved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">Draft</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Last updated: {section.updated}
                    </div>
                    <button 
                      onClick={() => setAuditTrailOpen(true)}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <History className="w-3 h-3" />
                      View audit trail
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* ZONE 3: WORK AREA - Primary Focus */}
            {/* ============================================ */}
            
            {/* Purpose - Compact, always visible for context */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-900">Purpose: </span>
                  <span className="text-xs text-slate-700">
                    {section.id === '5' 
                      ? 'Specify subject eligibility criteria that balance scientific objectives, safety, and enrollment feasibility.'
                      : 'Section purpose goes here...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Protocol Content - Clean, focused work area */}
            <div className="border-2 border-slate-300 rounded">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-300">
                <div className="text-xs font-medium text-slate-700">Protocol Content</div>
              </div>
              <div className="p-4 bg-white">
                <div className="text-sm text-slate-700">
                  Content for section {section.number} with inline issue markers would appear here...
                </div>
              </div>
            </div>

            {/* Section Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {section.ownerRole || 'Owner'} can edit content • Reviewers can comment and raise issues
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors">
                  Request Changes
                </button>
                {!isApproved && (
                  <button className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Section
                  </button>
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
        entries={[]}
      />
    </div>
  );
});

ProtocolSectionRefactored.displayName = 'ProtocolSectionRefactored';
