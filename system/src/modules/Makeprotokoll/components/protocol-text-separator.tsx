import React from 'react';

interface ProtocolTextSeparatorProps {
  children: React.ReactNode;
}

interface MetadataSeparatorProps {
  children: React.ReactNode;
  label?: string;
}

/**
 * Wraps actual protocol text content - this is what gets exported
 * and submitted to regulatory authorities.
 */
export function ProtocolTextSeparator({ children }: ProtocolTextSeparatorProps) {
  return (
    <div className="border-2 border-slate-300 rounded bg-white relative">
      {/* Inspection Label */}
      <div className="absolute -top-2.5 left-3 px-2 bg-white border border-slate-300 rounded">
        <span className="text-xs font-medium text-slate-700">
          PROTOCOL TEXT
        </span>
      </div>
      <div className="p-4">
        {children}
      </div>
      {/* Footer Label */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          <strong>For regulatory inspection:</strong> Only content within "PROTOCOL TEXT" 
          boundaries is included in official protocol documents and regulatory submissions.
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps supporting content - comments, guidance, AI suggestions.
 * This content is NOT included in protocol exports.
 */
export function MetadataSeparator({ children, label = "SUPPORTING CONTENT" }: MetadataSeparatorProps) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded bg-slate-50/50 relative">
      {/* Inspection Label */}
      <div className="absolute -top-2.5 left-3 px-2 bg-slate-50 border border-dashed border-slate-200 rounded">
        <span className="text-xs font-medium text-slate-500">
          {label} (Not exported)
        </span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
