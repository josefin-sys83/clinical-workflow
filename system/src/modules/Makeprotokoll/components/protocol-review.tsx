import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle, Circle, FileText, AlertTriangle, MessageSquare, Eye, Clock, User2 } from 'lucide-react';

interface Section {
  id: string;
  number: string;
  title: string;
  status: 'Complete' | 'Draft' | 'In Progress';
  owner: string;
  ownerRole: string;
  requiredApproval: string;
  requiredApprovalRole: string;
  lastUpdated: string;
  commentCount: number;
  isExpanded: boolean;
  hasConflict?: boolean;
  conflictMessage?: string;
  guidanceItems?: string[];
}

interface Issue {
  id: string;
  severity: 'Blocker' | 'High' | 'Medium';
  title: string;
  description: string;
  synopsisRef: string;
  protocolRef: string;
}

export function ProtocolReview() {
  const [sections, setSections] = useState<Section[]>([
    {
      id: 's1',
      number: '4.1',
      title: 'Protocol Overview',
      status: 'Complete',
      owner: 'Dr. Sarah Chen',
      ownerRole: 'Project Manager',
      requiredApproval: 'Dr. Sarah Chen',
      requiredApprovalRole: 'Project Manager',
      lastUpdated: 'Feb 3, 2026 at 14:22 CET',
      commentCount: 0,
      isExpanded: false
    },
    {
      id: 's2',
      number: '4.2',
      title: 'Study Rationale & Objectives',
      status: 'Draft',
      owner: 'Emma Rodriguez',
      ownerRole: 'Medical Writer',
      requiredApproval: 'Dr. James Patterson',
      requiredApprovalRole: 'Clinical Lead',
      lastUpdated: 'Feb 4, 2026 at 09:23 CET',
      commentCount: 3,
      isExpanded: true,
      hasConflict: true,
      conflictMessage: 'Resolve conflicts before marking complete',
      guidanceItems: [
        'Establish the scientific foundation and clinical objectives for the investigation',
        'Scientific rationale for the clinical investigation',
        'Primary and secondary objectives clearly stated'
      ]
    }
  ]);

  const [activeIssueTab, setActiveIssueTab] = useState<'blockers' | 'all'>('blockers');
  const [bannerExpanded, setBannerExpanded] = useState(false);

  const issues: Issue[] = [
    {
      id: 'i1',
      severity: 'Blocker',
      title: 'Primary endpoint definition differs from Synopsis',
      description: 'Protocol § 4.2 defines "composite of all-cause mortality and MACE" but Synopsis § 2.3 specified "all-cause mortality at 30 days"',
      synopsisRef: '§ 2.3',
      protocolRef: '4.4.2'
    },
    {
      id: 'i2',
      severity: 'High',
      title: 'DSMB stopping criteria not specified',
      description: 'Section references DSMB charter but stopping rules not included in protocol per ISO 14155:2020',
      synopsisRef: '—',
      protocolRef: '4.4.7'
    }
  ];

  const blockerIssues = issues.filter(i => i.severity === 'Blocker');
  const displayIssues = activeIssueTab === 'blockers' ? blockerIssues : issues;

  const toggleSection = (id: string) => {
    setSections(sections.map(s =>
      s.id === id ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-300 bg-white">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            TAVR-EVOLVE-EU Clinical Investigation Protocol
          </h1>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
            <span>Protocol v4.0.1</span>
            <span>•</span>
            <span>EU MDR 2017/745</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>Last modified: Feb 5, 2026 at 14:23 CET</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs">
            <User2 className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-700">Active reviewers:</span>
            <span className="font-semibold text-slate-900">3</span>
          </div>
          <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
            Content Review
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-amber-900">4 open issues</span>
          </div>
          <button className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            Draft
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-56 bg-white border-r border-slate-300 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {/* Project Info */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1.5">PROJECT</div>
              <div className="text-sm font-semibold text-slate-900">TAVR-EVOLVE-EU</div>
              <div className="text-xs text-slate-600">Protocol v4.0.1</div>
            </div>

            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <div className="text-xs font-semibold text-green-900">Audit logging:</div>
              </div>
              <div className="text-xs text-green-700">Active</div>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <div className="text-xs font-semibold text-slate-900">Editing</div>
              </div>
              <div className="text-xs text-slate-600">Medical Writer</div>
            </div>

            <div className="mb-1 text-xs text-slate-700">
              Review content and mark sections complete
            </div>

            <div className="h-px bg-slate-300 my-4" />

            {/* Navigation */}
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Project Setup</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Synopsis</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Scope & Intended Use</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Standards & Requirements</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Objectives & Endpoints</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 font-medium">
                <Circle className="w-4 h-4 text-blue-600 fill-blue-600 flex-shrink-0" />
                <span>Protocol Development</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                <Circle className="w-4 h-4 flex-shrink-0" />
                <span>Statistical Analysis Plan</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                <Circle className="w-4 h-4 flex-shrink-0" />
                <span>Export & Submission</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="border-t border-slate-300 p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-3">QUICK STATS</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Completion</span>
                <span className="font-semibold text-slate-900">73%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Open issues</span>
                <span className="font-semibold text-slate-900">4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Blockers</span>
                <span className="font-semibold text-red-600">1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Clinical Investigation Protocol
                </h2>
                <div className="text-sm text-slate-600">
                  Sections approved: <span className="font-semibold text-slate-900">0/9</span>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                Edit mode — Content creation and editing
              </div>
            </div>

            {/* Blocking Issues Banner */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <button
                onClick={() => setBannerExpanded(!bannerExpanded)}
                className="w-full flex items-start gap-3 text-left"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {bannerExpanded ? (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-900 mb-1">
                    You must resolve 2 blocking issues before review can begin
                  </div>
                  {!bannerExpanded && (
                    <div className="text-xs text-blue-700">
                      Synopsis conflicts and missing required data prevent regulatory review. Each blocker must be addressed and documented before Review can start.
                    </div>
                  )}
                </div>
              </button>
              {bannerExpanded && (
                <div className="mt-3 pl-7 space-y-2">
                  <div className="text-xs text-blue-700">
                    Synopsis conflicts and missing required data prevent regulatory review. Each blocker must be addressed and documented before Review can start.
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <User2 className="w-3 h-3" />
                    <span>Responsible: Clinical Lead</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="bg-white border border-slate-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      {section.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {section.number} {section.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.commentCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-700 font-medium">{section.commentCount} comments</span>
                        </div>
                      )}
                      <div className={`px-3 py-1 rounded text-xs font-medium ${
                        section.status === 'Complete'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {section.status}
                      </div>
                    </div>
                  </button>

                  {section.isExpanded && (
                    <div className="border-t border-slate-200 p-6 bg-white">
                      <div className="mb-4">
                        <div className="text-xs text-slate-700 mb-2">
                          Owner: <span className="font-medium text-slate-900">{section.owner}</span>{' '}
                          <span className="text-slate-500">({section.ownerRole})</span>
                        </div>
                        <div className="text-xs text-slate-700 mb-2">
                          Required approval: <span className="font-medium text-slate-900">{section.requiredApproval}</span>{' '}
                          <span className="text-slate-500">({section.requiredApprovalRole})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>Last updated: {section.lastUpdated}</span>
                          <button className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
                            <Eye className="w-3 h-3" />
                            View audit trail
                          </button>
                        </div>
                      </div>

                      {section.hasConflict && (
                        <div className="mb-4 flex items-center gap-2 text-xs">
                          <ChevronRight className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-red-600 font-medium">{section.conflictMessage}</span>
                        </div>
                      )}

                      {section.guidanceItems && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-slate-600" />
                            <div className="text-xs font-semibold text-slate-900 uppercase">
                              WHAT THIS SECTION MUST INCLUDE
                            </div>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-700">
                            {section.guidanceItems.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-slate-500 mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Panel */}
        <div className="w-80 bg-white border-l border-slate-300 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Issues & Consistency</h3>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveIssueTab('blockers')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                  activeIssueTab === 'blockers'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Blockers ({blockerIssues.length})
              </button>
              <button
                onClick={() => setActiveIssueTab('all')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                  activeIssueTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({issues.length})
              </button>
            </div>

            {/* Issues */}
            <div className="space-y-4">
              {displayIssues.map((issue) => (
                <div key={issue.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    {issue.title}
                  </div>
                  <div className="text-xs text-slate-700 mb-3 leading-relaxed">
                    {issue.description}
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="text-xs text-slate-600">
                      <span className="inline-block w-1 h-1 bg-slate-600 rounded-full mr-2" />
                      {issue.protocolRef}
                    </div>
                    {issue.synopsisRef !== '—' && (
                      <div className="text-xs text-slate-600">
                        <span className="inline-block w-1 h-1 bg-slate-600 rounded-full mr-2" />
                        {issue.synopsisRef}
                      </div>
                    )}
                  </div>
                  <button className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Review Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
