import { X } from 'lucide-react';
import type { AuditEntry } from '../types/review';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditEntries: AuditEntry[];
}

export function AuditTrailModal({ isOpen, onClose, auditEntries }: AuditTrailModalProps) {
  if (!isOpen) return null;

  const getDomainColor = (domain: AuditEntry['domain']) => {
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

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-lg font-medium text-neutral-900">Audit Log</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 border border-slate-200 rounded bg-white"
              >
                {/* Top row: Domain pill + Timestamp */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${getDomainColor(entry.domain)} px-2 py-0.5 rounded border`}>
                    {entry.domain}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(entry.timestamp)}</span>
                </div>

                {/* Action */}
                <div className="text-sm text-slate-900 mb-1.5 leading-relaxed">
                  {entry.action}
                </div>

                {/* Attribution */}
                <div className="text-xs text-slate-500">
                  by {entry.userBy} ({entry.userEmail})
                </div>

                {/* Details (optional) */}
                {entry.details && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {entry.details}
                  </div>
                )}

                {/* New value (optional) */}
                {entry.newValue && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    New: {entry.newValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            All actions are automatically logged and timestamped. This audit log is
            read-only and meets 21 CFR Part 11 requirements for electronic records.
          </p>
        </div>
      </div>
    </div>
  );
}