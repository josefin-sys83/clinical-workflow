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
const dismissed = (section: any, issue: any) => issue.status === 'resolved' || !!acceptedRisk(section, issue);//resolved is wont fix

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

interface ValidatedPreviousIssueAssessments {
  analyzedIssuesById: Map<string, any>;
  returnedIssuesById: Map<string, any[]>;
  assessmentsByIssueId: Map<string, PreviousIssueAssessment>;
  updatedPreviousIssueIds: Set<string>;
}

/** Check AI verdicts against the findings sent in the request, before applying any changes. */
function validatePreviousIssueAssessments(
  assessments: PreviousIssueAssessment[],
  analyzedIssues: any[],
  returnedIssues: any[],
): ValidatedPreviousIssueAssessments {
  // This is the request's starting snapshot, not the current DB version.
  const analyzedIssuesById = new Map(analyzedIssues.map(issue => [issue.id, issue]));
  // Keep all entries per ID so duplicate updates can be rejected, not overwritten.
  const returnedIssuesById = new Map<string, any[]>();
  for (const issue of returnedIssues) {
    if (!issue.id) continue; // New findings don't need an ID from AI.
    const entries = returnedIssuesById.get(issue.id) || [];
    entries.push(issue);
    returnedIssuesById.set(issue.id, entries);
  }

  const assessmentsByIssueId = new Map<string, PreviousIssueAssessment>();
  const updatedPreviousIssueIds = new Set<string>();
  for (const assessment of assessments) {
    const issueId = assessment.issue_id;
    // Each verdict must identify a request finding, occur once, and have a valid outcome/reason.
    if (!analyzedIssuesById.has(issueId) || assessmentsByIssueId.has(issueId) ||
        !['fixed', 'not_fixed', 'not_evaluated'].includes(assessment.outcome) || !assessment.reason?.trim()) {
      throw new BadGatewayException('AI returned an invalid assessment of a previous finding.');
    }

    const updates = returnedIssuesById.get(issueId) || [];
    if (updates.length) {
      const analyzedIssue = analyzedIssuesById.get(issueId);
      // Only unresolved findings may have returned updates; the saved requirement must stay the same.
      if (assessment.outcome !== 'not_fixed' || updates.length !== 1 ||
          (updates[0].requirementId || null) !== (analyzedIssue.requirementId || null)) {
        throw new BadGatewayException('AI returned an invalid match for a previous finding.');
      }
      updatedPreviousIssueIds.add(issueId);
    }
    assessmentsByIssueId.set(issueId, assessment);
  }
  // These IDs also prevent ignored updates to protected findings from being added as new findings.
  return { analyzedIssuesById, returnedIssuesById, assessmentsByIssueId, updatedPreviousIssueIds };
}

/** Apply validated verdicts to current saved findings; keep removed findings separately for auditing. */
function reconcileSavedIssues(
  section: any,
  returnedIssues: any[],
  excludedRequirementIds: Set<string>,
  validatedAssessments: ValidatedPreviousIssueAssessments,
) {
  const { analyzedIssuesById, returnedIssuesById, assessmentsByIssueId } = validatedAssessments;
  const issues: any[] = [];
  const resolvedIssues: any[] = [];
  for (const issue of section.issues || []) {
    const analyzedIssue = analyzedIssuesById.get(issue.id);
    const assessment = assessmentsByIssueId.get(issue.id);
    const protectedIssue = issue.documentLink ||             // Currently handled by an attachment.
      excludedRequirementIds.has(issue.requirementId) ||     // Another linked finding handles this requirement.
      dismissed(section, issue) ||                          // Human won't-fix/risk-acceptance decision.
      !analyzedIssue ||                                     // Added after this analysis started.
      identity(analyzedIssue) !== identity(issue) ||         // Description or requirement changed during analysis.
      analyzedIssue.documentLink;                           // Sent as linked, even if unlinked during analysis.

    // Keep current DB fields if the verdict is absent, uncertain, or no longer safe to apply.
    if (protectedIssue || !assessment || assessment.outcome === 'not_evaluated') {
      issues.push({ ...issue });
      continue;
    }

    if (assessment.outcome === 'fixed') {
      // A fixed finding must not also appear among the returned unresolved findings.
      if (returnedIssues.some(returned => identity(returned) === identity(issue))) {
        throw new BadGatewayException('AI marked a previous finding fixed but also raised the same finding.');
      }
      // This is AI's removal explanation for the audit, separate from the human won't-fix reason.
      resolvedIssues.push({ ...issue, resolutionReason: assessment.reason });
      continue;
    }

    // The remaining outcome is not_fixed. A full update is optional in this contract.
    const update = returnedIssuesById.get(issue.id)?.[0];
    if (!update) {
      // Preserve the current contract's quote-only fallback when AI returns no full update.
      const retainedIssue = { ...issue };
      if (assessment.textQuote) retainedIssue.textQuote = assessment.textQuote;
      issues.push(retainedIssue);
      continue;
    }

    // Apply the update while preserving the finding's permanent ID and original attribution.
    issues.push({
      ...issue,
      ...update,
      id: issue.id,
      raisedBy: issue.raisedBy,
      raisedDate: issue.raisedDate,
      textQuote: assessment.textQuote || update.textQuote || issue.textQuote,
    });
  }
  return { issues, resolvedIssues };
}

/** Reconcile against the current locked records, preserving decisions made during the AI call. */
export function reconcileSectionIssues(section: any, result: any, analyzedIssues: any[] = section.issues || []) {
  // Includes linked and won't-fix findings, but not previously deleted fixed findings.
  const savedIssues: any[] = section.issues || [];
  // Includes updates to unresolved findings and newly discovered findings.
  const returnedIssues: any[] = result.issues || [];
  const assessments: PreviousIssueAssessment[] = result.previousIssueAssessments || [];
  const excludedRequirementIds = new Set<string>(savedIssues
    .filter(issue => issue.documentLink)
    .map(issue => issue.requirementId)
    .filter(Boolean));

  // 1. Validate the AI response against the findings present when the request started.
  const validatedAssessments = validatePreviousIssueAssessments(assessments, analyzedIssues, returnedIssues);

  // 2. Apply it to current DB findings, giving document links and human decisions precedence.
  const { issues, resolvedIssues } = reconcileSavedIssues(
    section, returnedIssues, excludedRequirementIds, validatedAssessments,
  );

  // 3. Add new concerns, skipping excluded requirements, previous updates, and duplicate concerns.
  const knownIssueIdentities = new Set([...savedIssues, ...issues].map(identity));
  for (const returnedIssue of returnedIssues) {
    const returnedIdentity = identity(returnedIssue);
    if (excludedRequirementIds.has(returnedIssue.requirementId) ||
        validatedAssessments.updatedPreviousIssueIds.has(returnedIssue.id) || knownIssueIdentities.has(returnedIdentity)) {
      continue;
    }
    // New findings receive permanent IDs here; ignore any response-generated ID.
    issues.push({ ...returnedIssue, id: `finding-${randomUUID()}` });
    knownIssueIdentities.add(returnedIdentity);
  }
  return { issues, resolvedIssues };
}
