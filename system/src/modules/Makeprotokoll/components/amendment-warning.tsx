import React from 'react';
import { AlertTriangle, Lock, FileEdit } from 'lucide-react';

interface AmendmentWarningProps {
  sectionNumber: string;
  sectionTitle: string;
  lockedBy?: string;
  approvedDate?: string;
  onProceed?: () => void;
  onCancel?: () => void;
}

export function AmendmentWarning({ 
  sectionNumber, 
  sectionTitle,
  lockedBy,
  approvedDate,
  onProceed,
  onCancel 
}: AmendmentWarningProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">
                Amendment Required for Locked Section
              </h3>
              <p className="text-xs text-slate-600">
                Section {sectionNumber}: {sectionTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-900 font-medium mb-1">
                This section is approved and locked
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Any changes to this section will constitute a protocol amendment and require:
              </p>
            </div>
          </div>

          {/* Amendment Requirements */}
          <div className="space-y-2 ml-3">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5"></div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Formal amendment documentation per ISO 14155:2020 § 6.11
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5"></div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Ethics committee notification and approval (if substantial)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5"></div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Regulatory authority notification per EU MDR Article 75
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5"></div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Full audit trail of changes with justification and approval
              </p>
            </div>
          </div>

          {/* Locked Status Info */}
          {lockedBy && approvedDate && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Approved by:</span>
                  <span className="text-slate-900">{lockedBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Approval date:</span>
                  <span className="text-slate-900">{approvedDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Regulatory Note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>Regulatory requirement:</strong> All amendments must be traceable, 
              justified, and approved before implementation. Silent changes to approved 
              protocol content are not permitted.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-slate-700 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors flex items-center gap-2"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Proceed with Amendment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
