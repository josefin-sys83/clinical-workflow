

// ── Deterministic rule-based section checks ──────────────────────────────
// These always run alongside AI analysis so specific regulatory-reference and
// specificity gaps are caught even if the AI misses them.
export function getRuleBasedIssues(section: { id: string; title: string; content: string }, targetMarkets: string[], projectData: any): any[] {
  const issues: any[] = [];
  const content = section.content || '';
  const sectionTitle = section.title || '';

  // Rule 1: EU MDR reference missing
  if (targetMarkets?.includes('EU') && !content.includes('MDR') && !content.includes('2017/745')) {
    issues.push({ id: `rule-eu-${section.id}`, severity: 'warning', description: 'EU MDR 2017/745 not referenced in this section', reference: 'EU MDR 2017/745 Annex XV', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 2: FDA reference missing
  if (targetMarkets?.includes('US') && !content.includes('21 CFR') && !content.includes('FDA')) {
    issues.push({ id: `rule-fda-${section.id}`, severity: 'warning', description: 'FDA 21 CFR reference missing in this section', reference: 'FDA 21 CFR Part 812', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 3: ISO 14155 missing
  if (!content.includes('ISO 14155') && !['Protocol Overview'].includes(sectionTitle)) {
    issues.push({ id: `rule-iso-${section.id}`, severity: 'warning', description: 'ISO 14155:2020 not referenced in this section', reference: 'ISO 14155:2020', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  // Rule 4: Statistical significance missing
  if (sectionTitle.includes('Statistical') && !content.includes('0.05') && !content.includes('significance') && !content.includes('confidence interval')) {
    issues.push({ id: `rule-stats-${section.id}`, severity: 'blocker', description: 'Statistical significance level or confidence interval not specified', reference: 'ISO 14155:2020 §7.4.4', raisedBy: 'Rule-based check', status: 'open', dueDate: '7 days' });
  }

  return issues;
}


const RULE_TOPIC_KEYWORDS: Record<string, string[]> = {
  eu: ['mdr', '2017/745'],
  fda: ['fda', '21 cfr'],
  iso: ['iso 14155'],
  stats: ['significance', 'confidence interval', '0.05'],
  appendix: ['appendix', 'attachment'],
};

function isDuplicateOfAiIssue(ruleIssue: any, aiIssues: any[]): boolean {
  const topic = ruleIssue.id.match(/^rule-([a-z]+)-/)?.[1] || '';
  if (topic === 'appendix') {
    const appendixNumber = ruleIssue.id.match(/^rule-appendix-(\d+)-/)?.[1];
    return appendixNumber
      ? aiIssues.some((ai: any) => `${ai.description || ''} ${ai.reference || ''}`.toLowerCase().includes(`appendix ${appendixNumber}`))
      : false;
  }
  const keywords = RULE_TOPIC_KEYWORDS[topic] || [];
  return aiIssues.some((ai: any) => {
    const text = `${ai.description || ''} ${ai.reference || ''}`.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
}


export function mergeIssues(aiIssues: any[], ruleIssues: any[]): any[] {
  const newRuleIssues = ruleIssues.filter((r) => !isDuplicateOfAiIssue(r, aiIssues));
  return [...aiIssues, ...newRuleIssues];
}
