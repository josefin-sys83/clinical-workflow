import { theme } from '@/app/theme';

export const ISSUE_SEVERITIES = [
  'blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required',
] as const;

export type IssueSeverity = typeof ISSUE_SEVERITIES[number];

const severityPresentation = {
  blocker: { label: 'Blocker', plural: 'Blockers', badge: theme.status.error, border: theme.border.error, text: theme.text.error },
  warning: { label: 'Warning', plural: 'Warnings', badge: theme.status.warning, border: theme.border.warning, text: theme.text.warning },
  cross_reference: { label: 'Cross-reference', plural: 'Cross-references', badge: theme.status.active, border: theme.border.active, text: theme.text.active },
  recommendation: { label: 'Recommendation', plural: 'Recommendations', badge: 'bg-teal-50 text-teal-800', border: 'border-teal-200', text: 'text-teal-800' },
  human_decision_required: { label: 'Human decision required', plural: 'Human decisions required', badge: theme.status.ai, border: theme.border.ai, text: theme.text.ai },
} satisfies Record<IssueSeverity, { label: string; plural: string; badge: string; border: string; text: string }>;

export function getIssuePresentation(severity: IssueSeverity) {
  return severityPresentation[severity];
}

export function isOpenIssue(issue: { status: string }): boolean {
  return issue.status === 'open';
}

export function countIssueSeverities(issues: readonly { severity: IssueSeverity }[]) {
  return ISSUE_SEVERITIES.map(severity => ({
    severity,
    count: issues.filter(issue => issue.severity === severity).length,
    ...getIssuePresentation(severity),
  })).filter(item => item.count > 0);
}
