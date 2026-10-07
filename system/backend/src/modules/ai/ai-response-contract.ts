import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';
import { protocolIssueSeverity } from '../protocols/protocol-issue-severity';

const text = z.string().refine(value => value.trim().length > 0);
const suggestionText = (max: number) => z.string().max(max).refine(value => value.trim().length > 0 && !value.includes('\0')).nullable();
const element = z.object({ id: text, name: text, reference: text });
const reviewedElement = element.extend({ status: z.enum(['complete', 'partial', 'missing']) });
const issue = z.object({ description: text, severity: z.enum(['blocker', 'warning']) }).passthrough();

const protocolIssue = z.object({
  // Updated previous findings echo their saved ID; new findings need no ID.
  id: text.optional(),
  severity: protocolIssueSeverity,
  subsection: text,
  description: text,
  requirement: text.nullable(),
  source: text.nullable(),
  requirementId: z.string().nullable().optional(),
  targetSection: text.nullable(),
  remediation: text.nullable(),
  raisedBy: z.literal('AI Regulatory Review'),
  raisedDate: text,
  status: z.literal('open'),
  dueDate: z.literal('7 days'),
  textQuote: text.nullable(),
}).strict();

const generatedProtocol = z.object({
  protocolId: text,
  sections: z.array(z.object({ id: text, title: text, content: text, status: z.literal('draft') }).passthrough()),
}).passthrough();

const contracts: Record<string, z.ZodTypeAny> = {
  '/v1/ai/suggest-result': z.object({
    tflEvidence: z.array(z.object({
      documentId: suggestionText(200).unwrap(),
      quote: suggestionText(4000).unwrap(),
    }).strict()).optional(),
    title: suggestionText(1000),
    reportSectionKey: suggestionText(200),
    description: suggestionText(20000),
    limitation: suggestionText(2000),
    alternativeSectionKeys: z.array(suggestionText(200).unwrap()).optional(),
  }).strict().refine(value =>
    !!value.limitation || [value.title, value.reportSectionKey, value.description].every(v => v !== null))
    .refine(value => !value.alternativeSectionKeys?.length || (
      value.reportSectionKey === null && value.title !== null && value.description !== null &&
      value.alternativeSectionKeys.length >= 2 &&
      new Set(value.alternativeSectionKeys).size === value.alternativeSectionKeys.length
    )),
  '/v1/ai/analyze-synopsis': z.array(z.object({
    id: text, criterion: text, status: z.enum(['complete', 'missing', 'not-applicable']), reason: text,
  }).passthrough()),
  '/v1/ai/derive-scope-from-synopsis': z.object({
    deviceCategory: z.string(), intendedUse: z.string(), confidence: z.enum(['high', 'medium', 'low']),
  }).passthrough(),
  '/v1/ai/analyze-scope': z.array(z.object({
    id: text, title: text, description: text, status: z.literal('suggested'), source: z.literal('ai-suggested'),
  }).passthrough()),
  '/v1/ai/generate-protocol-section': z.string(),
  '/v1/ai/generate-protocol': generatedProtocol,
  '/v1/ai/generate-required-elements': z.array(element.extend({ status: z.literal('missing') }).strict()),
  '/v1/ai/analyze-section': z.object({
    issues: z.array(protocolIssue),
    requiredElements: z.array(reviewedElement.extend({ evidence: text }).strict()),
    satisfiedRequirements: z.array(z.object({
      name: text,
      status: z.literal('satisfied'),
      source: z.enum(['section', 'attachment']),
      sourceName: text.nullable(),
      evidence: text,
    }).strict()),
    previousIssueAssessments: z.array(z.object({
      issue_id: text,
      outcome: z.enum(['fixed', 'not_fixed', 'not_evaluated']),
      reason: text,
      textQuote: text.nullable(),
    }).strict()).optional(),
  }).strict(),
  '/v1/ai/check-protocol-attachments': z.object({
    outcome: z.enum(['resolves', 'partially_resolves', 'does_not_resolve']),
    explanation: text,
    sources: z.array(z.object({ document: text, evidence: text }).strict()),
  }).strict(),
  '/v1/ai/check-synopsis-consistency': z.object({ issues: z.array(issue) }).passthrough(),
};

export function validateAiResponse<T>(path: string, payload: unknown): T {
  const contract = contracts[path];
  if (!contract || !contract.safeParse(payload).success) {
    throw new BadGatewayException(`AI service returned an invalid response for ${path.split('/').pop()}.`);
  }
  return payload as T;
}
