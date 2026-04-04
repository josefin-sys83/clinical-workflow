import { X, AlertTriangle, CheckCircle2, Clock, FileText, Database, FileCode } from 'lucide-react';
import { ProtocolDeviation, User } from '../types';

interface DeviationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviations: ProtocolDeviation[];
  currentUser: User;
  onReviewDeviation: (deviationId: string, status: 'approved' | 'requires-amendment', comment: string) => void;
}

export function DeviationsModal({
  isOpen,
  onClose,
  deviations,
  currentUser,
  onReviewDeviation,
}: DeviationsModalProps) {
  if (!isOpen) return null;

  const pendingDeviations = deviations.filter(d => d.status === 'pending-review');
  const reviewedDeviations = deviations.filter(d => d.status !== 'pending-review');
  const majorDeviations = deviations.filter(d => d.deviationType === 'major');
  const minorDeviations = deviations.filter(d => d.deviationType === 'minor');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: '#10B981' };
      case 'requires-amendment':
        return { label: 'Requires Amendment', color: '#DC2626' };
      default:
        return { label: 'Pending Review', color: '#F59E0B' };
    }
  };

  const getDeviationBadge = (type: string) => {
    switch (type) {
      case 'major':
        return { label: 'Major Deviation', color: '#DC2626' };
      default:
        return { label: 'Minor Deviation', color: '#F59E0B' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded border border-[#E5E7EB] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div>
              <h2 
                className="text-[#111827]"
                style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Protocol Deviations & Impact Assessment
              </h2>
              <p 
                className="text-[#6B7280] mt-1"
                style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
              >
                All deviations from approved protocol must be documented, justified, and assessed for regulatory impact
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span 
                className="text-[#6B7280]"
                style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                Major: {majorDeviations.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span 
                className="text-[#6B7280]"
                style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                Minor: {minorDeviations.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span 
                className="text-[#6B7280]"
                style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                Pending: {pendingDeviations.length}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Pending Deviations */}
          {pendingDeviations.length > 0 && (
            <div className="mb-6">
              <h3 
                className="text-[#111827] mb-3"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Pending Review ({pendingDeviations.length})
              </h3>
              <div className="space-y-4">
                {pendingDeviations.map(deviation => {
                  const deviationBadge = getDeviationBadge(deviation.deviationType);
                  const statusBadge = getStatusBadge(deviation.status);
                  
                  return (
                    <div 
                      key={deviation.id}
                      className={`border rounded p-4 ${
                        deviation.deviationType === 'major' 
                          ? 'border-[#FEE2E2] bg-[#FEF2F2]' 
                          : 'border-[#FEF3C7] bg-[#FFFBEB]'
                      }`}
                    >
                      {/* Deviation Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 ${
                            deviation.deviationType === 'major' ? 'text-[#DC2626]' : 'text-[#F59E0B]'
                          }`} />
                          <span 
                            className="px-2 py-0.5 rounded text-white"
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 600,
                              fontFamily: 'system-ui, sans-serif',
                              backgroundColor: deviationBadge.color
                            }}
                          >
                            {deviationBadge.label}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-white"
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 500,
                              fontFamily: 'system-ui, sans-serif',
                              backgroundColor: statusBadge.color
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <span 
                          className="text-[#9CA3AF]"
                          style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          Reported {new Date(deviation.reportedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Protocol Reference */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3 h-3 text-[#6B7280]" />
                          <span 
                            className="text-[#111827]"
                            style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
                          >
                            Protocol Section:
                          </span>
                        </div>
                        <div 
                          className="text-[#374151] pl-5"
                          style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          {deviation.protocolSection}
                        </div>
                      </div>

                      {/* Requirement vs Implementation */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="border border-[#E5E7EB] bg-white rounded p-2.5">
                          <div 
                            className="text-[#6B7280] mb-1"
                            style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' }}
                          >
                            Protocol Requirement
                          </div>
                          <div 
                            className="text-[#111827]"
                            style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                          >
                            {deviation.protocolRequirement}
                          </div>
                        </div>
                        <div className="border border-[#E5E7EB] bg-white rounded p-2.5">
                          <div 
                            className="text-[#6B7280] mb-1"
                            style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' }}
                          >
                            Actual Implementation
                          </div>
                          <div 
                            className="text-[#111827]"
                            style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                          >
                            {deviation.actualImplementation}
                          </div>
                        </div>
                      </div>

                      {/* Rationale */}
                      <div className="mb-3">
                        <div 
                          className="text-[#111827] mb-1"
                          style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
                        >
                          Rationale:
                        </div>
                        <div 
                          className="text-[#374151]"
                          style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          {deviation.rationale}
                        </div>
                      </div>

                      {/* Impact Assessment */}
                      <div className="mb-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded p-2.5">
                        <div 
                          className="text-[#1E40AF] mb-1"
                          style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
                        >
                          Impact Assessment:
                        </div>
                        <div 
                          className="text-[#1E3A8A]"
                          style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          {deviation.impactAssessment}
                        </div>
                      </div>

                      {/* Reported By */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                        <div 
                          className="text-[#6B7280]"
                          style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                        >
                          Reported by: <span style={{ fontWeight: 500 }}>{deviation.reportedBy.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const comment = prompt('Review comments (optional):') || '';
                              onReviewDeviation(deviation.id, 'approved', comment);
                            }}
                            className="px-3 py-1 bg-[#10B981] text-white rounded hover:bg-[#059669] transition-colors"
                            style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const comment = prompt('Required amendments:');
                              if (comment) onReviewDeviation(deviation.id, 'requires-amendment', comment);
                            }}
                            className="px-3 py-1 border border-[#DC2626] text-[#DC2626] rounded hover:bg-white transition-colors"
                            style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            Request Amendment
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviewed Deviations */}
          {reviewedDeviations.length > 0 && (
            <div>
              <h3 
                className="text-[#111827] mb-3"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Reviewed ({reviewedDeviations.length})
              </h3>
              <div className="space-y-3">
                {reviewedDeviations.map(deviation => {
                  const deviationBadge = getDeviationBadge(deviation.deviationType);
                  const statusBadge = getStatusBadge(deviation.status);
                  
                  return (
                    <div 
                      key={deviation.id}
                      className="border border-[#E5E7EB] bg-[#F9FAFB] rounded p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              className="px-2 py-0.5 rounded text-white"
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: 600,
                                fontFamily: 'system-ui, sans-serif',
                                backgroundColor: deviationBadge.color
                              }}
                            >
                              {deviationBadge.label}
                            </span>
                            <span 
                              className="px-2 py-0.5 rounded text-white"
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: 500,
                                fontFamily: 'system-ui, sans-serif',
                                backgroundColor: statusBadge.color
                              }}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <div 
                            className="text-[#111827] mb-1"
                            style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            {deviation.protocolSection}
                          </div>
                          <div 
                            className="text-[#6B7280]"
                            style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                          >
                            Reviewed by {deviation.reviewedBy?.name} on {deviation.reviewedAt ? new Date(deviation.reviewedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {deviations.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
              <p 
                className="text-[#6B7280]"
                style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                No protocol deviations reported
              </p>
              <p 
                className="text-[#9CA3AF] mt-1"
                style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
              >
                All report sections align with approved protocol
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