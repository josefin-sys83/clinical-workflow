import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { useMilestones, getMilestoneDaysLabel } from '@/shared/hooks/useMilestones';

interface ProjectCardProps {
  project: any;
  onViewProject: (projectId: string) => void;
}


const PROTOCOL_STEPS = ['synopsis', 'scope', 'protocol-make', 'protocol-review', 'protocol-pdf'];
const REPORT_STEPS = ['report-make', 'report-review', 'report-pdf'];

function MilestoneTimeline({ projectId }: { projectId: string }) {
  const { milestones, loading } = useMilestones(projectId);
  if (loading || !milestones) return null;

  const byId = Object.fromEntries(milestones.milestones.map(m => [m.stepId, m]));
  const ethicsDate = milestones.milestones.find(m => m.anchorLabel === 'Ethics Submission')?.anchorDate;
  const submissionDate = milestones.milestones.find(m => m.anchorLabel === 'Regulatory Submission')?.anchorDate;

  if (!ethicsDate && !submissionDate) return null;

  const renderStep = (stepId: string) => {
    const m = byId[stepId];
    if (!m) return null;
    const daysLabel = getMilestoneDaysLabel(m);
    const isAlert = m.status === 'urgent' || m.status === 'overdue' || m.status === 'soon';
    return (
      <div key={stepId} className="flex items-center gap-2 py-0.5">
        <span className={`text-xs flex-1 ${isAlert ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
          {m.stepName}
        </span>
        {m.deadline && (
          <span className={`text-xs tabular-nums ${
            m.status === 'overdue' ? 'text-rose-700 font-medium' :
            m.status === 'urgent' ? 'text-red-500 font-medium' :
            m.status === 'soon' ? 'text-amber-600' :
            'text-gray-400'
          }`}>
            {m.deadline}{daysLabel ? ` · ${daysLabel}` : ''}
          </span>
        )}
      </div>
    );
  };

  const renderAnchor = (label: string, date: string | undefined) => {
    if (!date) return null;
    return (
      <div className="flex items-center gap-2 py-1 my-0.5">
        <div className="flex-1 border-t border-dashed border-blue-200" />
        <span className="text-xs text-blue-600 font-medium px-1 whitespace-nowrap">{label}: {date}</span>
        <div className="flex-1 border-t border-dashed border-blue-200" />
      </div>
    );
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Milestones</span>
      </div>
      <div className="space-y-0">
        {PROTOCOL_STEPS.map(renderStep)}
        {renderAnchor('Ethics Submission', ethicsDate)}
        {REPORT_STEPS.map(renderStep)}
        {renderAnchor('Regulatory Submission', submissionDate)}
      </div>
    </div>
  );
}

export function ProjectCard({ project, onViewProject }: ProjectCardProps) {
  const projectData = project.data?.projectData || {};
  const hasAnchorDates = projectData.ethicsSubmissionTarget || projectData.regulatorySubmissionTarget;
  const [showMilestones, setShowMilestones] = useState(false);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
          <div className="text-sm text-gray-500 mb-2">ID: {project.id}</div>
          {project.description && (
            <div className="text-sm text-gray-600">{project.description}</div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              project.status === 'completed'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {project.status === 'completed' ? 'Completed' : 'Active'}
            </span>
            {hasAnchorDates && (
              <button
                onClick={() => setShowMilestones(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showMilestones ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Timeline
              </button>
            )}
          </div>
          {showMilestones && hasAnchorDates && (
            <MilestoneTimeline projectId={project.id} />
          )}
        </div>
        <Button
          onClick={() => onViewProject(project.id)}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 gap-2 flex-shrink-0"
        >
          Go to project
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
