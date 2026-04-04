import React from 'react';
import { Shield, Eye } from 'lucide-react';
import { ProtocolState, UserRole } from '../App';

interface GlobalHeaderProps {
  projectName: string;
  protocolId: string;
  version: string;
  protocolState: ProtocolState;
  currentUserRole: UserRole;
  onViewAuditTrail?: () => void;
}

export function GlobalHeader({ 
  projectName, 
  protocolId,
  version,
  protocolState, 
  currentUserRole,
  onViewAuditTrail 
}: GlobalHeaderProps) {
  const getStateColor = () => {
    switch (protocolState) {
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'In Review': return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'Reopened': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Locked': return 'bg-green-50 text-green-700 border-green-300';
    }
  };

  return (
    <div className="bg-white border-b border-slate-300">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Product + Project */}
        <div className="flex items-center gap-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            MedTech Protocol Builder
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {projectName}
            </div>
            <div className="text-xs text-slate-600">
              {protocolId} · {version}
            </div>
          </div>
        </div>

        {/* Center: Status Badge */}
        <div className={`px-3 py-1.5 border rounded text-xs font-medium ${getStateColor()}`}>
          {protocolState}
        </div>

        {/* Right: Role + Audit */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs">
            <span className="text-slate-600">Role:</span>{' '}
            <span className="font-medium text-slate-900">{currentUserRole}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-300 rounded text-xs">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            <span className="text-green-700 font-medium">Logging ON</span>
          </div>
          <button
            onClick={onViewAuditTrail}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}