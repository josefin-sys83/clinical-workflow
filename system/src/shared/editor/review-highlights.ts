import { ISSUE_SEVERITIES, type IssueSeverity } from '@/shared/protocol/issues';

// Ranges exist only during an edit session. Saved findings are rendered from textQuote.
type ReviewAnchor = { status: 'attached' | 'orphaned' | 'ambiguous'; start: number | null; end: number | null };
type AnchorUpdate = { id: string; anchor: ReviewAnchor };
const detachedAnchor = (): ReviewAnchor => ({ status: 'orphaned', start: null, end: null });
function anchorFinding(finding: ReviewFinding, text: string): ReviewFinding {
  const quote = typeof finding.textQuote === 'string' ? finding.textQuote.replace(/\s+/g, ' ').trim() : '';
  if (!quote) return { ...finding, anchor: null };
  if (finding.anchor) {
    const { status, start, end } = finding.anchor;
    return status === 'attached' && start !== null && end !== null && text.slice(start, end) === quote
      ? finding : { ...finding, anchor: detachedAnchor() };
  }
  const start = text.indexOf(quote);
  return { ...finding, anchor: start < 0 ? detachedAnchor()
    : text.indexOf(quote, start + 1) >= 0 ? { status: 'ambiguous', start: null, end: null }
    : { status: 'attached', start, end: start + quote.length } };
}

export interface ReviewFinding {
  [key: string]: any;
  id?: string;
  anchor?: ReviewAnchor | null;
  textQuote?: string | null;
  severity?: string;
  status?: string;
  description?: string;
  message?: string;
  remediation?: string | null;
  acceptedRisk?: boolean;
}

const decorationSelector = 'mark[data-review-highlight]';

const severityHighlight = {
  blocker: { background: '#fee2e2', border: '#ef4444' },
  warning: { background: '#fef9c3', border: '#f59e0b' },
  cross_reference: { background: '#dbeafe', border: '#3b82f6' },
  recommendation: { background: '#ccfbf1', border: '#14b8a6' },
  human_decision_required: { background: '#f3e8ff', border: '#a855f7' },
} satisfies Record<IssueSeverity, { background: string; border: string }>;

function styleFindingHighlight(mark: HTMLElement, findings: ReviewFinding[]) {
  const severities = ISSUE_SEVERITIES.filter(severity =>
    findings.some(finding => !finding.acceptedRisk && finding.severity === severity));
  if (!severities.length) {
    mark.style.backgroundColor = '#f5f5f5';
    mark.style.backgroundImage = 'none';
    mark.style.borderBottom = '2px solid #d4d4d4';
    return;
  }
  const colors = severities.map(severity => severityHighlight[severity]);
  mark.style.backgroundColor = colors[0].background;
  mark.style.backgroundImage = colors.length > 1
    ? `repeating-linear-gradient(135deg, ${colors.map((color, index) =>
      `${color.background} ${index * 8}px ${(index + 1) * 8}px`).join(', ')})`
    : 'none';
  mark.style.borderBottom = `2px solid ${colors[0].border}`;
}

/** Remove only our visual annotations, preserving edited text and user formatting. */
export function stripReviewHighlights(html: string): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  root.querySelectorAll(decorationSelector).forEach(mark => mark.replaceWith(...mark.childNodes));
  return root.innerHTML;
}

/** Map normalized visible text to the editor's DOM text nodes. */
function textMap(root: HTMLElement) {
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
  let normalized = '';
  const offsets: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/\s+|[^\s]/g)) {
    if (/^\s/.test(match[0]) && (!normalized || match.index! + match[0].length === text.length)) continue;
    normalized += /^\s/.test(match[0]) ? ' ' : match[0];
    offsets.push({ start: match.index!, end: match.index! + match[0].length });
  }
  return { nodes, text, normalized, offsets };
}

function bindReviewFindings(html: string, findings: ReviewFinding[]): ReviewFinding[] {
  const root = document.createElement('div');
  root.innerHTML = stripReviewHighlights(html);
  const { normalized } = textMap(root);
  return findings.map(finding => anchorFinding(finding, normalized));
}

// Decoration edits leave visible text unchanged. Keep the caret at the same text
// offset while unwrapping or trimming browser-expanded marks.
function rememberSelection(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.anchorNode || !selection.focusNode || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const offset = (node: Node, position: number) => {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, position);
    return range.toString().length;
  };
  return { anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset) };
}

function restoreSelection(root: HTMLElement, saved: ReturnType<typeof rememberSelection>) {
  if (!saved) return;
  const locate = (offset: number): [Node, number] => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const length = node.textContent?.length || 0;
      if (offset <= length) return [node, offset];
      offset -= length;
    }
    return [root, root.childNodes.length];
  };
  const [anchor, anchorOffset] = locate(saved.anchor);
  const [focus, focusOffset] = locate(saved.focus);
  window.getSelection()?.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset);
}

/** Read surviving identity marks, never search other passages for a deleted mark. */
function captureReviewAnchors(root: HTMLElement, findings: ReviewFinding[], previousText: string): AnchorUpdate[] {
  const { nodes, normalized, offsets } = textMap(root);
  const updates = findings.filter(finding => finding.id && typeof finding.textQuote === 'string' && finding.textQuote).map(finding => {
    if (finding.anchor && finding.anchor.status !== 'attached') return { id: finding.id!, anchor: finding.anchor };
    const covered = nodes.filter(({ node }) => {
      let parent = node.parentElement;
      while (parent && parent !== root) {
        if (parent.dataset.reviewFindingIds) {
          const ids: string[] = JSON.parse(parent.dataset.reviewFindingIds);
          if (ids.includes(finding.id!)) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }).filter(({ start, end }) => end > start);
    if (!covered.length) return { id: finding.id!, anchor: detachedAnchor() };
    const rawStart = Math.min(...covered.map(node => node.start));
    const rawEnd = Math.max(...covered.map(node => node.end));
    const start = offsets.findIndex(offset => offset.end > rawStart);
    let end = offsets.findIndex(offset => offset.start >= rawEnd);
    if (end < 0) end = offsets.length;
    if (start < 0 || end <= start) return { id: finding.id!, anchor: detachedAnchor() };
    // Boundary typing can extend the browser's mark. Trim against the passage
    // from the last input, so this also works after edits inside the highlight.
    // If that passage changed, retain the surviving identity mark until Save.
    const quote = finding.anchor?.status === 'attached'
      ? previousText.slice(finding.anchor.start!, finding.anchor.end!)
      : finding.textQuote!.replace(/\s+/g, ' ').trim();
    const within = normalized.slice(start, end);
    const relative = within.indexOf(quote);
    const exact = quote.length > 0 && relative >= 0 && within.indexOf(quote, relative + 1) < 0;
    return { id: finding.id!, anchor: {
      status: 'attached' as const,
      start: exact ? start + relative : start,
      end: exact ? start + relative + quote.length : end,
    } };
  });
  // Remove deleted marks and trim boundary spillover, preserving caret and formatting.
  const selection = rememberSelection(root);
  let changed = false;
  const detached = new Set(updates.filter(update => update.anchor.status !== 'attached').map(update => update.id));
  root.querySelectorAll<HTMLElement>('mark[data-review-finding-ids]').forEach(mark => {
    const ids: string[] = JSON.parse(mark.dataset.reviewFindingIds!);
    const remaining = ids.filter(id => !detached.has(id));
    if (!remaining.length) {
      mark.replaceWith(...mark.childNodes);
      changed = true;
      return;
    }
    mark.dataset.reviewFindingIds = JSON.stringify(remaining);
    const ranges = updates.filter(update => remaining.includes(update.id) && update.anchor.status === 'attached');
    const markedNodes = nodes.filter(({ node }) => mark.contains(node));
    if (!ranges.length || !markedNodes.length) return;
    const left = Math.max(markedNodes[0].start, Math.min(...ranges.map(update => offsets[update.anchor.start!].start)));
    const right = Math.min(markedNodes[markedNodes.length - 1].end, Math.max(...ranges.map(update => offsets[update.anchor.end! - 1].end)));
    if (right <= left) {
      mark.replaceWith(...mark.childNodes);
      changed = true;
      return;
    }
    const first = markedNodes.find(node => node.end > left)!;
    const last = [...markedNodes].reverse().find(node => node.start < right)!;
    if (right < markedNodes[markedNodes.length - 1].end) {
      const suffix = document.createRange();
      suffix.selectNodeContents(mark);
      suffix.setStart(last.node, right - last.start);
      mark.after(suffix.extractContents());
      changed = true;
    }
    if (left > markedNodes[0].start) {
      const prefix = document.createRange();
      prefix.selectNodeContents(mark);
      prefix.setEnd(first.node, left - first.start);
      mark.before(prefix.extractContents());
      changed = true;
    }
    const active = findings.filter(finding => remaining.includes(finding.id!));
    styleFindingHighlight(mark, active);
  });
  if (changed) restoreSelection(root, selection);
  return updates;
}

/** Annotate already-sanitized HTML without splitting tags or changing its text. */
export function highlightReviewHtml(html: string, findings: ReviewFinding[] = [], includePlaceholders = false): string {
  const root = document.createElement('div');
  root.innerHTML = stripReviewHighlights(html);
  const { nodes, text, normalized, offsets } = textMap(root);
  type Annotation = { start: number; end: number; finding?: ReviewFinding };
  const annotations: Annotation[] = [];
  for (const finding of findings) {
    if (finding.status && !['open', 'potentially-resolved'].includes(finding.status)) continue;
    const anchored = anchorFinding(finding, normalized);
    if (anchored.anchor?.status !== 'attached') continue;
    const { start, end } = anchored.anchor;
    annotations.push({ start: offsets[start!].start, end: offsets[end! - 1].end, finding: anchored });
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
      const mark = document.createElement('mark');
      mark.dataset.reviewHighlight = issues.length ? 'finding' : 'placeholder';
      if (issues.length) mark.dataset.reviewFindingIds = JSON.stringify([...new Set(issues.map(issue => issue.id).filter(Boolean))]);
      if (issues.length) styleFindingHighlight(mark, issues);
      else mark.style.backgroundColor = '#fed7aa';
      mark.style.color = issues.length ? 'inherit' : '#9a3412';
      mark.style.borderRadius = '2px';
      if (issues.length) {
        mark.title = [...new Set(issues.map(issue => issue.description || issue.message || '').filter(Boolean))].join('\n');
      }
      mark.append(part);
      fragment.append(mark);
    }
    node.replaceWith(fragment);
  }
  return root.innerHTML;
}

function editedReviewFindings(root: HTMLElement, findings: ReviewFinding[], previousText: string): ReviewFinding[] {
  const anchors = new Map(captureReviewAnchors(root, findings, previousText).map(update => [update.id, update.anchor]));
  return findings.map(finding => anchors.has(finding.id!) ? { ...finding, anchor: anchors.get(finding.id!) } : finding);
}

/** Keep review colors on the edited passage for this edit session, until Save. */
export function trackReviewEditor(root: HTMLElement, initial: ReviewFinding[], onChange?: (findings: ReviewFinding[]) => void) {
  let findings = bindReviewFindings(root.innerHTML, initial);
  let previousText = textMap(root).normalized;
  let replacement: { text: string; start: number; end: number; marks: HTMLElement[]; spans: Set<Element> } | null = null;
  onChange?.(findings);
  const beforeInput = (event: Event) => {
    replacement = null;
    if (!(event as InputEvent).inputType.startsWith('insert')) return;
    const selection = rememberSelection(root);
    if (!selection || selection.anchor === selection.focus) return;
    const start = Math.min(selection.anchor, selection.focus);
    const end = Math.max(selection.anchor, selection.focus);
    const marks = [...root.querySelectorAll<HTMLElement>('mark[data-review-finding-ids]')].filter(mark => {
      const range = document.createRange();
      range.selectNodeContents(root);
      range.setEndBefore(mark);
      const left = range.toString().length;
      return left < end && left + (mark.textContent?.length || 0) > start;
    }).map(mark => mark.cloneNode(false) as HTMLElement);
    replacement = { text: root.textContent || '', start, end, marks, spans: new Set(root.querySelectorAll('span')) };
  };
  const input = () => {
    // Replacing a whole mark can make the browser remove the element itself.
    // Restore its visual identity only on the text inserted at that selection.
    if (replacement) {
      const { text, start, end, marks, spans } = replacement;
      replacement = null;
      const current = root.textContent || '';
      const insertedEnd = end + current.length - text.length;
      // Native editing may convert adjacent spaces to non-breaking spaces.
      const spaces = (value: string) => value.replace(/\u00a0/g, ' ');
      if (insertedEnd > start && spaces(current.slice(0, start)) === spaces(text.slice(0, start))
        && spaces(current.slice(insertedEnd)) === spaces(text.slice(end))) {
        // Chrome can copy the removed mark's background into a new span. Keep
        // that color on our removable decoration so it cannot leak into a save.
        const colors = new Set(marks.map(mark => mark.style.backgroundColor));
        root.querySelectorAll('span').forEach(span => {
          if (!spans.has(span) && colors.has(span.style.backgroundColor)) span.style.removeProperty('background-color');
        });
        const selection = rememberSelection(root);
        for (const template of marks) {
          const ids = JSON.parse(template.dataset.reviewFindingIds!) as string[];
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const covered: { node: Text; left: number; right: number }[] = [];
          let offset = 0;
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const length = node.textContent?.length || 0;
            if (offset < insertedEnd && offset + length > start) {
              covered.push({ node: node as Text, left: Math.max(0, start - offset), right: Math.min(length, insertedEnd - offset) });
            }
            offset += length;
          }
          for (const { node, left, right } of covered) {
            const inherited = new Set<string>();
            let parent = node.parentElement;
            while (parent && parent !== root) {
              if (parent.dataset.reviewFindingIds) {
                for (const id of JSON.parse(parent.dataset.reviewFindingIds)) inherited.add(id);
              }
              parent = parent.parentElement;
            }
            const missingIds = ids.filter(id => !inherited.has(id));
            if (!missingIds.length) continue;
            const mark = template.cloneNode(false) as HTMLElement;
            mark.dataset.reviewFindingIds = JSON.stringify(missingIds);
            const range = document.createRange();
            range.setStart(node, left); range.setEnd(node, right);
            range.surroundContents(mark);
          }
        }
        restoreSelection(root, selection);
      }
    }
    findings = editedReviewFindings(root, findings, previousText);
    previousText = textMap(root).normalized;
    onChange?.(findings);
  };
  root.addEventListener('beforeinput', beforeInput);
  root.addEventListener('input', input);
  return () => {
    root.removeEventListener('beforeinput', beforeInput);
    root.removeEventListener('input', input);
  };
}
