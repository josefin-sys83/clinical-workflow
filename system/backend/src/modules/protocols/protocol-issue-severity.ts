import { z } from 'zod';

export const protocolIssueSeverity = z.enum([
  'blocker',
  'warning',
  'cross_reference',
  'recommendation',
  'human_decision_required',
]);
