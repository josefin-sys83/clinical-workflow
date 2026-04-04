import React from 'react';
import { Lock } from 'lucide-react';

interface LockedStateContainerProps {
  title?: string;
  message: string;
  showIcon?: boolean;
}

export function LockedStateContainer({ 
  title, 
  message, 
  showIcon = true 
}: LockedStateContainerProps) {
  return (
    <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
      <div className="flex gap-3">
        {showIcon && (
          <Lock className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
        )}
        <div>
          {title && (
            <div className="text-slate-900 mb-1">{title}</div>
          )}
          <div className="text-sm text-slate-600">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
