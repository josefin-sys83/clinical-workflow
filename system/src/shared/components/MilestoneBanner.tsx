import { AlertTriangle } from 'lucide-react';
import { useMilestones, getMilestoneDaysLabel, type MilestoneWarning } from '../hooks/useMilestones';

interface BannerProps {
  projectId?: string;
  currentStepId: string;
}

interface WarningsProps {
  projectId?: string;
  warnings?: MilestoneWarning[];
  refreshKey?: unknown;
  className?: string;
}

export function MilestoneWarnings({ projectId, warnings, refreshKey, className = '' }: WarningsProps) {
  const { milestones } = useMilestones(projectId, refreshKey);
  const advisoryWarnings = warnings ?? milestones?.warnings ?? [];

  if (advisoryWarnings.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite">
      {advisoryWarnings.map(warning => (
        <div key={warning.code} className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Timeline warning</p>
            <p className="mt-1">{warning.message}</p>
            <p className="mt-1 text-xs text-amber-800">This warning is advisory. You can still save and proceed.</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MilestoneBanner({ projectId, currentStepId }: BannerProps) {
  const { milestones } = useMilestones(projectId);
  const step = milestones?.milestones.find(m => m.stepId === currentStepId);
  const showStepDeadline = Boolean(step && !['complete', 'no_date', 'on_track'].includes(step.status));

  if (!showStepDeadline || !step) return null;

  return (
    <div className="mx-8 mt-4 mb-4" role="status" aria-live="polite">
      <div className="px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
        <span className="font-medium">{step.stepName} must be completed by {step.deadline}</span>
        <span className="ml-1.5 opacity-80">— {getMilestoneDaysLabel(step)}</span>
        {step.anchorLabel && (
          <p className="mt-1 opacity-80 text-xs">
            Responsible: {step.responsibleName} · {step.anchorLabel} planned for {step.anchorDate}
          </p>
        )}
      </div>
    </div>
  );
}
