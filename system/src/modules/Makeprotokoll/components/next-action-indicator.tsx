import React from 'react';
import { ChevronRight, User } from 'lucide-react';

type ReviewMode = 'Draft' | 'Review' | 'Locked';

interface NextActionIndicatorProps {
  reviewMode: ReviewMode;
  blockerCount: number;
  currentUser: {
    name: string;
    role: string;
  };
  sectionsComplete: number;
  sectionsTotal: number;
  sectionsUnderReview: number;
  sectionsApproved: number;
  assignedSections: number;
}

export function NextActionIndicator({
  reviewMode,
  blockerCount,
  currentUser,
  sectionsComplete,
  sectionsTotal,
  sectionsUnderReview,
  sectionsApproved,
  assignedSections
}: NextActionIndicatorProps) {
  
  const getNextAction = () => {
    // Locked mode - Amendment required
    if (reviewMode === 'Locked') {
      return {
        action: 'Protocol is locked for regulatory submission',
        reason: 'All content is baseline-locked per ISO 14155. Any changes require formal protocol amendment with regulatory approval and ethics committee notification.',
        responsible: 'Protocol Lead',
        type: 'info' as const
      };
    }

    // Draft mode with blockers
    if (reviewMode === 'Draft' && blockerCount > 0) {
      return {
        action: `You must resolve ${blockerCount} blocking issue${blockerCount !== 1 ? 's' : ''} before review can begin`,
        reason: `Synopsis conflicts and missing required data prevent regulatory review. Each blocker must be addressed and documented before Review can start.`,
        responsible: currentUser.role,
        type: 'action' as const
      };
    }

    // Draft mode - sections incomplete
    if (reviewMode === 'Draft' && sectionsComplete < sectionsTotal) {
      const remaining = sectionsTotal - sectionsComplete;
      return {
        action: `Complete and mark ${remaining} remaining section${remaining !== 1 ? 's' : ''} as ready for review`,
        reason: `All protocol sections must be marked "Complete" by their assigned owners before Review can begin. This ensures all AI-generated content has been verified.`,
        responsible: 'Section Owners',
        type: 'action' as const
      };
    }

    // Draft mode - ready to start review
    if (reviewMode === 'Draft' && sectionsComplete === sectionsTotal && blockerCount === 0) {
      return {
        action: 'All sections complete — you can now start Review',
        reason: 'All blocking issues resolved and all sections marked complete. Protocol Lead should initiate Review to begin formal approval workflow.',
        responsible: 'Protocol Lead',
        type: 'ready' as const
      };
    }

    // Review rounds - user has assigned sections to approve
    if (reviewMode === 'Review' && assignedSections > 0) {
      return {
        action: `You must review and approve ${assignedSections} section${assignedSections !== 1 ? 's' : ''} assigned to you`,
        reason: `Your approval is required for these sections to progress. Review content, add comments if changes needed, then formally approve. All actions are logged for audit trail.`,
        responsible: currentUser.name,
        type: 'action' as const
      };
    }

    // Review rounds - waiting for other reviewers
    if (reviewMode === 'Review' && assignedSections === 0) {
      const remaining = sectionsTotal - sectionsApproved;
      if (remaining > 0) {
        return {
          action: `Waiting for ${remaining} section${remaining !== 1 ? 's' : ''} to be approved`,
          reason: `This review cycle cannot complete until all assigned approvers have formally approved their sections. You can view progress but cannot approve sections not assigned to you.`,
          responsible: 'Assigned Approvers',
          type: 'waiting' as const
        };
      } else {
        return {
          action: `All sections approved — Review is complete and ready to lock`,
          reason: 'Protocol Lead can now lock the protocol. All approvals are logged and this review cycle will be recorded in the review history.',
          responsible: 'Protocol Lead',
          type: 'ready' as const
        };
      }
    }

    // Default
    return {
      action: 'No action required at this time',
      reason: 'Protocol is in active review',
      responsible: 'Review Team',
      type: 'info' as const
    };
  };

  const nextAction = getNextAction();

  const getBackgroundColor = () => {
    switch (nextAction.type) {
      case 'action':
        return 'bg-blue-50 border-blue-200';
      case 'ready':
        return 'bg-green-50 border-green-200';
      case 'waiting':
        return 'bg-slate-50 border-slate-200';
      case 'info':
        return 'bg-slate-50 border-slate-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getTextColor = () => {
    switch (nextAction.type) {
      case 'action':
        return 'text-blue-900';
      case 'ready':
        return 'text-green-900';
      case 'waiting':
        return 'text-slate-700';
      case 'info':
        return 'text-slate-700';
      default:
        return 'text-slate-700';
    }
  };

  const getIconColor = () => {
    switch (nextAction.type) {
      case 'action':
        return 'text-blue-600';
      case 'ready':
        return 'text-green-600';
      case 'waiting':
        return 'text-slate-400';
      case 'info':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className={`px-5 py-4 border rounded-lg ${getBackgroundColor()}`}>
      <div className="flex items-start gap-3">
        <ChevronRight className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getIconColor()}`} />
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <div className={`text-sm font-semibold ${getTextColor()} mb-1`}>
              {nextAction.action}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {nextAction.reason}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <User className="w-3 h-3 text-slate-400" />
            <span>Responsible: {nextAction.responsible}</span>
          </div>
        </div>
      </div>
    </div>
  );
}