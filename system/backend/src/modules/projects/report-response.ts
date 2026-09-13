// Database rows use snake_case; the API objects below use camelCase.
export type SectionDefinition = { id: string; title: string; number: number };
type DatabaseDate = Date | string | null;

export type SectionRow = {
  id: string;
  section_key: string;
  title: string;
  section_number: string | null;
  position: number;
  helper_text: string | null;
  content: string | null;
  status: string;
  ai_draft: string | null;
  user_edited: boolean;
};

type ChildRow = { section_id: string; position?: number | null };
export type CommentRow = ChildRow & {
  id: string;
  comment_key: string;
  parent_comment_id: string | null;
  author_user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  author_role: string | null;
  content: string;
  comment_type: string;
  regarding: string | null;
  resolved: boolean;
  created_at: DatabaseDate;
};

type IssueRow = ChildRow & {
  issue_key: string;
  severity: string;
  title: string | null;
  subsection: string | null;
  description: string;
  reference: string | null;
  raised_by: string | null;
  raised_date: DatabaseDate;
  status: string;
  due_date: string | null;
  text_quote: string | null;
};

type CompletenessRow = ChildRow & {
  element_key: string;
  title: string;
  requirement_reference: string | null;
  status: string;
  verified_by_user_id: string | null;
  verified_by_name: string | null;
  verified_by_email: string | null;
  verified_by_role: string | null;
  verified_at: DatabaseDate;
  ai_suggestion: string | null;
};

export type SectionChildren = {
  report_section_comment: CommentRow[];
  report_section_issue: IssueRow[];
  report_section_issue_dismissal: (ChildRow & { description: string })[];
  report_section_completeness_element: CompletenessRow[];
};

export function iso(value: any) {
  return value instanceof Date ? value.toISOString() : (value ?? undefined);
}

export function sortSections(sections: SectionRow[], definitions: Map<string, SectionDefinition>) {
  sections.sort((left, right) => {
    const leftOrder = definitions.get(left.section_key)?.number ?? left.position;
    const rightOrder = definitions.get(right.section_key)?.number ?? right.position;
    return leftOrder - rightOrder || left.section_key.localeCompare(right.section_key);
  });
}

function rowsForSection<T extends ChildRow>(rows: T[], sectionId: string): T[] {
  return rows
    .filter((row) => row.section_id === sectionId)
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export type ReportComment = {
  id: string;
  author: { id: string | null; name: string | null; email: string | null; role: string | null };
  text: string;
  commentType: string;
  regarding: string | null;
  resolved: boolean;
  timestamp: ReturnType<typeof iso>;
  replies: ReportComment[];
};

// parentId = null finds comments that are not replies.
// parentId = 'comment-db-id' finds replies to that database comment.
export function buildCommentTree(
  rows: CommentRow[],
  parentId: string | null,
): ReportComment[] {
  return rows
    .filter((comment) => comment.parent_comment_id === parentId)
    .map((comment) => ({
      id: comment.comment_key,
      author: {
        id: comment.author_user_id,
        name: comment.author_name,
        email: comment.author_email,
        role: comment.author_role,
      },
      text: comment.content,
      commentType: comment.comment_type,
      regarding: comment.regarding,
      resolved: comment.resolved,
      timestamp: iso(comment.created_at),
      replies: buildCommentTree(rows, comment.id),
    }));
}

function mapIssue(issue: IssueRow) {
  return {
    id: issue.issue_key,
    severity: issue.severity,
    title: issue.title,
    subsection: issue.subsection,
    description: issue.description,
    reference: issue.reference,
    raisedBy: issue.raised_by,
    raisedDate: iso(issue.raised_date)?.slice(0, 10),
    status: issue.status,
    dueDate: issue.due_date,
    textQuote: issue.text_quote,
  };
}

function mapCompletenessElement(element: CompletenessRow) {
  return {
    id: element.element_key,
    title: element.title,
    isoReference: element.requirement_reference,
    status: element.status,
    verifiedBy: element.verified_by_name
      ? {
          id: element.verified_by_user_id,
          name: element.verified_by_name,
          email: element.verified_by_email,
          role: element.verified_by_role,
        }
      : undefined,
    verificationDate: iso(element.verified_at),
    aiSuggestion: element.ai_suggestion,
  };
}

function resolveSectionTitle(section: SectionRow, definition?: SectionDefinition) {
  if (section.title === section.section_key) {
    return definition?.title ?? section.title;
  }
  return section.title;
}

function buildSection(
  section: SectionRow,
  definition: SectionDefinition | undefined,
  children: SectionChildren,
) {
  const comments = rowsForSection(children.report_section_comment, section.id);
  const issues = rowsForSection(children.report_section_issue, section.id);
  const dismissals = rowsForSection(children.report_section_issue_dismissal, section.id);
  const completeness = rowsForSection(children.report_section_completeness_element, section.id);

  return {
    id: section.section_key, // 'section-1'
    databaseId: section.id, // Database UUID for this saved section.
    title: resolveSectionTitle(section, definition), // 'Executive Summary' or a saved custom title.
    number: definition ? String(definition.number) : section.section_number, // '1' or null.
    order: definition?.number ?? section.position, // 1, 2, ...
    // A missing property must not overwrite the frontend's template; '' still means deliberately cleared.
    ...(section.helper_text == null ? {} : { helperText: section.helper_text }), // { helperText: 'Guidance' } or {}.
    ...(section.content == null ? {} : { content: section.content }), // { content: '<p>Saved text</p>' } or {}.
    state: section.status, // 'draft', 'under-review', 'approved', or 'locked'.
    aiDraft: section.ai_draft, // '<p>Suggested text</p>' or null.
    userEdited: section.user_edited, // true or false.
    comments: buildCommentTree(comments, null), // [{ id: 'comment-1', text: 'Please revise', replies: [...] }, ...].
    issues: issues.map(mapIssue),
    wontFixIssues: dismissals.map((dismissal) => dismissal.description), // ['Not applicable'] or [].
    completenessElements: completeness.map(mapCompletenessElement),
  };
}

export function buildSections(
  sections: SectionRow[],
  definitions: Map<string, SectionDefinition>,
  children: SectionChildren,
) {
  const result: Record<string, ReturnType<typeof buildSection>> = {}; // { 'section-1': { ... }, 'section-2': { ... } }.
  for (const section of sections) {
    const definition = definitions.get(section.section_key); // { id: 'section-1', title: 'Executive Summary', number: 1 } or undefined.
    result[section.section_key] = buildSection(section, definition, children);
  }
  return result;
}
