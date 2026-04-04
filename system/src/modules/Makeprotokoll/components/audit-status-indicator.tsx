import React from 'react';
import { CheckCircle, Activity } from 'lucide-react';

interface AuditStatusIndicatorProps {
  status: string;
}

export function AuditStatusIndicator({ status }: AuditStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-xs font-medium text-green-700">{status}</span>
    </div>
  );
}