import React from 'react';
import { X, History, User, Edit3, MessageSquare, CheckCircle2, Lock, Unlock, AlertCircle, FileText, Sparkles, Ban, XCircle } from 'lucide-react';

interface AuditEntry {
  timestamp: string;
  timezone: string;
  user: string;
  userRole: string;
  action: string;
  affectedElement: string;
  details?: string;
  aiAssisted?: boolean;
}

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: string;
  sectionTitle: string;
  entries: AuditEntry[];
}

export function AuditTrailModal({ isOpen, onClose, sectionNumber, sectionTitle, entries }: AuditTrailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="text-slate-900 font-medium">Audit Trail</h2>
              <p className="text-sm text-slate-600">Section {sectionNumber}: {sectionTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            aria-label="Close audit trail"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Read-Only Notice */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-700">
                <span className="font-medium">Read-only audit log.</span> This is an immutable record of all actions performed on this section. 
                All timestamps are in CET (Central European Time). This audit trail supports ISO 14155 traceability and EU MDR inspection requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Entries */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-0">
            {entries.map((entry, index) => (
              <div 
                key={index}
                className="relative pl-8 pb-6 border-l-2 border-slate-200 last:border-l-0 last:pb-0"
              >
                {/* Timeline Dot */}
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-400"></div>
                
                <div className="space-y-2">
                  {/* Timestamp */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-900">{entry.timestamp}</span>
                    <span className="text-xs text-slate-500">{entry.timezone}</span>
                  </div>

                  {/* User and Role */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-900">{entry.user}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-600">{entry.userRole}</span>
                    {entry.aiAssisted && (
                      <>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                          <Sparkles className="w-3 h-3" />
                          AI-assisted
                        </span>
                      </>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex items-start gap-2">
                    {getActionIcon(entry.action)}
                    <div>
                      <div className="text-xs font-medium text-slate-900">{entry.action}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Affected: <span className="font-medium">{entry.affectedElement}</span>
                      </div>
                      {entry.details && (
                        <div className="text-xs text-slate-500 mt-1 italic">{entry.details}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {entries.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-500">
              No audit entries found for this section.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Total entries: <span className="font-medium">{entries.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-white transition-colors">
                Export as PDF
              </button>
              <button 
                onClick={onClose}
                className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('created') || actionLower.includes('draft generated')) {
    return <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('edit') || actionLower.includes('updated') || actionLower.includes('modified')) {
    return <Edit3 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('comment')) {
    return <MessageSquare className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('approved')) {
    return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('locked')) {
    return <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('unlocked')) {
    return <Unlock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('issue raised') || actionLower.includes('blocker')) {
    return <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('issue') || actionLower.includes('warning')) {
    return <XCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />;
  }
  if (actionLower.includes('amendment')) {
    return <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />;
  }
  
  return <History className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />;
}
