export interface MandatoryStandardDef {
  id: string;
  title: string;
  description: string;
  /** Lowercase keywords used to detect whether a requirement (AI-generated or otherwise)
   * already covers this standard, so it's only backfilled when genuinely missing rather
   * than duplicated alongside an AI item that already names it differently. */
  matchKeywords: string[];
}

// Baseline regulatory standards that apply to essentially every clinical investigation of
// a medical device, independent of device category — unlike device-category-specific
// standards (IMDRF N41 for SaMD, ISO 14708 for AIMD, IVDR for IVD...), these are never
// conditionally skipped once any target market is selected.
//
// Single source of truth for these two systems, which previously computed requirements
// independently with no shared data: ProjectSetupPage's "Auto-Detected Requirements"
// preview (deterministic, display-only, never persisted) and Gate1's actual persisted
// requirement list (AI-generated via analyze-scope, non-deterministic). Because neither
// referenced the other, a standard flagged during Setup — including these two — could
// silently vanish once the AI-generated list on the Scope step replaced it wholesale.
// See Gate1.tsx's generateRequirements() for how this is used to backfill AI omissions.
export const MANDATORY_STANDARDS: MandatoryStandardDef[] = [
  {
    id: 'mandatory-iso-14971',
    title: 'Risk Management (ISO 14971)',
    description: 'Application of risk management to medical devices throughout the product lifecycle — required for essentially all medical device clinical investigations.',
    matchKeywords: ['14971'],
  },
  {
    id: 'mandatory-iso-13485',
    title: 'Quality Management System (ISO 13485)',
    description: 'Quality management system requirements for the medical device organization conducting the investigation.',
    matchKeywords: ['13485'],
  },
];

export function getMandatoryStandards(targetMarkets: string[]): MandatoryStandardDef[] {
  return targetMarkets.length > 0 ? MANDATORY_STANDARDS : [];
}

// Appends a synthesized entry (via makeEntry) for every mandatory standard not already
// covered by `existing` — matched by keyword against each existing item's title +
// description, case-insensitively. Existing items are returned untouched and in order;
// missing mandatory standards are appended at the end.
export function mergeMandatoryStandards<T extends { title: string; description?: string }>(
  existing: T[],
  targetMarkets: string[],
  makeEntry: (def: MandatoryStandardDef) => T,
): T[] {
  const missing = getMandatoryStandards(targetMarkets).filter(def =>
    !existing.some(item => {
      const haystack = `${item.title} ${item.description ?? ''}`.toLowerCase();
      return def.matchKeywords.some(k => haystack.includes(k));
    })
  );
  return [...existing, ...missing.map(makeEntry)];
}
