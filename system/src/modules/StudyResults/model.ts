export const statusLabels = {
  draft: 'Needing review',
  accepted: 'Accepted',
  'in-appendix': 'In appendix',
  rejected: 'Rejected',
} as const;

export function summarizeResults(
  results: { status: keyof typeof statusLabels }[],
) {
  const counts = { accepted: 0, draft: 0, 'in-appendix': 0, rejected: 0 };
  for (const result of results) counts[result.status]++;
  return {
    counts,
    total: results.length,
    reviewed: results.length - counts.draft,
    percent: results.length
      ? Math.round(((results.length - counts.draft) / results.length) * 100)
      : 0,
  };
}
