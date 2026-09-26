import type { ReviewFinding } from './review-highlights';

/** Findings remain reviewable when their original passage no longer has a highlight. */
export function ReviewAnchorNotice({ findings }: { findings: ReviewFinding[] }) {
  const unanchored = findings.filter(finding => finding.anchor && finding.anchor.status !== 'attached');
  if (!unanchored.length) return null;
  return (
    <div role="status" className="mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      {unanchored.map((finding, index) => (
        <p key={finding.id || index}>
          <strong>{finding.anchor?.status === 'orphaned' ? 'Orphaned' : 'Ambiguous anchor'}:</strong>{' '}
          {finding.description || finding.message}{' — '}
          {finding.anchor?.status === 'orphaned'
            ? 'The original quoted text was removed or changed. This finding has not been moved to other text.'
            : 'The quote occurs more than once. No passage has been selected automatically.'}
        </p>
      ))}
    </div>
  );
}
