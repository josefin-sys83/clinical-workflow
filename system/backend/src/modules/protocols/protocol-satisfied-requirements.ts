import { z } from 'zod';

const text = z.string().refine(value => value.trim().length > 0);

// Use the same shape when accepting AI coverage and saving section coverage.
export const satisfiedRequirementsSchema = z.array(z.object({
  name: text,
  status: z.literal('satisfied'),
  source: z.enum(['section', 'attachment']),
  sourceName: text.nullable(),
  evidence: text,
}).strict());
