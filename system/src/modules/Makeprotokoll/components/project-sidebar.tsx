import React from 'react';
import { FileText, CheckCircle, Lock, AlertCircle, ChevronRight } from 'lucide-react';

type NavigationItem = {
  id: string;
  label: string;
  status: 'locked' | 'active' | 'pending' | 'complete';
  icon?: React.ReactNode;
};

interface WorkflowGate {
  id: string;
  number: string;
  title: string;
  status: 'Completed' | 'Active' | 'Locked' | 'Pending';
}

interface ProjectSidebarProps {
  gates: WorkflowGate[];
  currentGateId?: string;
}

export function ProjectSidebar({ gates, currentGateId }: ProjectSidebarProps) {
  const onNavigate = (gateId: string) => {
    console.log('Navigate to gate:', gateId);
  };

  const getGateStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Active':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Locked':
        return <Lock className="w-4 h-4 text-slate-500" />;
      case 'Pending':
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusStyles = (status: string, isActive: boolean) => {
    if (isActive) {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    }
    switch (status) {
      case 'Locked':
        return 'text-slate-600 hover:bg-slate-50';
      case 'Completed':
        return 'text-slate-700 hover:bg-slate-50';
      case 'Active':
        return 'text-slate-900 hover:bg-slate-50';
      case 'Pending':
        return 'text-slate-400 hover:bg-slate-50';
      default:
        return 'text-slate-700 hover:bg-slate-50';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
      <div className="p-4">
        {/* Project Info */}
        <div className="mb-6 pb-4 border-b border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Project
          </div>
          <div className="text-sm font-semibold text-slate-900">
            TAVR-EVOLVE-EU
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Protocol v4.0.1
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {gates.map((gate) => {
            const isActive = gate.status === 'Active';
            return (
              <button
                key={gate.id}
                onClick={() => onNavigate(gate.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors border ${
                  getStatusStyles(gate.status, isActive)
                } ${isActive ? 'border-blue-200' : 'border-transparent'}`}
                disabled={gate.status === 'Pending'}
              >
                <div className="flex items-center gap-2.5">
                  {getGateStatusIcon(gate.status)}
                  <span className="font-medium">{gate.title}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Quick Stats
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Completion</span>
              <span className="font-semibold text-slate-900">73%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Open Issues</span>
              <span className="font-semibold text-amber-700">4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Blockers</span>
              <span className="font-semibold text-red-700">1</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}