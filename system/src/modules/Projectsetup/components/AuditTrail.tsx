import React, { useState } from 'react';
import { Download, X, Filter, History } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  category: 'role' | 'requirement' | 'scope' | 'timeline' | 'regulatory' | 'team' | 'approval' | 'version';
  title: string;
  description?: string;
  newValue?: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
  onExport: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AuditTrail({ entries, onExport, isOpen, onToggle }: AuditTrailProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredEntries = filterCategory === 'all' 
    ? entries 
    : entries.filter(e => e.category === filterCategory);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date).replace(',', '');
  };

  const getCategoryColor = (category: AuditEntry['category']) => {
    const colors: Record<AuditEntry['category'], string> = {
      role: 'text-green-700 bg-green-50 border-green-200',
      requirement: 'text-purple-700 bg-purple-50 border-purple-200',
      scope: 'text-blue-700 bg-blue-50 border-blue-200',
      timeline: 'text-orange-700 bg-orange-50 border-orange-200',
      regulatory: 'text-red-700 bg-red-50 border-red-200',
      team: 'text-teal-700 bg-teal-50 border-teal-200',
      approval: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      version: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    };
    return colors[category];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-screen z-50 bg-white border-l border-slate-200 shadow-xl w-[360px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-sm text-slate-900">Audit log</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{entries.length}</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="all">All categories</option>
            <option value="role">Role</option>
            <option value="requirement">Requirement</option>
            <option value="scope">Scope</option>
            <option value="timeline">Timeline</option>
            <option value="regulatory">Regulatory</option>
            <option value="team">Team</option>
            <option value="approval">Approval</option>
            <option value="version">Version</option>
          </select>
        </div>
      </div>

      {/* Export Button */}
      <div className="px-4 py-3 border-b border-slate-200">
        <button
          onClick={onExport}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Entries */}
      <div className="h-[calc(100vh-240px)] overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No audit entries yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                {/* Category Tag & Timestamp */}
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(entry.category)}`}>
                    {entry.category}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                {/* Title */}
                <div className="text-sm font-medium text-slate-900 mb-1">
                  {entry.title}
                </div>

                {/* User */}
                <div className="text-xs text-slate-500 mb-2">
                  by {entry.user}
                </div>

                {/* Description */}
                {entry.description && (
                  <div className="text-xs text-slate-600 mb-2">
                    {entry.description}
                  </div>
                )}

                {/* New Value */}
                {entry.newValue && (
                  <div className="text-xs text-slate-700">
                    <span className="font-medium">New:</span> {entry.newValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}