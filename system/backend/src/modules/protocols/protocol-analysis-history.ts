import { BadGatewayException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { acceptedFindingRequirements } from '../projects/finding-requirements';

export interface PreviousAnalysisDecision {
  issue_id: string;
  requirement: string | null;
  severity: string;
  issue: string;
  decision: 'WONT_FIX' | 'UNANSWERED';
  reason: string | null;
  textQuote: string | null;
}

export interface LinkedAnalysisIssue {
  issue_id: string;
  requirement: string | null;
  issue: string;
  supportingDocuments: string[];
}

export interface PreviousIssueAssessment {
  issue_id: string;
  outcome: 'fixed' | 'not_fixed' | 'not_evaluated';
  reason: string;
  textQuote: string | null;
}

const normalized = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const identity = (issue: any) => JSON.stringify([issue.requirementId || null, normalized(issue.description)]);
const acceptedRisk = (section: any, issue: any) => (section.riskAcceptances || []).find(
  (decision: any) => normalized(decision.description) === normalized(issue.description));
const dismissed = (section: any, issue: any) => issue.status === 'resolved' || !!acceptedRisk(section, issue);

export function sectionAnalysisHistory(section: any, requirements: unknown) {
  const accepted = acceptedFindingRequirements(requirements);
  const previousDecisions: PreviousAnalysisDecision[] = [];
  const linkedIssues: LinkedAnalysisIssue[] = [];
  for (const issue of section?.issues || []) {
    const requirement = accepted.find(item => item.id === issue.requirementId)?.title || null;
    if (issue.documentLink && issue.requirementId) {
      linkedIssues.push({
        issue_id: issue.id, requirement, issue: issue.description,
        supportingDocuments: [issue.documentLink.label],
      });
    } else {
      previousDecisions.push({
        issue_id: issue.id, requirement, severity: issue.originalSeverity || issue.severity,
        issue: issue.description, decision: dismissed(section, issue) ? 'WONT_FIX' : 'UNANSWERED',
        reason: issue.wontFixReason || acceptedRisk(section, issue)?.reason || null,
        textQuote: issue.textQuote || null,
      });
    }
  }
  return { previousDecisions, linkedIssues };
}

/** Reconcile against the current locked records, preserving decisions made during the AI call. */
export function reconcileSectionIssues(section: any, result: any, analyzedIssues: any[] = section.issues || []) {
  const existing: any[] = section.issues || [];//old
  const candidates: any[] = result.issues || [];//new**“New” means newly returned, not necessarily newly discovered.** The array can contain updated versions of existing findings as well as genuinely new findings.
//contains open old issues and new issues.
  const assessments: PreviousIssueAssessment[] = result.previousIssueAssessments || [];//{ "issue_id": "finding-open-1", "outcome": "not_fixed", "reason": "The assessment procedures remain insufficiently described.","textQuote": "Assessments will be performed at scheduled visits."}
 //`result.previousIssueAssessments` reports whether old issues are fixed.
  const snapshot = new Map(analyzedIssues.map(issue => [issue.id, issue]));//`analyzedIssues` already contains the findings from when analysis started. This line organizes them for quick lookup; it doesn’t create another database record or clone the issue objects.
  const excludedRequirements = new Set(existing.filter(issue => issue.documentLink).map(issue => issue.requirementId).filter(Boolean));
  const byRef = new Map<string, PreviousIssueAssessment>();
  const matchedCandidates = new Set<string>();
  for (const assessment of assessments) {
    if (!snapshot.has(assessment.issue_id) || byRef.has(assessment.issue_id) ||
        !['fixed', 'not_fixed', 'not_evaluated'].includes(assessment.outcome) || !assessment.reason?.trim()) {
      throw new BadGatewayException('AI returned an invalid assessment of a previous finding.');
    }
    const updates = candidates.filter(issue => issue.id === assessment.issue_id);// `updates` contains returned findings whose ID matches assessment.issue_id.
    if (updates.length) {//if one of the candidates returned by AI has the same ID as a previous finding and its status is anything but not_fixed, then throw an exception
      const candidate = updates[0];
      const original = snapshot.get(assessment.issue_id);
      if (assessment.outcome !== 'not_fixed' || updates.length !== 1 ||
          (candidate.requirementId || null) !== (original.requirementId || null)) {
        throw new BadGatewayException('AI returned an invalid match for a previous finding.');
      }
      matchedCandidates.add(candidate.id);//2. **`matchedCandidates` — returned findings already associated with saved issues**
    }
    byRef.set(assessment.issue_id, assessment);// the old issues id and its assesment
  }
  const issues: any[] = [];
  const resolvedIssues: any[] = [];
  for (const issue of existing) {
    const original = snapshot.get(issue.id);
    const assessment = byRef.get(issue.id);
    // Never reinterpret a link or human decision, or apply a stale finding assessment.
    const protectedIssue = issue.documentLink || excludedRequirements.has(issue.requirementId) ||
      dismissed(section, issue) || !original || identity(original) !== identity(issue) || original.documentLink;
    if (!protectedIssue && assessment?.outcome === 'fixed') {
      if (candidates.some(candidate => identity(candidate) === identity(issue))) {
        throw new BadGatewayException('AI marked a previous finding fixed but also raised the same finding.');
      }
      resolvedIssues.push({ ...issue, resolutionReason: assessment.reason });
      continue;
    }
    const candidate = !protectedIssue && assessment?.outcome === 'not_fixed'// old issues that are not fixed and not protected. 
      ? candidates.find(item => item.id === issue.id) : null;
    issues.push(candidate ? {
      ...issue, ...candidate, id: issue.id, raisedBy: issue.raisedBy, raisedDate: issue.raisedDate,
      textQuote: assessment?.textQuote || candidate.textQuote || issue.textQuote,
    } : { ...issue, ...(!protectedIssue && assessment?.outcome === 'not_fixed' && assessment.textQuote
      ? { textQuote: assessment.textQuote } : {}) });
  }
  const known = new Set([...existing, ...issues].map(identity));
  for (const candidate of candidates) {
    if (excludedRequirements.has(candidate.requirementId) || matchedCandidates.has(candidate.id) || known.has(identity(candidate))) 
      continue;
    // New findings receive permanent IDs here; ignore any response-generated ID.
    issues.push({ ...candidate, id: `finding-${randomUUID()}` });
    known.add(identity(candidate));
  }
  return { issues, resolvedIssues };
}
