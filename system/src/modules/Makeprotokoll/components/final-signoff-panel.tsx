import React, { useState } from 'react';
import { PenTool, CheckCircle, Clock, Lock, User } from 'lucide-react';

interface SignoffStep {
  id: string;
  order: number;
  role: string;
  name: string;
  status: 'Required' | 'Signed' | 'Pending';
  signedDate?: string;
  signedBy?: string;
  signature?: string;
}

interface FinalSignoffPanelProps {
  protocolName: string;
  versionId: string;
  lastActivity?: string;
  onAllSignoffsComplete?: () => void;
}

export function FinalSignoffPanel({ 
  protocolName, 
  versionId, 
  lastActivity,
  onAllSignoffsComplete 
}: FinalSignoffPanelProps) {
  const [steps, setSteps] = useState<SignoffStep[]>([
    {
      id: 'medical-writer',
      order: 1,
      role: 'Medical Writer',
      name: 'Emma Rodriguez',
      status: 'Signed',
      signedDate: 'Feb 8, 2026 at 14:25 CET',
      signedBy: 'Emma Rodriguez',
      signature: 'E.Rodriguez/2026-02-08T14:25:00Z'
    },
    {
      id: 'regulatory-affairs',
      order: 2,
      role: 'Regulatory Affairs',
      name: 'Anna Schmidt',
      status: 'Signed',
      signedDate: 'Feb 8, 2026 at 15:10 CET',
      signedBy: 'Anna Schmidt',
      signature: 'A.Schmidt/2026-02-08T15:10:00Z'
    },
    {
      id: 'clinical-ops',
      order: 3,
      role: 'Clinical Operations',
      name: 'James Miller',
      status: 'Pending',
    },
    {
      id: 'project-lead',
      order: 4,
      role: 'Project Lead',
      name: 'Dr. Sarah Chen',
      status: 'Required',
    }
  ]);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<SignoffStep | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Required':
        return <PenTool className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Signed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'Pending':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Required':
        return 'text-slate-700 bg-slate-50 border-slate-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const signedCount = steps.filter(s => s.status === 'Signed').length;
  const totalSteps = steps.length;
  const allSigned = signedCount === totalSteps;

  const handleSignClick = (step: SignoffStep) => {
    setSelectedStep(step);
    setShowSignatureModal(true);
  };

  const handleConfirmSignature = () => {
    if (!selectedStep) return;

    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const updatedSteps = steps.map(step => {
      if (step.id === selectedStep.id) {
        return {
          ...step,
          status: 'Signed' as const,
          signedDate: timestamp,
          signedBy: step.name,
          signature: `${step.name.split(' ').map(n => n[0]).join('.')}.${step.name.split(' ').pop()}/${now.toISOString()}`
        };
      }
      // Update next step to Pending
      if (step.order === selectedStep.order + 1 && step.status === 'Required') {
        return { ...step, status: 'Pending' as const };
      }
      return step;
    });

    setSteps(updatedSteps);
    setShowSignatureModal(false);
    setSelectedStep(null);

    // Check if all are now signed
    const allNowSigned = updatedSteps.every(s => s.status === 'Signed');
    if (allNowSigned && onAllSignoffsComplete) {
      setTimeout(() => {
        alert('All sign-offs complete. Protocol is now Locked/Approved and immutable.\n\nAny future changes will require formal amendment approval.');
        onAllSignoffsComplete();
      }, 500);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                <PenTool className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Final Sign-off</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Electronic signature workflow for protocol approval
                </p>
              </div>
            </div>
            {lastActivity && (
              <div className="text-xs text-slate-500">
                <span className="text-slate-400">Last activity:</span> {lastActivity}
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-green-600 h-full transition-all duration-500"
                style={{ width: `${(signedCount / totalSteps) * 100}%` }}
              />
            </div>
            <div className="text-sm font-medium text-slate-700 whitespace-nowrap">
              {signedCount} of {totalSteps} signed
            </div>
          </div>
        </div>

        {/* Sign-off Steps */}
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
            Required Signatures (in order)
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 border rounded-lg transition-all ${
                  step.status === 'Signed' 
                    ? 'border-green-200 bg-green-50/30' 
                    : step.status === 'Pending'
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Step Number */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                  step.status === 'Signed'
                    ? 'border-green-600 bg-green-600 text-white'
                    : step.status === 'Pending'
                    ? 'border-amber-600 bg-white text-amber-700'
                    : 'border-slate-300 bg-white text-slate-400'
                }`}>
                  {step.status === 'Signed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.order
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-0.5">
                        {step.role}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="w-3 h-3" />
                        <span>{step.name}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium border rounded whitespace-nowrap ${getStatusColor(step.status)}`}>
                      {step.status}
                    </span>
                  </div>

                  {step.status === 'Signed' && step.signedDate && (
                    <div className="p-2.5 bg-white border border-green-200 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-600">Signed by:</span>
                        <span className="font-medium text-slate-900">{step.signedBy}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-600">Date & time:</span>
                        <span className="font-medium text-slate-900">{step.signedDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Signature:</span>
                        <span className="font-mono text-xs text-slate-700">{step.signature}</span>
                      </div>
                    </div>
                  )}

                  {step.status === 'Pending' && (
                    <button
                      onClick={() => handleSignClick(step)}
                      className="mt-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium"
                    >
                      Sign Protocol
                    </button>
                  )}

                  {step.status === 'Required' && index > 0 && steps[index - 1].status !== 'Signed' && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      Awaiting previous sign-off from {steps[index - 1].name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
          {allSigned ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Lock className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-900 mb-0.5">
                  All Sign-offs Complete
                </div>
                <p className="text-xs text-green-800">
                  Protocol is now Locked/Approved and immutable. All signatures logged with full audit trail.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Electronic signatures are legally binding and audit-logged per 21 CFR Part 11 and EU GMP Annex 11
            </p>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedStep && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-900">
                Electronic Signature Confirmation
              </h3>
            </div>

            <div className="px-5 py-5">
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Protocol Details
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Protocol:</span>
                    <span className="font-medium text-slate-900">{protocolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Version:</span>
                    <span className="font-medium text-slate-900">{versionId}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Signatory Information
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Role:</span>
                    <span className="font-medium text-slate-900">{selectedStep.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-medium text-slate-900">{selectedStep.name}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                By signing, you confirm that you have reviewed the complete protocol and approve it for regulatory submission. This signature is legally binding and will be audit-logged.
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setSelectedStep(null);
                }}
                className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-md hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignature}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
