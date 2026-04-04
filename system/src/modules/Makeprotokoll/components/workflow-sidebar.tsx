import React from 'react';
import { CheckCircle, Circle, AlertCircle, Lock, Loader } from 'lucide-react';
import { WorkflowStep, WorkflowStatus } from '../App';

interface WorkflowSidebarProps {
  currentStep: WorkflowStep;
  onNavigate: (step: WorkflowStep) => void;
}

interface StepConfig {
  id: WorkflowStep;
  number: string;
  label: string;
  status: WorkflowStatus;
}

export function WorkflowSidebar({ currentStep, onNavigate }: WorkflowSidebarProps) {
  const steps: StepConfig[] = [
    { id: 'project-setup', number: '1', label: 'Project Setup', status: 'Complete' },
    { id: 'roles-responsibilities', number: '2', label: 'Roles & Responsibilities', status: 'Complete' },
    { id: 'synopsis', number: '3', label: 'Synopsis', status: 'Complete' },
    { id: 'protocol-development', number: '4', label: 'Protocol Development (Gate 2)', status: 'In Progress' },
    { id: 'review', number: '5', label: 'Review', status: 'Not Started' },
    { id: 'locked-archived', number: '6', label: 'Lock & Archive', status: 'Not Started' },
    { id: 'submission-preparation', number: '7', label: 'Submission Preparation', status: 'Not Started' }
  ];

  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'In Progress':
        return <Loader className="w-4 h-4 text-blue-600" />;
      case 'Blocked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'Locked':
        return <Lock className="w-4 h-4 text-slate-600" />;
      case 'Not Started':
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-300 overflow-y-auto">
      <div className="p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Workflow
        </div>
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isClickable = step.status !== 'Not Started';

            return (
              <div key={step.id}>
                <button
                  onClick={() => isClickable && onNavigate(step.id)}
                  disabled={!isClickable}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                    isActive
                      ? 'bg-white border border-slate-300 shadow-sm'
                      : isClickable
                      ? 'hover:bg-slate-200'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                      {step.number}. {step.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {step.status}
                    </div>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className="h-6 ml-6 border-l border-slate-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}