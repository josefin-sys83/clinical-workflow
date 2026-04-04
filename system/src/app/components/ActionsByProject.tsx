import { AlertCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { OpenItem, Project } from '../types/project';
import { Badge } from './ui/badge';

interface ActionsByProjectProps {
  items: OpenItem[];
  projects: Project[];
  onItemClick: (link: string) => void;
}

export function ActionsByProject({ items, projects, onItemClick }: ActionsByProjectProps) {
  // Group items by project
  const itemsByProject = items.reduce((acc, item) => {
    if (!acc[item.projectId]) {
      acc[item.projectId] = [];
    }
    acc[item.projectId].push(item);
    return acc;
  }, {} as Record<string, OpenItem[]>);

  const today = new Date('2026-02-16');

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const daysUntilDue = getDaysUntilDue(dueDate);
    if (daysUntilDue === null) return null;

    const isOverdue = daysUntilDue < 0;
    const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntilDue);
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}</span>
        </div>
      );
    }
    
    if (daysUntilDue === 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <Clock className="h-3.5 w-3.5" />
          <span>Due today</span>
        </div>
      );
    }
    
    if (daysUntilDue === 1) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <Clock className="h-3.5 w-3.5" />
          <span>Due tomorrow</span>
        </div>
      );
    }
    
    if (isDueSoon) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>Due in {daysUntilDue} days</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar className="h-3.5 w-3.5" />
        <span>Due in {daysUntilDue} days</span>
      </div>
    );
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'Sign':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Review':
        return 'bg-gray-50 text-gray-700 border border-gray-300';
      case 'Input needed':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'Blocker':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const isItemOverdue = (item: OpenItem) => {
    const days = getDaysUntilDue(item.dueDate);
    return days !== null && days < 0;
  };

  const isItemUrgent = (item: OpenItem) => {
    const days = getDaysUntilDue(item.dueDate);
    return days !== null && days <= 2 && days >= 0;
  };

  const isBlocker = (item: OpenItem) => {
    const project = projects.find(p => p.id === item.projectId);
    return (project?.blockers || 0) > 0 && item.priority === 'High';
  };

  return (
    <div className="space-y-6">
      {Object.entries(itemsByProject).map(([projectId, projectItems]) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return null;

        return (
          <div key={projectId} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">{project.name}</h3>
              <Badge variant="outline" className="text-xs">
                {project.phase}
              </Badge>
              <span className="text-xs text-gray-500">
                {projectItems.length} action{projectItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {projectItems.map((item) => {
                const overdue = isItemOverdue(item);
                const urgent = isItemUrgent(item);
                const blocker = isBlocker(item);

                return (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item.link)}
                    className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 transition-all hover:shadow-sm hover:border-gray-300 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionBadgeColor(item.action)} variant="secondary">
                            {item.action}
                          </Badge>
                        </div>

                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {item.document}
                          </div>
                          {item.section && (
                            <div className="text-xs text-gray-600 mt-1">
                              {item.section}
                            </div>
                          )}
                          {item.description && (
                            <div className="text-xs text-gray-700 leading-relaxed mt-2">
                              {item.description}
                            </div>
                          )}
                        </div>

                        {item.dueDate && (
                          <div>{formatDueDate(item.dueDate)}</div>
                        )}
                      </div>

                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}