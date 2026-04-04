import React, { useState } from 'react';
import { CheckCircle2, Lock, Circle, AlertCircle } from 'lucide-react';

interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'locked' | 'active' | 'pending';
  tooltip: string;
}

const steps: WorkflowStep[] = [
  {
    id: '1',
    label: 'Project Setup',
    status: 'completed',
    tooltip: 'Initial project configuration, team assignment, and regulatory strategy definition'
  },
  {
    id: '2',
    label: 'Synopsis',
    status: 'completed',
    tooltip: 'High-level study overview including rationale, objectives, and design approach'
  },
  {
    id: '3',
    label: 'Gate 1 – Scope & Intended Use',
    status: 'locked',
    tooltip: 'Approved and locked device scope, intended use, and target population. Changes require amendment.'
  },
  {
    id: '4',
    label: 'Standards & Requirements',
    status: 'locked',
    tooltip: 'Locked regulatory standards (ISO 14155, MDR, FDA) and compliance requirements'
  },
  {
    id: '5',
    label: 'Objectives & Endpoints',
    status: 'locked',
    tooltip: 'Locked primary and secondary endpoints. Feeds into protocol and SAP automatically.'
  },
  {
    id: '6',
    label: 'Gate 2 – Protocol Development',
    status: 'active',
    tooltip: 'Current stage: Drafting and reviewing the Clinical Investigation Protocol (CIP)'
  },
  {
    id: '7',
    label: 'Gate 3 – Statistical Analysis Plan',
    status: 'locked',
    tooltip: 'Locked until Protocol is approved. SAP must align with locked endpoints and study design.'
  },
  {
    id: '8',
    label: 'Gate 4 – Export & Submission',
    status: 'locked',
    tooltip: 'Final regulatory submission package. Locked until all prior gates are approved.'
  }
];

export function WorkflowStepper() {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-slate-400" />;
      case 'active':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'locked':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  const getStatusLabel = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'locked':
        return 'Locked';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
    }
  };

  return (
    <div className="relative">
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[10px] top-10 w-0.5 h-12 bg-slate-200" />
          )}

          {/* Step Item */}
          <div
            className="relative mb-4"
            onMouseEnter={() => setHoveredStep(step.id)}
            onMouseLeave={() => setHoveredStep(null)}
          >
            <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              step.status === 'active' ? 'bg-blue-50' : 'hover:bg-slate-50'
            }`}>
              <div className="mt-0.5 flex-shrink-0">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 mb-1">{step.label}</div>
                <span className={`inline-block px-2 py-0.5 text-xs rounded border ${getStatusColor(step.status)}`}>
                  {getStatusLabel(step.status)}
                </span>
              </div>
            </div>

            {/* Tooltip */}
            {hoveredStep === step.id && (
              <div className="absolute left-full top-0 ml-2 z-10 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                <div className="absolute left-0 top-4 -ml-1 w-2 h-2 bg-slate-900 transform rotate-45" />
                {step.tooltip}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
