export type ProtocolSectionReferenceInput = {
  id: string;
  title: string;
  content: string;
};

export function getMissingProtocolAttachmentIssues(
  section: ProtocolSectionReferenceInput,
  availableAppendixNumbers: number[],
): any[] {
  const available = new Set(availableAppendixNumbers);
  const references = [...(section.content || '').matchAll(/\bAppendix\s+(\d+)\b/gi)];
  const missing = new Map<number, string>();
  for (const reference of references) {
    const appendixNumber = Number(reference[1]);
    if (!available.has(appendixNumber) && !missing.has(appendixNumber)) {
      missing.set(appendixNumber, reference[0]);
    }
  }

  const raisedDate = new Date().toISOString().slice(0, 10);
  return [...missing.entries()].map(([appendixNumber, textQuote]) => ({
    id: `rule-appendix-${appendixNumber}-${section.id}`,
    severity: 'blocker',
    subsection: section.title,
    description: `Section references Appendix ${appendixNumber}, but that protocol attachment does not exist.`,
    reference: 'Protocol attachment traceability',
    raisedBy: 'Attachment integrity check',
    raisedDate,
    status: 'open',
    dueDate: '7 days',
    textQuote,
  }));
}
