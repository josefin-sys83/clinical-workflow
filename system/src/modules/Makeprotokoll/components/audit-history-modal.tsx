import React from 'react';
import { X, FileText, MessageSquare, CheckCircle, Lock, AlertCircle, Sparkles } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actionType: 'edit' | 'comment' | 'approval' | 'lock' | 'ai_check' | 'issue_resolved';
  user: string;
  userRole: string;
  details: string;
  versionId: string;
}

interface AuditHistoryModalProps {
  sectionNumber: string;
  sectionTitle: string;
  entries: AuditEntry[];
  onClose: () => void;
}

export function AuditHistoryModal({ sectionNumber, sectionTitle, entries, onClose }: AuditHistoryModalProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'edit':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'lock':
        return <Lock className="w-4 h-4 text-slate-600" />;
      case 'ai_check':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      case 'issue_resolved':
        return <AlertCircle className="w-4 h-4 text-green-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Audit History: {sectionNumber} {sectionTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Complete change log for regulatory compliance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Audit Entries */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.id} className="relative">
                {/* Timeline connector */}
                {index < entries.length - 1 && (
                  <div className="absolute left-[11px] top-10 bottom-0 w-px bg-slate-200" />
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(entry.actionType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {entry.action}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {entry.user} • {entry.userRole}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {entry.timestamp}
                      </div>
                    </div>
                    
                    {entry.details && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                        {entry.details}
                      </div>
                    )}
                    
                    <div className="mt-1.5 text-xs font-mono text-slate-400">
                      v{entry.versionId}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600">
            All actions are logged in compliance with 21 CFR Part 11 and EU MDR Annex I requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
