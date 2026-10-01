import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover';
import { findingText, getIssuePresentation, type IssueSeverity } from '@/shared/protocol/issues';
import type { ReviewFinding } from './review-highlights';

type ActiveHighlight = { mark: HTMLElement; ids: string[] };

/** Keep the popup outside document HTML so it never enters saved editor content. */
export function ReviewRemediation({ findings, children }: { findings: ReviewFinding[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveHighlight | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const anchor = useRef<{ getBoundingClientRect: () => DOMRect; contextElement?: HTMLElement }>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const tooltipFindings = active ? findings.filter(finding =>
    finding.id && active.ids.includes(finding.id) && !finding.acceptedRisk &&
    (!finding.status || ['open', 'potentially-resolved'].includes(finding.status)),
  ) : [];
  const hasPopupFinding = (ids: string[]) => ids.some(id => findings.some(finding =>
    finding.id === id && !finding.acceptedRisk &&
    (!finding.status || ['open', 'potentially-resolved'].includes(finding.status))));

  const keepOpen = () => clearTimeout(closeTimer.current);
  const closeSoon = () => {
    keepOpen();
    closeTimer.current = setTimeout(() => setActive(null), 180);
  };
  const show = (target: EventTarget | null) => {
    const mark = target instanceof Element
      ? target.closest<HTMLElement>('mark[data-review-finding-ids]') : null;
    if (!mark || !root.current?.contains(mark)) return;
    let ids: string[];
    try { ids = JSON.parse(mark.dataset.reviewFindingIds || '[]'); } catch { return; }
    if (!Array.isArray(ids) || !hasPopupFinding(ids)) return;
    keepOpen();
    // Replace the browser title tooltip with the popup, retaining its accessible name.
    if (mark.title) {
      mark.setAttribute('aria-label', mark.title);
      mark.removeAttribute('title');
    }
    anchor.current = {
      contextElement: mark,
      getBoundingClientRect: () => mark.getClientRects()[0] || mark.getBoundingClientRect(),
    };
    setActive(previous => previous?.mark === mark ? previous : { mark, ids });
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!root.current) return;
    const updateHighlights = () => {
      root.current?.querySelectorAll<HTMLElement>('mark[data-review-finding-ids]').forEach(mark => {
        let ids: string[];
        try { ids = JSON.parse(mark.dataset.reviewFindingIds || '[]'); } catch { return; }
        if (!Array.isArray(ids) || !hasPopupFinding(ids)) {
          mark.removeAttribute('tabindex');
          mark.removeAttribute('aria-haspopup');
          return;
        }
        mark.tabIndex = 0;
        mark.setAttribute('aria-haspopup', 'dialog');
        if (mark.title) {
          mark.setAttribute('aria-label', mark.title);
          mark.removeAttribute('title');
        }
      });
      setActive(previous => previous && !root.current?.contains(previous.mark) ? null : previous);
    };
    updateHighlights();
    const observer = new MutationObserver(updateHighlights);
    observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [findings]);

  return (
    <Popover open={tooltipFindings.length > 0} onOpenChange={open => { if (!open) setActive(null); }}>
      <PopoverAnchor virtualRef={anchor} />
      <div
        ref={root}
        onPointerOver={event => show(event.target)}
        onPointerOut={closeSoon}
        onClick={event => show(event.target)}
        onFocusCapture={event => show(event.target)}
        onBlurCapture={closeSoon}
        onInputCapture={() => setActive(null)}
        onKeyDownCapture={event => {
          if (event.key === 'Escape') setActive(null);
          if (event.key === 'Enter' || event.key === ' ') {
            if (event.target instanceof Element && event.target.matches('mark[aria-haspopup="dialog"]')) {
              event.preventDefault();
              show(event.target);
            }
          }
        }}
      >
        {children}
      </div>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        hideWhenDetached
        className="w-96 max-w-[calc(100vw-24px)] max-h-80 overflow-y-auto bg-white p-3 text-slate-900 shadow-lg animate-none!"
        aria-label="Finding remediation"
        data-review-remediation
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => {
          const target = event.target;
          if (target instanceof Element && root.current?.contains(target)
            && target.closest('mark[data-review-finding-ids]')) event.preventDefault();
        }}
        onPointerEnter={keepOpen}
        onPointerLeave={closeSoon}
        onFocusCapture={keepOpen}
        onBlurCapture={closeSoon}
      >
        <div className="mb-2 text-xs font-semibold text-slate-500">Suggested remediation</div>
        <div className="space-y-3">
          {tooltipFindings.map(finding => {
            const presentation = finding.severity ? getIssuePresentation(finding.severity as IssueSeverity) : undefined;
            const remediation = findingText(finding.remediation);
            return (
              <div key={finding.id} data-remediation-finding-id={finding.id}>
                <div className="mb-1 flex items-center gap-2">
                  {presentation && <span className={`rounded px-1.5 py-0.5 text-xs ${presentation.badge}`}>{presentation.label}</span>}
                </div>
                <p className="mb-1 text-xs text-slate-600">{finding.description || finding.message}</p>
                <p className={`whitespace-pre-wrap break-words text-sm ${remediation ? 'text-slate-900' : 'text-slate-500'}`}>
                  {remediation || 'No remediation'}
                </p>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
