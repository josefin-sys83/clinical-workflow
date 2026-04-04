import { Sparkles, AlertCircle, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Project, OpenItem } from '../types/project';
import { useState } from 'react';

interface AIInsightsProps {
  projects: Project[];
  items: OpenItem[];
}

export function AIInsights({ projects, items }: AIInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const generateInsights = () => {
    const insights: Array<{ type: 'critical' | 'warning' | 'suggestion', text: string }> = [];
    
    // Check for overdue items
    const today = new Date('2026-02-16');
    const overdueItems = items.filter(item => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      return dueDate < today;
    });
    
    if (overdueItems.length > 0) {
      insights.push({
        type: 'warning',
        text: `You have ${overdueItems.length} overdue action${overdueItems.length > 1 ? 's' : ''}. Consider delegating or requesting deadline extensions.`
      });
    }
    
    // Check for urgent items
    const urgentItems = items.filter(item => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 2 && daysUntilDue >= 0;
    });
    
    if (urgentItems.length > 0) {
      insights.push({
        type: 'warning',
        text: `${urgentItems.length} action${urgentItems.length > 1 ? 's are' : ' is'} due within 48 hours. Focus on high-priority items first.`
      });
    }
    
    // Check for signature items
    const signatureItems = items.filter(item => item.action === 'Sign');
    if (signatureItems.length > 0) {
      insights.push({
        type: 'suggestion',
        text: `${signatureItems.length} document${signatureItems.length > 1 ? 's' : ''} awaiting your signature. These typically require Quality Assurance review before signing.`
      });
    }
    
    // Check project phase status
    const atRiskProjects = projects.filter(p => p.status === 'At Risk');
    if (atRiskProjects.length > 0) {
      atRiskProjects.forEach(project => {
        if (project.phase === 'Protocol') {
          insights.push({
            type: 'suggestion',
            text: `${project.name} is at risk in ${project.phase} phase. Consider scheduling a team sync to address dependencies.`
          });
        }
      });
    }
    
    // Positive insights
    const onTrackProjects = projects.filter(p => p.status === 'On Track' && p.blockers === 0);
    if (onTrackProjects.length > 0 && insights.length === 0) {
      insights.push({
        type: 'suggestion',
        text: `All projects are on track. Continue monitoring critical path items in ${onTrackProjects[0].phase} phase.`
      });
    }
    
    return insights;
  };

  const insights = generateInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'suggestion':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Sparkles className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'suggestion':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
        <button
          className="ml-auto"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getInsightStyle(insight.type)}`}
            >
              <div className="mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}