import React from 'react';
import { CheckCircle, Activity } from 'lucide-react';

interface AuditStatusIndicatorProps {
  status: string;
}

export function AuditStatusIndicator({ status }: AuditStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
      <CheckCircle className="w-4 h-4 text-indigo-600" />
      <span className="text-xs font-medium text-blue-700">{status}</span>
    </div>
  );
}