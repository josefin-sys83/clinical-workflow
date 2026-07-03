import React, { useState } from 'react';
import { AlertTriangle, FileText, Clock, BookOpen, ChevronRight, X } from 'lucide-react';

type RightPanelTab = 'issues' | 'evidence' | 'audit' | 'guidance';

interface Issue {
  id: string;
  severity: 'Blocker' | 'High' | 'Info';
  section: string;
  description: string;
  suggestion?: string;
}

interface EvidenceItem {
  id: string;
  source: string;
  snippet: string;
  page: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  section?: string;
}

interface RightPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function RightPanel({ isCollapsed, onToggleCollapse }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('issues');

  const issues: Issue[] = [
    {
      id: 'i1',
      severity: 'High',
      section: '4.5 Study Endpoints',
      description: 'Primary endpoint definition conflicts with synopsis',
      suggestion: 'Align endpoint timing (30 days vs. 6 months)'
    },
    {
      id: 'i2',
      severity: 'Info',
      section: '4.8 Data Handling',
      description: 'GDPR retention period not specified',
      suggestion: 'Add retention period per EU MDR requirements'
    }
  ];

  const evidence: EvidenceItem[] = [
    {
      id: 'e1',
      source: 'Pre-clinical Study Report TAVR-2024-PC',
      snippet: '40% reduction in paravalvular leak compared to control devices...',
      page: 'p. 34'
    },
    {
      id: 'e2',
      source: 'ISO 14155:2020 Clinical Investigation Guidance',
      snippet: 'Risk-benefit analysis must consider device-specific risks...',
      page: 'Section 7.2'
    }
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'a1',
      timestamp: 'Feb 8, 2026 09:15',
      user: 'Dr. Emma Weber',
      action: 'SECTION_EDITED',
      section: '4.2 Study Rationale'
    },
    {
      id: 'a2',
      timestamp: 'Feb 8, 2026 09:12',
      user: 'System',
      action: 'CONFLICT_DETECTED',
      section: '4.5 Study Endpoints'
    },
    {
      id: 'a3',
      timestamp: 'Feb 7, 2026 16:45',
      user: 'Lisa Schmidt',
      action: 'SECTION_COMPLETED',
      section: '4.3 Device Description'
    }
  ];

  if (isCollapsed) {
    return (
      <div className="w-12 bg-slate-50 border-l border-slate-300 flex flex-col items-center pt-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-slate-200 rounded transition-colors"
          title="Expand panel"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 rotate-180" />
        </button>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Blocker': return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'High': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Info': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="w-80 bg-slate-50 border-l border-slate-300 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-300 bg-white">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'issues'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Issues
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'evidence'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Evidence
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'audit'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Audit
        </button>
        <button
          onClick={() => setActiveTab('guidance')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'guidance'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Guidance
        </button>
        <button
          onClick={onToggleCollapse}
          className="px-2 py-2.5 hover:bg-slate-100 transition-colors border-l border-slate-300"
          title="Collapse panel"
        >
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'issues' && (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 bg-white border border-slate-300 rounded text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
                <div className="font-medium text-slate-900">{issue.section}</div>
                <div className="text-slate-700">{issue.description}</div>
                {issue.suggestion && (
                  <div className="text-slate-600 italic">
                    Suggestion: {issue.suggestion}
                  </div>
                )}
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Go to section →
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-3">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-300 rounded text-xs space-y-2"
              >
                <div className="font-medium text-slate-900">{item.source}</div>
                <div className="text-slate-700 italic">"{item.snippet}"</div>
                <div className="text-slate-600">{item.page}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-white border border-slate-300 rounded text-xs space-y-1"
              >
                <div className="font-medium text-slate-900">{event.action}</div>
                <div className="text-slate-700">{event.user}</div>
                {event.section && (
                  <div className="text-slate-600">{event.section}</div>
                )}
                <div className="text-slate-500">{event.timestamp}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'guidance' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-700 leading-relaxed space-y-3">
              <div className="font-semibold text-slate-900">ISO 14155:2020 Requirements</div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Protocol Structure</div>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Clear objectives and endpoints</li>
                  <li className="list-disc">Device description with version</li>
                  <li className="list-disc">Risk-benefit assessment</li>
                  <li className="list-disc">Safety reporting pathways</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Required Sections</div>
                <ul className="space-y-1 ml-4">
                  <li className="list-disc">Study population criteria</li>
                  <li className="list-disc">Informed consent process</li>
                  <li className="list-disc">Data handling and confidentiality</li>
                  <li className="list-disc">Monitoring approach</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
