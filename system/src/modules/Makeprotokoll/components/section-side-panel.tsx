import React, { useState } from 'react';
import { X, MessageSquare, AlertTriangle, Clock, CheckCircle, Edit, Lock, Unlock, User } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  text: string;
  status: 'open' | 'resolved';
  replies?: Comment[];
}

interface Issue {
  id: string;
  type: 'conflict' | 'missing' | 'clarification';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details?: string;
}

interface SectionSidePanelProps {
  sectionTitle: string;
  sectionNumber: string;
  onClose: () => void;
}

export function SectionSidePanel({ sectionTitle, sectionNumber, onClose }: SectionSidePanelProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'issues' | 'audit'>('comments');

  // Mock data - would come from backend in production
  const comments: Comment[] = [
    {
      id: 'c1',
      author: 'Anna Schmidt',
      role: 'Regulatory Affairs',
      timestamp: 'Feb 4, 2026 at 14:22 CET',
      text: 'Please clarify if the primary endpoint applies to both EU MDR and FDA IDE pathways or if separate endpoints are needed.',
      status: 'open',
      replies: [
        {
          id: 'c1-r1',
          author: 'Dr. James Patterson',
          role: 'Clinical Lead',
          timestamp: 'Feb 4, 2026 at 16:15 CET',
          text: 'Good point. The primary endpoint is aligned with EU MDR requirements. For FDA, we will add all-cause mortality as a secondary endpoint.',
          status: 'open'
        }
      ]
    },
    {
      id: 'c2',
      author: 'Dr. Michael Zhang',
      role: 'Biostatistician',
      timestamp: 'Feb 3, 2026 at 11:30 CET',
      text: 'The sample size calculation references a 15% performance goal. Can we add a citation to the source document?',
      status: 'resolved'
    }
  ];

  const issues: Issue[] = [
    {
      id: 'i1',
      type: 'conflict',
      severity: 'blocker',
      title: 'Endpoint definition differs from Synopsis',
      description: 'Protocol defines "all-cause mortality" but Synopsis § 2.3 specifies "cardiovascular mortality"',
      location: 'Primary Objective paragraph'
    },
    {
      id: 'i2',
      type: 'missing',
      severity: 'high',
      title: 'VARC-3 criteria reference missing',
      description: 'Text mentions VARC-3 but no citation provided',
      location: 'Secondary Objectives paragraph'
    }
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'a1',
      timestamp: 'Feb 4, 2026 at 09:23 CET',
      user: 'Emma Rodriguez',
      role: 'Medical Writer',
      action: 'Edited content',
      details: 'Updated primary objective definition'
    },
    {
      id: 'a2',
      timestamp: 'Feb 4, 2026 at 08:15 CET',
      user: 'Dr. James Patterson',
      role: 'Clinical Lead',
      action: 'Added comment',
      details: 'Requested clarification on endpoint definition'
    },
    {
      id: 'a3',
      timestamp: 'Feb 3, 2026 at 14:22 CET',
      user: 'System (AI)',
      role: 'Automated',
      action: 'Generated initial draft',
      details: 'AI pre-filled content based on Synopsis § 2.1 and Gate 3 Intended Use'
    },
    {
      id: 'a4',
      timestamp: 'Feb 3, 2026 at 14:20 CET',
      user: 'Dr. Sarah Chen',
      role: 'Project Manager',
      action: 'Section created',
      details: 'Initialized section structure'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'conflict':
        return '🔴';
      case 'missing':
        return '🟠';
      case 'clarification':
        return '🟡';
      default:
        return '⚪';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-slate-300 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              Section {sectionNumber}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {sectionTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'comments'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments ({comments.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'issues'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Issues ({issues.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Audit</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Discussion</h3>
              <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Add Comment
              </button>
            </div>

            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                      {comment.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-900">{comment.author}</span>
                        <span className="text-xs text-slate-500">{comment.role}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-1">{comment.timestamp}</p>
                      <p className="text-sm text-slate-900 leading-relaxed mt-2">
                        {comment.text}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Reply
                        </button>
                        {comment.status === 'open' ? (
                          <button className="text-xs text-slate-600 hover:text-slate-700 font-medium">
                            Mark as Resolved
                          </button>
                        ) : (
                          <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.map((reply) => (
                  <div key={reply.id} className="ml-6 p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-semibold">
                        {reply.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-900">{reply.author}</span>
                          <span className="text-xs text-slate-500">{reply.role}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{reply.timestamp}</p>
                        <p className="text-sm text-slate-900 leading-relaxed mt-2">
                          {reply.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Detected Issues</h3>
              <p className="text-xs text-slate-600">
                AI-detected conflicts and missing information in this section
              </p>
            </div>

            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 border rounded-lg ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{getIssueIcon(issue.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold border rounded uppercase ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs font-medium text-slate-500 uppercase">
                        {issue.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 mb-1">
                      {issue.title}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed mb-2">
                      {issue.description}
                    </p>
                    <div className="text-xs text-slate-600">
                      Location: <span className="font-medium">{issue.location}</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-2 px-3 py-1.5 text-xs bg-white border border-current rounded hover:bg-slate-50 transition-colors font-medium">
                  Resolve Issue
                </button>
              </div>
            ))}

            {issues.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                No issues detected in this section
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Audit Trail</h3>
              <p className="text-xs text-slate-600">
                Complete history of all actions on this section
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

              {/* Events */}
              <div className="space-y-4">
                {auditEvents.map((event, index) => (
                  <div key={event.id} className="relative pl-9">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 w-[30px] h-[30px] bg-white border-2 border-slate-300 rounded-full flex items-center justify-center">
                      {event.action.includes('Edit') && <Edit className="w-3.5 h-3.5 text-slate-600" />}
                      {event.action.includes('comment') && <MessageSquare className="w-3.5 h-3.5 text-blue-600" />}
                      {event.action.includes('Generated') && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                      {event.action.includes('created') && <User className="w-3.5 h-3.5 text-green-600" />}
                      {event.action.includes('Approved') && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                      {event.action.includes('Locked') && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                      {event.action.includes('Unlocked') && <Unlock className="w-3.5 h-3.5 text-amber-600" />}
                    </div>

                    <div className="pb-4">
                      <div className="text-xs text-slate-500 mb-1">
                        {event.timestamp}
                      </div>
                      <div className="text-sm font-medium text-slate-900 mb-0.5">
                        {event.action}
                      </div>
                      <div className="text-xs text-slate-600 mb-1">
                        by <span className="font-medium">{event.user}</span> ({event.role})
                      </div>
                      {event.details && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {event.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Last modified:</span>
            <span className="font-medium text-slate-900">Feb 4, 2026 at 09:23 CET</span>
          </div>
          <div className="flex justify-between">
            <span>Modified by:</span>
            <span className="font-medium text-slate-900">Emma Rodriguez (Medical Writer)</span>
          </div>
        </div>
      </div>
    </div>
  );
}