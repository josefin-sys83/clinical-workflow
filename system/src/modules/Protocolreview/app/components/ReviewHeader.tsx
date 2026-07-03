import { ChevronRight, UserCircle2 } from 'lucide-react';
import type { ReviewRole } from '../types/review';

interface AvailableRole {
  role: ReviewRole;
  name: string;
  label: string;
}

interface ReviewHeaderProps {
  activeStep?: string;
  availableRoles?: AvailableRole[];
  activeRole?: ReviewRole;
  onRoleChange?: (role: ReviewRole) => void;
}

export function ReviewHeader({
  activeStep = 'Protocol review',
  availableRoles = [],
  activeRole,
  onRoleChange,
}: ReviewHeaderProps) {
  const navigationSteps = [
    'Project setup',
    'Protocol authoring',
    'Protocol review',
    'Protocol approval',
    'Report authoring',
    'Report review',
    'Report approval',
  ];

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-6">
        {/* Left: role switcher */}
        <div className="flex-1 min-w-0">
          {availableRoles.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 max-w-[280px]">
              <UserCircle2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Acting as</span>
              <select
                value={activeRole}
                onChange={(e) => onRoleChange?.(e.target.value as ReviewRole)}
                className="text-xs font-medium text-slate-800 bg-transparent border-0 outline-none cursor-pointer truncate"
              >
                {availableRoles.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.name} · {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center: workflow breadcrumb */}
        <nav className="flex items-center gap-0.5 text-neutral-400 flex-shrink-0">
          {navigationSteps.map((step, index) => (
            <div key={step} className="flex items-center">
              <span
                className={
                  step === activeStep
                    ? 'text-sm font-semibold text-neutral-900'
                    : 'text-xs text-neutral-400'
                }
              >
                {step}
              </span>
              {index < navigationSteps.length - 1 && (
                <ChevronRight className="h-3 w-3 mx-0.5 text-neutral-300" />
              )}
            </div>
          ))}
        </nav>

        {/* Right: spacer to keep breadcrumb centred */}
        <div className="flex-1" />
      </div>
    </header>
  );
}
