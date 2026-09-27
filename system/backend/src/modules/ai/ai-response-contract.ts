import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';

const text = z.string().refine(value => value.trim().length > 0);
const element = z.object({ id: text, name: text, reference: text });
const reviewedElement = element.extend({ status: z.enum(['complete', 'partial', 'missing']) });
const issue = z.object({ description: text, severity: z.enum(['blocker', 'warning']) }).passthrough();

// Mirrors clinical_ai/modules/protocol/models.py and readme_schema.md.
const protocolIssue = z.object({
  id: text,
  severity: z.enum(['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required']),
  subsection: text,
  description: text,
  source: text.nullable(),
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
