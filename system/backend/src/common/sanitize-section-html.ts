import sanitizeHtml from 'sanitize-html';

// Protocol/report section content is rendered client-side via dangerouslySetInnerHTML
// (ReportContent.tsx, protocol-section.tsx, ClinicalInvestigationReport.tsx), so any
// HTML that reaches those components — whether typed by a user via updateSection() or
// produced by an AI prompt (generateProtocol/generateReport/generateReportSection) —
// executes in the browser of whoever views the section next, including reviewers,
// approvers and admins. This allowlist matches exactly the tags/inline-styles the
// legacy markdown-to-HTML fallback and the AI HTML prompts actually produce; anything
// else (script tags, event handler attributes, non-http(s) URLs, etc.) is stripped.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'mark', 'span', 'blockquote', 'code', 'pre',
];

const ALLOWED_STYLES = {
  '*': {
    color: [/^#[0-9a-fA-F]{3,8}$/, /^[a-zA-Z]+$/],
    background: [/^#[0-9a-fA-F]{3,8}$/, /^[a-zA-Z]+$/],
    'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^[a-zA-Z]+$/],
    'font-style': [/^(normal|italic|oblique)$/],
    'text-decoration': [/^(none|underline|line-through)$/],
    'list-style-type': [/^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/],
    'font-weight': [/^\d+$/, /^[a-zA-Z]+$/],
    'font-size': [/^[\d.]+(px|rem|em|%)$/],
    'text-align': [/^(left|right|center|justify)$/],
    border: [/^[\w\s#.-]+$/],
    'border-collapse': [/^(collapse|separate)$/],
    padding: [/^[\d.]+(px|rem|em|%)(\s[\d.]+(px|rem|em|%)){0,3}$/],
    margin: [/^[\d.]+(px|rem|em|%)(\s[\d.]+(px|rem|em|%)){0,3}$/],
    width: [/^[\d.]+(px|rem|em|%)$/],
    'max-width': [/^[\d.]+(px|rem|em|%)$/],
    height: [/^[\d.]+(px|rem|em|%)$/],
    'border-radius': [/^[\d.]+(px|rem|em|%)$/],
    'line-height': [/^[\d.]+$/],
  },
};

export function sanitizeSectionHtml(input: string | null | undefined): string {
  if (!input) return '';
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      img: ['src', 'alt', 'style'],
      ol: ['start', 'reversed', 'style'],
      li: ['value', 'style'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedStyles: ALLOWED_STYLES,
    disallowedTagsMode: 'discard',
  });
}
