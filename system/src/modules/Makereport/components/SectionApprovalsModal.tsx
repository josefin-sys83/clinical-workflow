import { X, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SectionApproval, User } from '../types';

interface SectionApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  approvals: SectionApproval[];
  currentUser: User;
  onApprove: (approvalId: string, comment?: string) => void;
  onReject: (approvalId: string, comment: string) => void;
}

export function SectionApprovalsModal({
  isOpen,
  onClose,
  sectionTitle,
  approvals,
  currentUser,
  onApprove,
  onReject,
}: SectionApprovalsModalProps) {
  if (!isOpen) return null;

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');
  const canApprove = pendingApprovals.some(a => a.approver.id === currentUser.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-[#10B981]" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-[#DC2626]" />;
      default:
        return <Clock className="w-4 h-4 text-[#F59E0B]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: '#10B981' };
      case 'rejected':
        return { label: 'Rejected', color: '#DC2626' };
      default:
        return { label: 'Pending', color: '#F59E0B' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded border border-[#E5E7EB] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 
              className="text-[#111827]"
              style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
            >
              Section Approvals
            </h2>
            <p 
              className="text-[#6B7280] mt-1"
              style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
            >
              {sectionTitle}
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
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="mb-6">
              <h3 
                className="text-[#111827] mb-3"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Pending Approvals ({pendingApprovals.length})
              </h3>
              <div className="space-y-3">
                {pendingApprovals.map(approval => {
                  const isCurrentUserApprover = approval.approver.id === currentUser.id;
                  const badge = getStatusBadge(approval.status);
                  
                  return (
                    <div 
                      key={approval.id}
                      className="border border-[#FEF3C7] bg-[#FFFBEB] rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(approval.status)}
                          <span 
                            className="text-[#111827]"
                            style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            {approval.approver.name}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-white"
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 500,
                              fontFamily: 'system-ui, sans-serif',
                              backgroundColor: badge.color
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {isCurrentUserApprover && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onApprove(approval.id)}
                              className="px-3 py-1 bg-[#10B981] text-white rounded hover:bg-[#059669] transition-colors"
                              style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const comment = prompt('Reason for rejection:');
                                if (comment) onReject(approval.id, comment);
                              }}
                              className="px-3 py-1 border border-[#DC2626] text-[#DC2626] rounded hover:bg-[#FEF2F2] transition-colors"
                              style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                      <div 
                        className="text-[#6B7280]"
                        style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                      >
                        {approval.approver.email}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Approvals */}
          {completedApprovals.length > 0 && (
            <div>
              <h3 
                className="text-[#111827] mb-3"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Completed Approvals ({completedApprovals.length})
              </h3>
              <div className="space-y-3">
                {completedApprovals.map(approval => {
                  const badge = getStatusBadge(approval.status);
                  
                  return (
                    <div 
                      key={approval.id}
                      className="border border-[#E5E7EB] bg-[#F9FAFB] rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(approval.status)}
                          <span 
                            className="text-[#111827]"
                            style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            {approval.approver.name}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-white"
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 500,
                              fontFamily: 'system-ui, sans-serif',
                              backgroundColor: badge.color
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <span 
                          className="text-[#9CA3AF]"
                          style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          {new Date(approval.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {approval.comment && (
                        <div 
                          className="text-[#6B7280] mt-2 pl-6"
                          style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          {approval.comment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {approvals.length === 0 && (
            <div className="text-center py-8">
              <p 
                className="text-[#9CA3AF]"
                style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
              >
                No approvals configured for this section
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors w-full"
            style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
