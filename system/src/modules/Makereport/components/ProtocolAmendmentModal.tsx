import { useState } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { ProtocolAmendment, User } from '../types';

interface ProtocolAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amendment: Omit<ProtocolAmendment, 'id' | 'createdAt' | 'createdBy'>) => void;
  currentUser: User;
  existingAmendments: ProtocolAmendment[];
}

export function ProtocolAmendmentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  currentUser,
  existingAmendments 
}: ProtocolAmendmentModalProps) {
  const [protocolSection, setProtocolSection] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [rationale, setRationale] = useState('');
  const [impactAssessment, setImpactAssessment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!protocolSection || !changeDescription || !rationale || !impactAssessment) {
      return;
    }

    const nextAmendmentNumber = `PA-${String(existingAmendments.length + 1).padStart(3, '0')}`;

    onSubmit({
      amendmentNumber: nextAmendmentNumber,
      protocolSection,
      changeDescription,
      rationale,
      impactAssessment,
      status: 'draft',
    });

    // Reset form
    setProtocolSection('');
    setChangeDescription('');
    setRationale('');
    setImpactAssessment('');
    onClose();
  };

  const isFormValid = protocolSection && changeDescription && rationale && impactAssessment;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded w-full max-w-3xl max-h-[90vh] flex flex-col" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#3B82F6] flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Create Protocol Amendment
              </h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                Document changes to the locked protocol from previous phase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111827] p-1 hover:bg-[#F3F4F6] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded flex gap-3">
          <AlertCircle className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-[#1E40AF] leading-relaxed">
            <p className="font-medium mb-1">Protocol amendments require regulatory approval</p>
            <p>Any changes to the approved protocol must be documented, justified, and approved by appropriate authorities before implementation. This amendment will be tracked in the audit log.</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Amendment Number (Auto-generated) */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Amendment Number
              </label>
              <div className="px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[13px] text-[#6B7280]">
                PA-{String(existingAmendments.length + 1).padStart(3, '0')} (Auto-generated)
              </div>
            </div>

            {/* Protocol Section Reference */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Protocol Section Reference <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={protocolSection}
                onChange={(e) => setProtocolSection(e.target.value)}
                placeholder="e.g., Protocol Section 5.2 - Study Endpoints"
                className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>

            {/* Change Description */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Description of Change <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe the specific change or addition to the protocol..."
                className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] min-h-[100px] resize-vertical"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              />
            </div>

            {/* Rationale */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Rationale for Change <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain why this change is necessary and the circumstances that require it..."
                className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] min-h-[100px] resize-vertical"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              />
            </div>

            {/* Impact Assessment */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Impact Assessment <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={impactAssessment}
                onChange={(e) => setImpactAssessment(e.target.value)}
                placeholder="Assess the impact on study objectives, endpoints, data integrity, and regulatory compliance..."
                className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] min-h-[100px] resize-vertical"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-between bg-[#F9FAFB]">
          <div className="text-[12px] text-[#6B7280]">
            Created by: {currentUser.name}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`px-4 py-2 text-[13px] font-medium text-white rounded transition-colors ${
                isFormValid 
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB]' 
                  : 'bg-[#D1D5DB] cursor-not-allowed'
              }`}
            >
              Create Amendment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
