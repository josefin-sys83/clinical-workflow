import React, { useState } from 'react';
import { Shield, Eye, ChevronRight, Clock, User, Sparkles, Lock, FileEdit, CheckCircle, AlertTriangle } from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  section?: string;
  type: 'human' | 'ai' | 'system';
  details?: string;
}

const recentEvents: AuditEvent[] = [
  {
    id: 'A1',
    timestamp: '2026-02-04 09:23:14 CET',
    user: 'Emma Rodriguez',
    role: 'Medical Writer',
    action: 'Edited Study Rationale section',
    section: '4.2',
    type: 'human',
    details: 'Modified background text to align with updated clinical evidence'
  },
  {
    id: 'A2',
    timestamp: '2026-02-04 09:15:32 CET',
    user: 'AI System',
    role: 'System',
    action: 'Generated consistency warning',
    section: '4.4',
    type: 'ai',
    details: 'Detected inconsistency between Synopsis and Study Design population description'
  },
  {
    id: 'A3',
    timestamp: '2026-02-04 08:47:21 CET',
    user: 'Anna Schmidt',
    role: 'Regulatory Affairs',
    action: 'Approved Device Description section',
    section: '4.3',
    type: 'human'
  },
  {
    id: 'A4',
    timestamp: '2026-02-03 16:45:08 CET',
    user: 'Dr. Sarah Chen',
    role: 'Project Manager',
    action: 'Locked Protocol Overview section',
    section: '4.1',
    type: 'human'
  },
  {
    id: 'A5',
    timestamp: '2026-02-03 14:22:43 CET',
    user: 'AI System',
    role: 'System',
    action: 'Generated draft content for Study Design',
    section: '4.4',
    type: 'ai',
    details: 'Content derived from locked Synopsis and Objectives'
  }
];

export function AuditTrailPanel() {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'human':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'system':
        return <Shield className="w-4 h-4 text-slate-600" />;
      default:
        return <FileEdit className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Locked')) return <Lock className="w-3 h-3" />;
    if (action.includes('Approved')) return <CheckCircle className="w-3 h-3" />;
    if (action.includes('warning')) return <AlertTriangle className="w-3 h-3" />;
    if (action.includes('Edited')) return <FileEdit className="w-3 h-3" />;
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Audit & Traceability</h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs rounded border border-green-200">
          <Shield className="w-3 h-3" />
          <span className="font-medium">Active</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          All actions, decisions, approvals, and AI-generated content are logged with timestamp, user, role, and rationale.
        </p>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <div className="text-xs font-medium text-slate-700 mb-2">Recent Activity</div>
        {recentEvents.slice(0, showFullHistory ? recentEvents.length : 5).map((event) => (
          <div
            key={event.id}
            className="p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex-shrink-0">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5 mb-1">
                  {getActionIcon(event.action)}
                  <div className="text-sm text-slate-900 font-medium">{event.action}</div>
                </div>
                {event.section && (
                  <div className="text-xs text-slate-600 mb-1">Section {event.section}</div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium">{event.user}</span>
                  <span>·</span>
                  <span>{event.role}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{event.timestamp}</span>
                </div>
                {event.details && (
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-700 italic">
                    {event.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Full History Button */}
      <button 
        onClick={() => setShowFullHistory(!showFullHistory)}
        className="mt-3 w-full px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Eye className="w-4 h-4" />
        {showFullHistory ? 'Show Less' : 'View Full Audit History'}
      </button>

      {/* Export Options */}
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs font-medium text-slate-700 mb-2">Compliance Export</div>
        <button className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors">
          Export Audit Trail (PDF)
        </button>
      </div>
    </div>
  );
}
