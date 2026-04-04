import { X, Lock, CheckCircle2, MessageSquare, Edit3, FileText, User as UserIcon, Download } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  sectionNumber: string;
  auditLog: AuditLogEntry[];
}

export function AuditTrailModal({ 
  isOpen, 
  onClose, 
  sectionId, 
  sectionTitle,
  sectionNumber,
  auditLog 
}: AuditTrailModalProps) {
  if (!isOpen) return null;

  // Filter audit log entries for this section
  const sectionEntries = (auditLog || [])
    .filter(entry => entry.sectionId === sectionId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Most recent first

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('locked') || lowerAction.includes('lock')) {
      return <Lock className="w-4 h-4 text-[#6B7280]" />;
    }
    if (lowerAction.includes('approved') || lowerAction.includes('approval')) {
      return <CheckCircle2 className="w-4 h-4 text-[#10B981]" />;
    }
    if (lowerAction.includes('comment') || lowerAction.includes('review')) {
      return <MessageSquare className="w-4 h-4 text-[#EC4899]" />;
    }
    if (lowerAction.includes('updated') || lowerAction.includes('edited') || lowerAction.includes('content')) {
      return <Edit3 className="w-4 h-4 text-[#F59E0B]" />;
    }
    return <FileText className="w-4 h-4 text-[#6B7280]" />;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-[#6B7280]" />
              <div>
                <h3 className="text-[#111827]" style={{ fontSize: '17px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                  Audit Trail
                </h3>
                <p className="text-[#6B7280] mt-0.5" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                  Section {sectionNumber}: {sectionTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
              Read-only audit log.
            </span>
            <span className="text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              {' '}This is an immutable record of all actions performed on this section. All timestamps are in CET (Central European Time). This audit trail supports ISO 14155 traceability and EU MDR inspection requirements.
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {sectionEntries.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}>
              <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No audit entries yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sectionEntries.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {/* Timeline marker */}
                  <div className="absolute left-[11px] top-0 bottom-0 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#E5E7EB] bg-white flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                    </div>
                    {index < sectionEntries.length - 1 && (
                      <div className="flex-1 w-px bg-[#E5E7EB] mt-1" />
                    )}
                  </div>
                  
                  <div className="pl-12">
                    {/* Timestamp and CET */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className="text-[#9CA3AF] px-1.5 py-0.5 bg-[#F3F4F6] rounded" style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                        CET
                      </span>
                    </div>

                    {/* User and Role */}
                    {entry.user && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <UserIcon className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                          {entry.user.name}
                        </span>
                        {entry.role && (
                          <>
                            <span className="text-[#9CA3AF]" style={{ fontSize: '13px' }}>•</span>
                            <span className="text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {entry.role}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Action with Icon */}
                    <div className="flex items-start gap-2">
                      {getActionIcon(entry.action)}
                      <div className="flex-1">
                        <div className="text-[#111827] mb-1" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                          {entry.action}
                        </div>
                        
                        {/* Affected */}
                        {entry.affected && (
                          <div className="text-[#6B7280] mb-1.5" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            <span style={{ fontWeight: 500 }}>Affected:</span> {entry.affected}
                          </div>
                        )}

                        {/* Description in italics */}
                        {entry.description && (
                          <div className="text-[#6B7280] italic mt-1.5" style={{ fontSize: '13px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {entry.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[#6B7280]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Total entries: {sectionEntries.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* Handle PDF export */}}
              className="px-4 py-2 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
              style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
            >
              <Download className="w-4 h-4" />
              Export as PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#111827] text-white rounded hover:bg-[#1F2937] transition-colors"
              style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
