import { Lock, Info } from 'lucide-react';

interface LockedStateContainerProps {
  message: string;
  title?: string;
  icon?: 'lock' | 'info' | 'none';
  className?: string;
}

/**
 * Reusable informational container for blocked or locked workflow states.
 * 
 * Design principles:
 * - Locked states are informational, not emotional
 * - Color is reserved for errors and approvals only
 * - Consistent neutral appearance across all locked states
 * - Communicates stability and predictability in regulated environments
 */
export function LockedStateContainer({ 
  message, 
  title, 
  icon = 'lock',
  className = ''
}: LockedStateContainerProps) {
  return (
    <div className={`p-3 bg-slate-100 rounded-md ${className}`}>
      <div className="flex items-start gap-2">
        {icon === 'lock' && (
          <Lock className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
        )}
        {icon === 'info' && (
          <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {title && (
            <p className="text-sm text-slate-900 mb-1">
              {title}
            </p>
          )}
          <p className="text-xs text-slate-600">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
