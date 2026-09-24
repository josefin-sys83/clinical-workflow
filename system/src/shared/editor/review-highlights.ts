export interface ReviewFinding {
  textQuote?: string | null;
  severity?: string;
  status?: string;
  description?: string;
  message?: string;
}

const decorationSelector = 'mark[data-review-highlight]';

/** Remove only our visual annotations, preserving edited text and user formatting. */
export function stripReviewHighlights(html: string): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  root.querySelectorAll(decorationSelector).forEach(mark => mark.replaceWith(...mark.childNodes));
  return root.innerHTML;
}

/** Annotate already-sanitized HTML without splitting tags or changing its text. */
export function highlightReviewHtml(
  html: string,
  findings: ReviewFinding[] = [],
  includePlaceholders = false,
): string {
  const root = document.createElement('div');
  root.innerHTML = stripReviewHighlights(html);
  const nodes: { node: Text; start: number; end: number }[] = [];
  let text = '';
  const blockTags = /^(P|DIV|H[1-6]|LI|TR|TD|TH|BLOCKQUOTE|PRE)$/;
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent || '';
      nodes.push({ node: node as Text, start: text.length, end: text.length + value.length });
      text += value;
      return;
    }
    const tag = (node as Element).tagName;
    if (tag === 'BR') { text += '\n'; return; }
    if (blockTags.test(tag)) text += '\n';
    node.childNodes.forEach(visit);
    if (blockTags.test(tag)) text += '\n';
  };
  root.childNodes.forEach(visit);

  // Quotes can span inline tags, HTML entities, or line breaks. Match visible text
  // with normalized whitespace, retaining offsets into the original text nodes.
  let normalized = '';
  const offsets: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/\s+|[^\s]/g)) {
    normalized += /^\s/.test(match[0]) ? ' ' : match[0];
    offsets.push({ start: match.index!, end: match.index! + match[0].length });
  }
  type Annotation = { start: number; end: number; finding?: ReviewFinding };
  const annotations: Annotation[] = [];
  for (const finding of findings) {
    if (finding.status && !['open', 'potentially-resolved'].includes(finding.status)) continue;
    const quote = finding.textQuote?.replace(/\s+/g, ' ').trim();
    if (!quote) continue;
    let from = 0;
    while (from < normalized.length) {
      const start = normalized.indexOf(quote, from);
      if (start < 0) break;
      annotations.push({ start: offsets[start].start, end: offsets[start + quote.length - 1].end, finding });
      from = start + quote.length;
    }
  }
  if (includePlaceholders) {
    for (const match of text.matchAll(/\[(RESULT|TABLE|DATE|CONFIRM):[^\]]+\]/g)) {
      annotations.push({ start: match.index!, end: match.index! + match[0].length });
    }
  }

  for (const { node, start, end } of nodes) {
    const matches = annotations.filter(a => a.start < end && a.end > start);
    if (!matches.length) continue;
    const boundaries = [...new Set([
      start, end, ...matches.flatMap(a => [Math.max(start, a.start), Math.min(end, a.end)]),
    ])].sort((a, b) => a - b);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < boundaries.length - 1; i++) {
      const left = boundaries[i];
      const right = boundaries[i + 1];
      const part = document.createTextNode(node.data.slice(left - start, right - start));
      const active = matches.filter(a => a.start < right && a.end > left);
      if (!active.length) { fragment.append(part); continue; }
      const issues = active.flatMap(a => a.finding ? [a.finding] : []);
      const blocker = issues.some(issue => issue.severity === 'blocker');
      const mark = document.createElement('mark');
      mark.dataset.reviewHighlight = issues.length ? 'finding' : 'placeholder';
      mark.style.backgroundColor = issues.length ? (blocker ? '#fee2e2' : '#fef9c3') : '#fed7aa';
      mark.style.color = issues.length ? 'inherit' : '#9a3412';
      mark.style.borderRadius = '2px';
      if (issues.length) {
        mark.style.borderBottom = `2px solid ${blocker ? '#ef4444' : '#f59e0b'}`;
        mark.title = [...new Set(issues.map(issue => issue.description || issue.message || '').filter(Boolean))].join('\n');
      }
      mark.append(part);
      fragment.append(mark);
    }
    node.replaceWith(fragment);
  }
  return root.innerHTML;
}
