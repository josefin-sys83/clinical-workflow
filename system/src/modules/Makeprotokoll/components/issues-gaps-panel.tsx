import React from 'react';
import { AlertTriangle, AlertCircle, Info, User } from 'lucide-react';

interface Issue {
  id: string;
  type: 'conflict' | 'missing' | 'regulatory';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedSection: string;
  owner: string;
  ownerRole: string;
  suggestedResolution?: string;
  blocksApproval: boolean;
}

const issues: Issue[] = [
  {
    id: 'I1',
    type: 'conflict',
    severity: 'high',
    title: 'Study design differs from approved Synopsis',
    description: 'Protocol Section 4.6 describes study as "single-arm" but approved Synopsis defines "randomized controlled design"',
    affectedSection: '4.6 Study Design',
    owner: 'Emma Rodriguez',
    ownerRole: 'Medical Writer',
    suggestedResolution: 'Align Protocol Section 4.6 with locked Synopsis § 3.1 definition',
    blocksApproval: true
  },
  {
    id: 'I2',
    type: 'missing',
    severity: 'high',
    title: 'Sample size rationale not described',
    description: 'Study design section references sample size but no statistical rationale provided',
    affectedSection: '4.6 Study Design',
    owner: 'Dr. Michael Zhang',
    ownerRole: 'Biostatistician',
    suggestedResolution: 'Add sample size calculation with power, alpha, and effect size assumptions',
    blocksApproval: true
  },
  {
    id: 'I3',
    type: 'regulatory',
    severity: 'medium',
    title: 'Biocompatibility reference missing for implantable device',
    description: 'MDR Annex I requires biocompatibility documentation for Class III implantable devices',
    affectedSection: '4.4 Device Description',
    owner: 'Anna Schmidt',
    ownerRole: 'Regulatory Affairs',
    suggestedResolution: 'Add reference to ISO 10993 biocompatibility testing in Device Description section',
    blocksApproval: false
  },
  {
    id: 'I4',
    type: 'missing',
    severity: 'medium',
    title: 'DSMB charter not referenced',
    description: 'High-risk pivotal study typically requires Data Safety Monitoring Board with documented charter',
    affectedSection: '4.9 Risk Management & Safety',
    owner: 'Dr. Lisa Patel',
    ownerRole: 'Safety Officer',
    blocksApproval: false
  },
  {
    id: 'I5',
    type: 'regulatory',
    severity: 'low',
    title: 'Clinical evaluation plan linkage recommended',
    description: 'MDR Article 61 encourages linking protocol to broader clinical evaluation strategy',
    affectedSection: '4.4 Device Description',
    owner: 'Anna Schmidt',
    ownerRole: 'Regulatory Affairs',
    blocksApproval: false
  }
];

export function IssuesGapsPanel() {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'medium':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conflict':
        return <AlertTriangle className="w-4 h-4" />;
      case 'missing':
        return <AlertCircle className="w-4 h-4" />;
      case 'regulatory':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'conflict':
        return 'Conflict';
      case 'missing':
        return 'Missing Input';
      case 'regulatory':
        return 'Regulatory Gap';
      default:
        return 'Issue';
    }
  };

  const highSeverity = issues.filter(i => i.severity === 'high');
  const mediumSeverity = issues.filter(i => i.severity === 'medium');
  const lowSeverity = issues.filter(i => i.severity === 'low');
  const blockingIssues = issues.filter(i => i.blocksApproval);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Issues & Gaps</h3>
        <div className="flex items-center gap-1.5">
          {highSeverity.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
              {highSeverity.length} high
            </span>
          )}
          {mediumSeverity.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
              {mediumSeverity.length}
            </span>
          )}
        </div>
      </div>

      {/* AI Detection Info */}
      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-900">
          System continuously analyzes all content for gaps, missing inputs, and contradictions across Synopsis, Protocol, and supporting documents.
        </p>
      </div>

      {/* Blocking Warning */}
      {blockingIssues.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-red-900 mb-1">
                {blockingIssues.length} issue{blockingIssues.length > 1 ? 's' : ''} blocking approval
              </div>
              <p className="text-xs text-red-700">
                These must be resolved before sections can be locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={`p-3 border rounded-lg ${getSeverityStyles(issue.severity)}`}
          >
            <div className="flex items-start gap-2 mb-2">
              {getTypeIcon(issue.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {getTypeLabel(issue.type)}
                  </span>
                  {issue.blocksApproval && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-300">
                      Blocks approval
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-slate-900 mb-1">
                  {issue.title}
                </div>
                <p className="text-xs text-slate-700 mb-2">
                  {issue.description}
                </p>

                {/* Affected Section */}
                <div className="text-xs text-slate-600 mb-2">
                  <span className="font-medium">Affected:</span> {issue.affectedSection}
                </div>

                {/* Owner */}
                <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-600">
                  <User className="w-3 h-3" />
                  <span><span className="font-medium">Action required by:</span> {issue.owner} ({issue.ownerRole})</span>
                </div>

                {/* Suggested Resolution */}
                {issue.suggestedResolution && (
                  <div className="p-2 bg-white bg-opacity-70 rounded text-xs text-slate-700 mb-3 border border-slate-200">
                    <div className="font-medium text-slate-900 mb-1">Suggested resolution:</div>
                    {issue.suggestedResolution}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors">
                    Review Details
                  </button>
                  {issue.blocksApproval && (
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
            <span>Total issues:</span>
            <span className="font-medium">{issues.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Blocking approval:</span>
            <span className="font-medium text-red-700">{blockingIssues.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Last system check:</span>
            <span className="font-medium text-green-700">✓ 2 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
