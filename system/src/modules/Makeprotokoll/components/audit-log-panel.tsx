import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  domain: 'Project' | 'Role' | 'Scope' | 'Requirement' | 'Content' | 'Review' | 'Approval';
  timestamp: string; // Format: MM/DD/YYYY HH:MM
  action: string; // Primary action description
  userBy: string; // Full name
  userEmail: string;
  details?: string; // Optional details line
  newValue?: string; // Optional "New:" value line
}

interface AuditLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogPanel({ isOpen, onClose }: AuditLogPanelProps) {
  const [selectedDomain, setSelectedDomain] = React.useState<'All' | AuditLogEntry['domain']>('All');

  // Domain color mapping - fixed colors for each domain
  const getDomainColor = (domain: AuditLogEntry['domain']) => {
    const colors = {
      'Project': 'bg-blue-50 text-blue-700 border-blue-200',
      'Role': 'bg-green-50 text-green-700 border-green-200',
      'Scope': 'bg-purple-50 text-purple-700 border-purple-200',
      'Requirement': 'bg-orange-50 text-orange-700 border-orange-200',
      'Content': 'bg-teal-50 text-teal-700 border-teal-200',
      'Review': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Approval': 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    return colors[domain];
  };

  // Mock audit log entries for the protocol
  const entries: AuditLogEntry[] = [
    {
      id: 'a1',
      domain: 'Project',
      timestamp: '02/20/2026 19:37',
      action: 'Project CIP-2024-MED-0847 created and Project Setup initiated',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Clinical Investigation Protocol for cardiovascular support device'
    },
    {
      id: 'a2',
      domain: 'Requirement',
      timestamp: '02/20/2026 20:15',
      action: 'EU MDR regulatory framework applied to protocol template',
      userBy: 'System',
      userEmail: 'system@platform',
      newValue: 'EU MDR 2017/745 + ISO 14155:2020'
    },
    {
      id: 'a3',
      domain: 'Scope',
      timestamp: '02/20/2026 20:18',
      action: 'Device risk classification set to Class III',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Long-term implantable cardiovascular support device'
    },
    {
      id: 'a4',
      domain: 'Role',
      timestamp: '02/20/2026 20:25',
      action: 'Dr. Helena Schmidt assigned as VP Clinical Affairs',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      newValue: 'VP Clinical Affairs (approval authority)'
    },
    {
      id: 'a5',
      domain: 'Content',
      timestamp: '02/21/2026 09:22',
      action: 'Section 1 "Protocol Overview" drafted with AI assistance',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Initial draft generated from device specifications and regulatory template'
    },
    {
      id: 'a6',
      domain: 'Approval',
      timestamp: '02/21/2026 11:45',
      action: 'Section 1 approved and locked by VP Clinical Affairs',
      userBy: 'Dr. Helena Schmidt',
      userEmail: 'helena.schmidt@medtech.com',
      details: 'Section now requires formal amendment process for modifications'
    },
    {
      id: 'a7',
      domain: 'Content',
      timestamp: '02/22/2026 08:30',
      action: 'Section 2 "Study Rationale & Objectives" content edited',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Primary objective timepoint clarified to 12 months post-implant'
    },
    {
      id: 'a8',
      domain: 'Review',
      timestamp: '02/22/2026 14:20',
      action: 'Reviewer comment added to Section 2 regarding primary objective timepoint',
      userBy: 'Dr. Thomas Weber',
      userEmail: 'thomas.weber@medtech.com',
      details: 'Requested alignment with device PMCF duration requirements'
    },
    {
      id: 'a9',
      domain: 'Scope',
      timestamp: '02/23/2026 09:10',
      action: 'Target market expanded to include Switzerland',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      newValue: 'EU27 + Switzerland + Norway'
    },
    {
      id: 'a10',
      domain: 'Content',
      timestamp: '02/23/2026 10:15',
      action: 'Section 3 "Device Description" updated with Class III rationale',
      userBy: 'Dr. Marcus Rivera',
      userEmail: 'marcus.rivera@medtech.com'
    },
    {
      id: 'a11',
      domain: 'Requirement',
      timestamp: '02/23/2026 14:30',
      action: 'ISO 14155 section 6.6.3 requirement marked as satisfied',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Eligibility criteria rationale provided for all inclusion/exclusion criteria'
    },
    {
      id: 'a12',
      domain: 'Review',
      timestamp: '02/24/2026 16:45',
      action: 'System consistency check flagged blocker issue in Section 5',
      userBy: 'System Consistency Check',
      userEmail: 'system@platform',
      details: 'Eligibility criteria age range conflicts with device intended use statement'
    },
    {
      id: 'a13',
      domain: 'Review',
      timestamp: '02/25/2026 09:00',
      action: 'Review Mode Cycle 1 initiated by Project Lead',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      details: 'Formal review cycle for sections 1-8 with 5 business days deadline'
    },
    {
      id: 'a14',
      domain: 'Approval',
      timestamp: '02/25/2026 15:30',
      action: 'Section 7 "Safety Monitoring" approved by reviewer',
      userBy: 'Dr. Thomas Weber',
      userEmail: 'thomas.weber@medtech.com'
    },
    {
      id: 'a15',
      domain: 'Role',
      timestamp: '02/26/2026 08:45',
      action: 'Dr. Marcus Rivera assigned as Medical Monitor',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com',
      newValue: 'Medical Monitor (safety oversight authority)'
    },
    {
      id: 'a16',
      domain: 'Content',
      timestamp: '02/26/2026 11:20',
      action: 'Section 4 "Study Design" marked complete with all required elements verified',
      userBy: 'Dr. Sarah Chen',
      userEmail: 'sarah.chen@medtech.com'
    },
    {
      id: 'a17',
      domain: 'Approval',
      timestamp: '02/27/2026 14:10',
      action: 'Amendment request submitted for Section 1 locked content modification',
      userBy: 'Dr. Marcus Rivera',
      userEmail: 'marcus.rivera@medtech.com',
      details: 'Request to update sponsor contact information due to organizational change'
    },
    {
      id: 'a18',
      domain: 'Project',
      timestamp: '02/27/2026 16:20',
      action: 'Protocol version 1.4 created from version 1.3',
      userBy: 'System',
      userEmail: 'system@platform',
      details: 'Version increment due to approved amendment to locked Section 1'
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 z-40"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[32rem] bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 font-medium">Audit Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">Immutable record of all protocol actions</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-3 border-b border-slate-200">
          <div className="relative">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value as 'All' | AuditLogEntry['domain'])}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded appearance-none cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="All">All domains</option>
              <option value="Project">Project</option>
              <option value="Role">Role</option>
              <option value="Scope">Scope</option>
              <option value="Requirement">Requirement</option>
              <option value="Content">Content</option>
              <option value="Review">Review</option>
              <option value="Approval">Approval</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-3">
            {entries
              .filter(entry => selectedDomain === 'All' || entry.domain === selectedDomain)
              .map((entry) => (
                <div 
                  key={entry.id}
                  className="p-3 border border-slate-200 rounded bg-white"
                >
                  {/* Top row: category pill (left) and timestamp (right) */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${getDomainColor(entry.domain)} px-2 py-0.5 rounded border`}>
                      {entry.domain}
                    </span>
                    <span className="text-xs text-slate-500">{entry.timestamp}</span>
                  </div>

                  {/* Primary action title */}
                  <div className="text-sm text-slate-900 mb-1.5 leading-relaxed">
                    {entry.action}
                  </div>

                  {/* Secondary attribution line */}
                  <div className="text-xs text-slate-500">
                    by {entry.userBy} ({entry.userEmail})
                  </div>

                  {/* Optional details line */}
                  {entry.details && (
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {entry.details}
                    </div>
                  )}

                  {/* Optional "New:" value line */}
                  {entry.newValue && (
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                      New: {entry.newValue}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600 leading-relaxed">
            All timestamps in CET. This audit trail supports ISO 14155 traceability and EU MDR inspection requirements.
          </p>
        </div>
      </div>
    </>
  );
}