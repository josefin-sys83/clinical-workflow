import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { intendedUseText } from '../modules/projects/project-generation-context';

export type GenerationInput = { label: string; value: string; fingerprint?: string };
export type SectionProvenance = {
  aiGenerated: boolean;
  generatedAt: string | null;
  inputs: GenerationInput[] | null;
  editedBy: string | null;
  editedAt: string | null;
};
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value) ?? '').digest('hex');
const iso = (value: any): string => value instanceof Date ? value.toISOString() : String(value);

/** Capture before calling AI. Source fingerprints identify inputs without duplicating clinical text. */
export function generationInputs(projectData: any, scope: any, roles: any[], synopsis: unknown, protocolSections?: any[]): GenerationInput[] {
  const inputs: GenerationInput[] = [];
  const add = (label: string, value: unknown) => {
    if (value != null && String(value).trim()) inputs.push({ label, value: String(value) });
  };
  add('Project', projectData.projectName);
  add('Sponsor', projectData.sponsor);
  add('Device', projectData.deviceName);
  add('Device category', projectData.deviceCategory);
  add('Risk class', projectData.riskClass || projectData.risk);
  add('Target markets', (projectData.targetMarkets || []).join(', '));
  add('Intended use', intendedUseText(scope));
  add('Study type', scope.studyType);
  const accepted = (scope.requirements || []).filter((r: any) => r.status === 'accepted');
  inputs.push({ label: 'Accepted requirements', value: accepted.length
    ? accepted.map((r: any) => r.title || r.id).join('; ') : 'None', fingerprint: fingerprint(accepted) });
  inputs.push({ label: 'Scope', value: 'Saved scope used for generation', fingerprint: fingerprint(scope) });
  if (synopsis && (typeof synopsis !== 'string' || synopsis.trim())) {
    inputs.push({ label: 'Synopsis', value: 'Saved synopsis used for generation', fingerprint: fingerprint(synopsis) });
  }
  if (roles.length) inputs.push({ label: 'Project roles', value: roles.map(role =>
    `${role.title}: ${(role.assignedTo || []).map((person: any) => person.name || person.email || 'Unnamed').join(', ') || 'Unassigned'}`
  ).join('; '), fingerprint: fingerprint(roles) });
  for (const section of protocolSections || []) inputs.push({ label: `Protocol: ${section.title || section.id}`,
    value: section.revision ? `Revision ${section.revision}` : 'Saved section used for generation', fingerprint: fingerprint(section) });
  return inputs;
}

/** Read only provenance fields from existing audit events, never the stored before/after clinical text. */
export async function loadSectionProvenance(projectId: string, kind: 'protocol' | 'report', db: Pick<PoolClient, 'query'>) {
  const types = kind === 'protocol' ? ['protocol.generated', 'section.content.updated']
    : ['report.ai.generated', 'report.section.ai.generated', 'report.sections.updated'];
  const { rows } = await db.query(
    `select type, entity_id, actor_name, created_at,
      metadata->'sectionIds' as section_ids, metadata->>'sectionId' as section_key,
      metadata->'generationInputs' as inputs, metadata->'contentEditedSectionIds' as edited_ids,
      metadata->>'generatedAt' as generated_at, metadata->>'updatedAt' as edited_at
     from audit_event where project_id=$1 and type=any($2::text[])
     order by created_at, id`, [projectId, types],
  );
  const bySection = new Map<string, SectionProvenance>();
  const empty = (): SectionProvenance => ({ aiGenerated: false, generatedAt: null, inputs: null, editedBy: null, editedAt: null });
  // Legacy protocol generation records didn't list section IDs. Its durable section flag remains authoritative.
  let legacyProtocolGeneration: SectionProvenance | undefined;
  for (const row of rows) {
    if (row.type === 'protocol.generated' || row.type === 'report.ai.generated' || row.type === 'report.section.ai.generated') {
      const generation = { ...empty(), aiGenerated: true, generatedAt: row.generated_at || iso(row.created_at),
        inputs: Array.isArray(row.inputs) ? row.inputs : null };
      const ids = Array.isArray(row.section_ids) ? row.section_ids
        : row.type === 'report.section.ai.generated' ? [row.section_key || row.entity_id] : [];
      if (row.type === 'protocol.generated' && !ids.length) {
        legacyProtocolGeneration = generation;
        for (const key of bySection.keys()) bySection.set(key, { ...generation });
      }
      for (const id of ids) bySection.set(String(id), { ...generation });
    } else {
      const ids = row.type === 'section.content.updated' ? [row.section_key || row.entity_id]
        : Array.isArray(row.edited_ids) ? row.edited_ids : [];
      for (const id of ids) {
        const key = String(id);
        bySection.set(key, { ...(bySection.get(key) || legacyProtocolGeneration || empty()),
          editedBy: row.actor_name || 'Unknown user', editedAt: row.edited_at || iso(row.created_at) });
      }
    }
  }
  return (sectionId: string, knownAiGenerated = false): SectionProvenance => {
    const saved = bySection.get(sectionId) || (knownAiGenerated ? legacyProtocolGeneration : undefined) || empty();
    return { ...saved, aiGenerated: saved.aiGenerated || knownAiGenerated };
  };
}
