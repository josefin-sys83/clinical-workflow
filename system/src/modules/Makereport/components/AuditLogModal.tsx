import { X } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLog: AuditLogEntry[];
  sections: Array<{ id: string; title: string }>;
}

export function AuditLogModal({ isOpen, onClose, auditLog }: AuditLogModalProps) {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded shadow-lg w-full max-w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-[#111827]" style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
              Audit Trail
            </h2>
            <p className="text-[#6B7280] mt-0.5" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              Complete record of all document activities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {auditLog.map((entry) => (
              <div key={entry.id} className="p-3 border border-slate-200 rounded bg-white">
                {/* Top row: Domain pill (left) + Timestamp (right) */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${getDomainColor(entry.domain)} px-2 py-0.5 rounded border`}>
                    {entry.domain}
                  </span>
                  <span className="text-xs text-slate-500">{entry.timestamp}</span>
                </div>

                {/* Action title */}
                <div className="text-sm text-slate-900 mb-1.5 leading-relaxed">
                  {entry.action}
                </div>

                {/* Attribution line */}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-between items-center">
          <p className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            {auditLog.length} {auditLog.length === 1 ? 'entry' : 'entries'}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors bg-white"
            style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}