import { useMilestones, getMilestoneDaysLabel } from '../hooks/useMilestones';

interface Props {
  projectId: string;
  currentStepId: string;
}

export function MilestoneBanner({ projectId, currentStepId }: Props) {
  const { milestones } = useMilestones(projectId);
  if (!milestones) return null;

  const step = milestones.milestones.find(m => m.stepId === currentStepId);
  if (!step || step.status === 'complete' || step.status === 'no_date' || step.status === 'on_track') return null;

  return (
    <div className="mx-8 mb-4 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
      <span className="font-medium">
        {step.stepName} must be completed by {step.deadline}
      </span>
      <span className="ml-1.5 opacity-80">
        — {getMilestoneDaysLabel(step)}
      </span>
      {step.anchorLabel && (
        <p className="mt-1 opacity-80 text-xs">
          Responsible: {step.responsibleName} · {step.anchorLabel} planned for {step.anchorDate}
        </p>
      )}
    </div>
  );
}
