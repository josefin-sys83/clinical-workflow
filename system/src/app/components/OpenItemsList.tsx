import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import { OpenItem } from '../types/project';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

interface OpenItemsListProps {
  items: OpenItem[];
  onItemClick: (link: string) => void;
}

export function OpenItemsList({ items, onItemClick }: OpenItemsListProps) {
  const getRoleBadgeClass = (role: OpenItem['myRole']) => {
    switch (role) {
      case 'Author':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Reviewer':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'Approver':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Principal Investigator':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'Observer':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getActionBadgeClass = (action: OpenItem['action']) => {
    switch (action) {
      case 'Review':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Approve':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Edit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Sign':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Upload':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Comment':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: OpenItem['priority']) => {
    switch (priority) {
      case 'High':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            High Priority
          </Badge>
        );
      case 'Medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'Low':
        return <Badge variant="outline">Low Priority</Badge>;
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date('2026-02-16'); // Using current date from context
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-red-600' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600' };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, color: 'text-yellow-600' };
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-gray-600' };
    }
  };

  // Group items by priority
  const groupedItems = {
    High: items.filter((item) => item.priority === 'High'),
    Medium: items.filter((item) => item.priority === 'Medium'),
    Low: items.filter((item) => item.priority === 'Low'),
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(
        ([priority, priorityItems]) =>
          priorityItems.length > 0 && (
            <div key={priority}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {priority} Priority ({priorityItems.length})
              </h3>
              <div className="space-y-3">
                {priorityItems.map((item) => {
                  const dueDate = item.dueDate
                    ? formatDueDate(item.dueDate)
                    : null;
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium">
                              {item.projectName}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {item.document}
                              {item.section && ` • ${item.section}`}
                            </CardDescription>
                          </div>
                          {getPriorityBadge(item.priority)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge className={getRoleBadgeClass(item.myRole)}>
                            {item.myRole}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getActionBadgeClass(item.action)}
                          >
                            {item.action}
                          </Badge>
                          {dueDate && (
                            <div
                              className={`flex items-center gap-1 text-sm ${dueDate.color}`}
                            >
                              <Calendar className="h-3 w-3" />
                              <span>{dueDate.text}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => onItemClick(item.link)}
                        >
                          Go to {item.action}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )
      )}
    </div>
  );
}
