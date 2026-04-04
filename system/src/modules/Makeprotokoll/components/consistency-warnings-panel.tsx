import React from 'react';
import { AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react';

interface ConsistencyWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedSections: string[];
  sourceSection: string;
  actionRequired: boolean;
}

const warnings: ConsistencyWarning[] = [
  {
    id: 'W1',
    severity: 'critical',
    title: 'Population description mismatch',
    description: 'Study population in Section 4.4 (Study Design) differs from approved Synopsis definition',
    affectedSections: ['4.4 Study Design', '4.5 Subject Eligibility'],
    sourceSection: 'Synopsis § 2.3',
    actionRequired: true
  },
  {
    id: 'W2',
    severity: 'warning',
    title: 'Device indication phrasing inconsistent',
    description: 'Device indication in Section 4.3 uses different terminology than locked Gate 1 Scope',
    affectedSections: ['4.3 Device Description'],
    sourceSection: 'Gate 1 – Scope & Intended Use',
    actionRequired: false
  },
  {
    id: 'W3',
    severity: 'info',
    title: 'Timeline alignment check',
    description: 'Visit schedule duration (18 months) should be verified against Synopsis timeline (12 months)',
    affectedSections: ['4.6 Study Procedures'],
    sourceSection: 'Synopsis § 4.1',
    actionRequired: false
  }
];

export function ConsistencyWarningsPanel() {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const criticalCount = warnings.filter(w => w.severity === 'critical').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Consistency Checks</h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
              {warningCount} Warnings
            </span>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-900">
          System continuously evaluates consistency across Synopsis, Protocol sections, and locked gates. Review and resolve Warnings before locking.
        </p>
      </div>

      {/* Warnings List */}
      <div className="space-y-3">
        {warnings.map((warning) => (
          <div
            key={warning.id}
            className={`p-3 border rounded-lg ${getSeverityStyles(warning.severity)} bg-opacity-50`}
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                warning.severity === 'critical' ? 'text-red-700' :
                warning.severity === 'warning' ? 'text-amber-700' :
                'text-blue-700'
              }`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 mb-1">{warning.title}</div>
                <p className="text-xs text-slate-700 mb-2">{warning.description}</p>
                
                {/* Affected Sections */}
                <div className="mb-2">
                  <div className="text-xs font-medium text-slate-700 mb-1">Affected sections:</div>
                  <div className="flex flex-wrap gap-1">
                    {warning.affectedSections.map((section, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-white text-slate-700 text-xs rounded border border-slate-300">
                        {section}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Source Reference */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                  <ExternalLink className="w-3 h-3" />
                  <span>Source: {warning.sourceSection}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                    Review Inconsistency
                  </button>
                  {warning.actionRequired && (
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      Resolve Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>Total inconsistencies:</span>
            <span className="font-medium">{warnings.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Must resolve before lock:</span>
            <span className="font-medium text-red-700">{warnings.filter(w => w.actionRequired).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}