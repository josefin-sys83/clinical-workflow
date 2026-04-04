import React from 'react';
import { MessageSquare, CheckCircle, AlertCircle, FileText, Clock } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review1' | 'Review2' | 'Review3' | 'Review4' | 'Locked';

interface ReviewActivity {
  id: string;
  type: 'comment' | 'approval' | 'change' | 'resolve';
  user: string;
  userRole: string;
  action: string;
  section?: string;
  timestamp: string;
  relevantForMode: ReviewMode[];
}

interface ReviewQueueItem {
  section: string;
  title: string;
  reviewer: string;
  reviewerRole: string;
  dueDate: string;
}

const activities: ReviewActivity[] = [
  {
    id: 'a1',
    type: 'comment',
    user: 'Anna Schmidt',
    userRole: 'Regulatory Affairs',
    action: 'commented on endpoint definition',
    section: '4.2',
    timestamp: '2 hours ago',
    relevantForMode: ['Review1', 'Review2']
  },
  {
    id: 'a2',
    type: 'resolve',
    user: 'Emma Rodriguez',
    userRole: 'Medical Writer',
    action: 'resolved 3 comments',
    section: '4.2',
    timestamp: '3 hours ago',
    relevantForMode: ['Review1']
  },
  {
    id: 'a3',
    type: 'approval',
    user: 'Dr. James Patterson',
    userRole: 'Clinical Lead',
    action: 'approved section',
    section: '4.6',
    timestamp: '1 day ago',
    relevantForMode: ['Review1', 'Review2', 'Review3']
  },
  {
    id: 'a4',
    type: 'change',
    user: 'Dr. Michael Zhang',
    userRole: 'Biostatistician',
    action: 'updated sample size calculation',
    section: '4.8',
    timestamp: '1 day ago',
    relevantForMode: ['Draft', 'Review1']
  },
  {
    id: 'a5',
    type: 'approval',
    user: 'Anna Schmidt',
    userRole: 'Regulatory Affairs',
    action: 'approved for regulatory baseline',
    section: '4.3',
    timestamp: '2 days ago',
    relevantForMode: ['Review2', 'Review3']
  }
];

const reviewQueue: { [key in ReviewMode]?: ReviewQueueItem[] } = {
  Review1: [
    {
      section: '4.2',
      title: 'Study Rationale & Objectives',
      reviewer: 'Dr. James Patterson',
      reviewerRole: 'Clinical Lead',
      dueDate: 'Feb 5, 2026'
    },
    {
      section: '4.4',
      title: 'Study Design',
      reviewer: 'Dr. Michael Zhang',
      reviewerRole: 'Biostatistician',
      dueDate: 'Feb 5, 2026'
    }
  ],
  Review2: [
    {
      section: '4.2',
      title: 'Study Rationale & Objectives',
      reviewer: 'Anna Schmidt',
      reviewerRole: 'Regulatory Affairs',
      dueDate: 'Feb 6, 2026'
    },
    {
      section: '4.7',
      title: 'Safety Monitoring',
      reviewer: 'Anna Schmidt',
      reviewerRole: 'Regulatory Affairs',
      dueDate: 'Feb 6, 2026'
    }
  ],
  Review3: [
    {
      section: '4.7',
      title: 'Safety Monitoring',
      reviewer: 'Robert Johnson',
      reviewerRole: 'QA Manager',
      dueDate: 'Feb 7, 2026'
    }
  ],
  Review4: [
    {
      section: 'All sections',
      title: 'Final Protocol Sign-off',
      reviewer: 'Dr. Sarah Chen',
      reviewerRole: 'Protocol Lead',
      dueDate: 'Feb 8, 2026'
    }
  ]
};

interface ReviewActivityPanelProps {
  reviewMode: ReviewMode;
}

export function ReviewActivityPanel({ reviewMode }: ReviewActivityPanelProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'change':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'resolve':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getUserColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-amber-600', 'bg-red-600'];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Filter activities relevant to current review mode
  const relevantActivities = activities.filter(activity => 
    activity.relevantForMode.includes(reviewMode)
  ).slice(0, 5);

  const currentReviewQueue = reviewQueue[reviewMode] || [];

  return (
    <div>
      {/* Review Queue */}
      {currentReviewQueue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Review Queue
          </h3>
          <div className="space-y-2">
            {currentReviewQueue.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-700 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      {item.section} {item.title}
                    </div>
                    <div className="text-xs text-slate-700 mb-1">
                      Reviewer: {item.reviewer}
                    </div>
                    <div className="text-xs text-slate-600">
                      {item.reviewerRole} • Due {item.dueDate}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Activity */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Review Activity
        </h3>
        <div className="space-y-3">
          {relevantActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3"
            >
              <div className={`w-8 h-8 rounded-full ${getUserColor(activity.user)} flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                {getUserInitials(activity.user)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getActivityIcon(activity.type)}
                  <span className="text-sm font-medium text-slate-900">
                    {activity.user}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mb-1">
                  {activity.action}
                  {activity.section && (
                    <span className="text-slate-500"> in § {activity.section}</span>
                  )}
                </p>
                <div className="text-xs text-slate-500">
                  {activity.userRole} • {activity.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Reviewers for Current Round */}
      {(reviewMode === 'Review1' || reviewMode === 'Review2' || reviewMode === 'Review3') && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Assigned Reviewers
          </h3>
          <div className="space-y-2">
            {reviewMode === 'Review1' && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                    JP
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Dr. James Patterson</div>
                    <div className="text-slate-600">Clinical Lead</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                    MZ
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Dr. Michael Zhang</div>
                    <div className="text-slate-600">Biostatistician</div>
                  </div>
                </div>
              </>
            )}
            {reviewMode === 'Review2' && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white font-medium">
                  AS
                </div>
                <div>
                  <div className="font-medium text-slate-900">Anna Schmidt</div>
                  <div className="text-slate-600">Regulatory Affairs</div>
                </div>
              </div>
            )}
            {reviewMode === 'Review3' && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  RJ
                </div>
                <div>
                  <div className="font-medium text-slate-900">Robert Johnson</div>
                  <div className="text-slate-600">QA Manager</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
