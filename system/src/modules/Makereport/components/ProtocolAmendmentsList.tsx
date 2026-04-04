import { FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { ProtocolAmendment } from '../types';

interface ProtocolAmendmentsListProps {
  amendments: ProtocolAmendment[];
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolAmendmentsList({ amendments, isOpen, onClose }: ProtocolAmendmentsListProps) {
  if (!isOpen) return null;

  const getStatusBadge = (status: ProtocolAmendment['status']) => {
    const config = {
      'draft': { bg: '#F3F4F6', text: '#6B7280', icon: Clock, label: 'Draft' },
      'pending-approval': { bg: '#FEF3C7', text: '#92400E', icon: AlertTriangle, label: 'Pending Approval' },
      'approved': { bg: '#DBEAFE', text: '#1E40AF', icon: CheckCircle2, label: 'Approved' },
    };
    
    const { bg, text, icon: Icon, label } = config[status];
    
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium"
        style={{ backgroundColor: bg, color: text }}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded w-full max-w-4xl max-h-[90vh] flex flex-col" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#3B82F6] flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Protocol Amendments
              </h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                {amendments.length} {amendments.length === 1 ? 'amendment' : 'amendments'} documented
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111827] px-4 py-2 text-[13px] font-medium hover:bg-[#F3F4F6] rounded transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {amendments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[14px] text-[#6B7280]">No protocol amendments documented</p>
              <p className="text-[13px] text-[#9CA3AF] mt-1">
                Amendments will appear here when created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {amendments.map((amendment) => (
                <div 
                  key={amendment.id}
                  className="border border-[#E5E7EB] rounded-lg p-5 hover:border-[#D1D5DB] transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-[15px] font-semibold text-[#111827]">
                        {amendment.amendmentNumber}
                      </div>
                      {getStatusBadge(amendment.status)}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">
                      {formatDate(amendment.createdAt)}
                    </div>
                  </div>

                  {/* Protocol Section */}
                  <div className="mb-3">
                    <div className="text-[12px] font-medium text-[#6B7280] mb-1">Protocol Section</div>
                    <div className="text-[13px] text-[#374151]">{amendment.protocolSection}</div>
                  </div>

                  {/* Change Description */}
                  <div className="mb-3">
                    <div className="text-[12px] font-medium text-[#6B7280] mb-1">Description of Change</div>
                    <div className="text-[13px] text-[#374151] leading-relaxed">
                      {amendment.changeDescription}
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="mb-3">
                    <div className="text-[12px] font-medium text-[#6B7280] mb-1">Rationale</div>
                    <div className="text-[13px] text-[#374151] leading-relaxed">
                      {amendment.rationale}
                    </div>
                  </div>

                  {/* Impact Assessment */}
                  <div className="mb-3">
                    <div className="text-[12px] font-medium text-[#6B7280] mb-1">Impact Assessment</div>
                    <div className="text-[13px] text-[#374151] leading-relaxed">
                      {amendment.impactAssessment}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] mt-3">
                    <div className="text-[12px] text-[#6B7280]">
                      Created by {amendment.createdBy.name}
                    </div>
                    {amendment.approvedBy && amendment.approvedAt && (
                      <div className="text-[12px] text-[#065F46]">
                        Approved by {amendment.approvedBy.name} on {formatDate(amendment.approvedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}