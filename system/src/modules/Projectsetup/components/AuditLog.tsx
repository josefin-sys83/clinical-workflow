import React, { useState } from 'react';
import { X } from 'lucide-react';

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

interface AuditLogProps {
  entries: AuditLogEntry[];
  onExport: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AuditLog({ entries, onExport, isOpen, onToggle }: AuditLogProps) {
  const [filterDomain, setFilterDomain] = useState<string>('all');

  console.log('AuditLog entries:', entries); // Debug log

  const filteredEntries = filterDomain === 'all' 
    ? entries 
    : entries.filter(e => e.domain === filterDomain);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  // Fixed domain colors - never change based on context
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 right-0 h-screen z-30 bg-white shadow-none"
      style={{ 
        width: '360px',
        borderLeft: '1px solid #E5E7EB'
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#111827' 
              }}
            >
              Audit log
            </span>
            <span 
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#F3F4F6',
                borderRadius: '999px',
                padding: '2px 8px'
              }}
            >
              {entries.length}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="hover:bg-slate-100 rounded transition-colors"
            style={{ padding: '4px' }}
          >
            <X style={{ width: '16px', height: '16px', color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Controls section */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        {/* Domain filter dropdown */}
        <div style={{ marginBottom: '8px' }}>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              paddingLeft: '12px',
              paddingRight: '12px',
              cursor: 'pointer'
            }}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All domains</option>
            <option value="Project">Project</option>
            <option value="Role">Role</option>
            <option value="Scope">Scope</option>
            <option value="Requirement">Requirement</option>
            <option value="Content">Content</option>
            <option value="Review">Review</option>
            <option value="Approval">Approval</option>
          </select>
        </div>

        {/* Export to CSV button */}
        <button
          onClick={onExport}
          style={{
            width: '100%',
            height: '36px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          className="hover:bg-slate-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Audit log entries */}
      <div 
        style={{ 
          height: 'calc(100vh - 170px)', 
          overflowY: 'auto',
          padding: '0 16px'
        }}
        className="space-y-3"
      >
        {filteredEntries.length === 0 ? (
          <div className="py-8 text-center" style={{ fontSize: '14px', color: '#6B7280' }}>
            No audit entries yet
          </div>
        ) : (
          <>
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 border border-slate-200 rounded bg-white"
              >
                {/* Top row: Domain pill (left) + Timestamp (right) */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${getDomainColor(entry.domain)} px-2 py-0.5 rounded border`}>
                    {entry.domain}
                  </span>
                  <span className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</span>
                </div>

                {/* Action title */}
                <div className="text-sm text-slate-900 mb-1.5 leading-relaxed">
                  {entry.action}
                </div>

                {/* Attribution - always grey */}
                <div className="text-xs text-slate-500">
                  by {entry.userBy} ({entry.userEmail})
                </div>

                {/* Optional details */}
                {entry.details && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {entry.details}
                  </div>
                )}

                {/* Optional new value */}
                {entry.newValue && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    New: {entry.newValue}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}