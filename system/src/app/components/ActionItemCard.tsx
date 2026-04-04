import { AlertCircle, Calendar, Clock, Sparkles } from 'lucide-react';
import { OpenItem } from '../types/project';
import { Badge } from './ui/badge';

interface ActionItemCardProps {
  item: OpenItem;
  isBlocker: boolean;
  onItemClick: (link: string) => void;
}

export function ActionItemCard({ item, isBlocker, onItemClick }: ActionItemCardProps) {
  const today = new Date('2026-02-16');
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  
  // Calculate days until due
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue >= 0;

  // Generate AI insight for this action item
  const getAIInsight = () => {
    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntilDue!);
      return {
        type: 'warning' as const,
        text: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Consider delegating or requesting deadline extension.`
      };
    }
    
    if (isDueSoon) {
      return {
        type: 'warning' as const,
        text: 'Due within 48 hours. Focus on this high-priority item.'
      };
    }
    
    if (item.action === 'Sign') {
      return {
        type: 'suggestion' as const,
        text: 'Signature required. Typically requires Quality Assurance review before signing.'
      };
    }
    
    return null;
  };

  const insight = getAIInsight();

  const getInsightStyle = (type: 'warning' | 'suggestion') => {
    switch (type) {
      case 'warning':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'suggestion':
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getPriorityColor = () => {
    if (isBlocker) return 'text-red-600 bg-red-50 border-red-200';
    if (isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    if (isDueSoon) return 'text-orange-600 bg-orange-50 border-orange-200';
    
    switch (item.priority) {
      case 'High':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionBadgeColor = () => {
    switch (item.action) {
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

  const formatDueDate = () => {
    if (!dueDate) return null;
    
    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntilDue!);
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

  return (
    <button
      onClick={() => onItemClick(item.link)}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 transition-all hover:shadow-sm hover:border-gray-300"
    >
      <div className="space-y-3">
        {/* Header with action and priority */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getActionBadgeColor()} variant="secondary">
              {item.action}
            </Badge>
          </div>
          {formatDueDate()}
        </div>

        {/* Document and section */}
        <div>
          <div className="font-medium text-gray-900 text-sm mb-1">
            {item.document}
          </div>
          {item.section && (
            <div className="text-xs text-gray-600">
              {item.section}
            </div>
          )}
          {item.description && (
            <div className="text-xs text-gray-700 leading-relaxed mt-2">
              {item.description}
            </div>
          )}
        </div>

        {/* Project name */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Project:</span>
          <span className="text-xs text-gray-700 font-medium">{item.projectName}</span>
        </div>

        {/* AI Insight */}
        {insight && (
          <div className={`flex items-start gap-2 p-2 rounded-lg border ${getInsightStyle(insight.type)}`}>
            <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div className="text-xs leading-relaxed">
              {insight.text}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}