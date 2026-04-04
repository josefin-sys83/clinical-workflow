import React from 'react';
import { User, CheckCircle, FileText, AlertCircle } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review' | 'Locked';

interface WorkingModeIndicatorProps {
  mode: ReviewMode;
}

const modeConfig: {
  [key in ReviewMode]: {
    label: string;
    role: string;
    action: string;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
  };
} = {
  Draft: {
    label: 'Editing',
    role: 'Medical Writer',
    action: 'Review content and mark sections complete',
    icon: <FileText className="w-4 h-4" />,
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-900'
  },
  Review: {
    label: 'Review Mode',
    role: 'Review Team',
    action: 'Review and approve content sections',
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-900'
  },
  Locked: {
    label: 'Locked',
    role: 'Read-only',
    action: 'Protocol locked for amendments',
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700'
  }
};

export function WorkingModeIndicator({ mode }: WorkingModeIndicatorProps) {
  const config = modeConfig[mode];

  return (
    <div className={`px-4 py-3 ${config.bgColor} border-b border-slate-200`}>
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <div className={config.textColor}>
          {config.icon}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-semibold ${config.textColor}`}>
            {config.label}
          </span>
          <span className="text-slate-400">•</span>
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-700">{config.role}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">{config.action}</span>
        </div>
      </div>
    </div>
  );
}