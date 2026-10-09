import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../db/pg';

export interface ProjectRequirement {
  // Assignment IDs are stable within their project, including existing finding links.
  id: string;
  definitionId?: number | null;
  title: string;
  description: string;
  status: 'suggested' | 'accepted' | 'not-applicable';
  justification?: string | null;
  source: 'ai-suggested' | 'user-defined' | 'library' | 'mandatory';
  alwaysApplies: boolean;
}

/** Read definitions and project decisions from the tables, using the caller's transaction when provided. */
export async function listProjectRequirements(projectId: string, client?: PoolClient): Promise<ProjectRequirement[]> {
  const { rows } = await (client ?? getPool()).query<ProjectRequirement>(
    `select pr.id, pr.standard_id as "definitionId",
            case when pr.source='mandatory' then r.code||' — '||r.title else coalesce(r.title,c.title) end as title,
            coalesce(r.description,c.description) as description,
            pr.status, pr.justification, pr.source, pr.is_mandatory as "alwaysApplies"
     from project_standards pr
     left join standards r on r.id=pr.standard_id
     left join custom_requirements c on c.id=pr.custom_requirement_id and c.project_id=pr.project_id
     where pr.project_id=$1 order by pr.is_mandatory desc, pr.position, pr.id`, [projectId],
  );
  return rows;
}

/** Reject the retired write contract rather than quietly saving an unused JSON copy. */
export function assertNoEmbeddedRequirements(data: any) {
  if (data?.scope && Object.prototype.hasOwnProperty.call(data.scope, 'requirements')) {
    throw new BadRequestException('Use the top-level requirements field; data.scope.requirements is no longer supported.');
  }
}

function validateRequirements(value: unknown): ProjectRequirement[] {
  if (!Array.isArray(value)) throw new BadRequestException('requirements must be an array');
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) ||
        typeof item.title !== 'string' || !item.title.trim() || typeof item.description !== 'string' ||
        !['suggested', 'accepted', 'not-applicable'].includes(item.status) ||
        !['ai-suggested', 'user-defined', 'library', 'mandatory'].includes(item.source) ||
        (item.justification != null && typeof item.justification !== 'string')) {
      throw new BadRequestException('Invalid project requirement or duplicate assignment ID');
    }
    if (item.status === 'not-applicable' && !item.justification?.trim()) {
      throw new BadRequestException('A justification is required for a requirement marked not applicable');
    }
    ids.add(item.id);
    return { ...item, title: item.title.trim(), alwaysApplies: false };
  });
}

/** Replace assignments under the project lock. Standards are shared; authored/AI definitions belong to one project. */
export async function replaceProjectRequirements(projectId: string, value: unknown, client: PoolClient) {
  const requested = validateRequirements(value);
  const current = await listProjectRequirements(projectId, client);
  const mandatory = current.filter(requirement => requirement.alwaysApplies);
  const mandatoryIds = new Set(mandatory.map(requirement => requirement.id));
  const requestedIds = new Set(requested.map(requirement => requirement.id));
  // Setup may just have introduced an applicable standard. Keep its saved row
  // when an autosave still contains the list from before that setup change.
  const omittedStandards = current.filter(requirement => requirement.source === 'mandatory' &&
    !requirement.alwaysApplies && !requestedIds.has(requirement.id));
  const items = [...mandatory, ...omittedStandards, ...requested.filter(requirement => !mandatoryIds.has(requirement.id))];
  const definitions = new Set<number>();
  for (const [position, requirement] of items.entries()) {
    let definitionId: number | null = null;
    let customId: string | null = null;
    if (requirement.source === 'user-defined' || requirement.source === 'ai-suggested') {
      // Reuse the project's custom row when its title/description is edited.
      const { rows } = await client.query(
        'select custom_requirement_id from project_standards where project_id=$1 and id=$2', [projectId, requirement.id],
      );
      customId = rows[0]?.custom_requirement_id || randomUUID();
      await client.query(
        `insert into custom_requirements(id,project_id,title,description) values($1,$2,$3,$4)
         on conflict(id) do update set title=excluded.title,description=excluded.description`,
        [customId, projectId, requirement.title, requirement.description],
      );
    } else {
      const original = current.find(item => item.id === requirement.id);
      const selectedDefinition = requirement.definitionId ?? original?.definitionId;
      if (!Number.isInteger(selectedDefinition)) throw new BadRequestException('A standard definition ID is required');
      const definition = await client.query('select id,category from standards where id=$1', [selectedDefinition]);
      if (!definition.rows[0]) throw new BadRequestException('Unknown Standard or library requirement');
      definitionId = definition.rows[0].id;
      if (requirement.source === 'mandatory' && (original?.source !== 'mandatory' || definitionId !== original.definitionId)) {
        throw new BadRequestException('Only applicable project standards can use the mandatory source');
      }
      if (requirement.source === 'library' && !definition.rows[0].category) throw new BadRequestException('Choose a library definition');
      if (definitions.has(definitionId!)) throw new BadRequestException('Duplicate standard requirement assignment');
      definitions.add(definitionId!);
    }
    await client.query(
      `insert into project_standards(project_id,id,standard_id,custom_requirement_id,status,justification,source,is_mandatory,position)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict(project_id,id) do update set standard_id=excluded.standard_id,custom_requirement_id=excluded.custom_requirement_id,
         status=excluded.status,justification=excluded.justification,source=excluded.source,is_mandatory=excluded.is_mandatory,
         position=excluded.position,updated_at=now()`,
      [projectId, requirement.id, definitionId, customId, requirement.status,
        requirement.justification?.trim() || null, requirement.source, requirement.alwaysApplies, position],
    );
  }
  try {
    await client.query('delete from project_standards where project_id=$1 and not(id=any($2::text[]))', [projectId, items.map(item => item.id)]);
    await client.query(`delete from custom_requirements c where c.project_id=$1
      and not exists(select 1 from project_standards pr where pr.custom_requirement_id=c.id)`, [projectId]);
  } catch (error) {
    if ((error as any)?.code === '23503') throw new BadRequestException('Remove the requirement links from findings and attachments before removing the requirement.');
    throw error;
  }
  return listProjectRequirements(projectId, client);
}

export async function listRequirementLibrary() {
  const { rows } = await getPool().query(`select 'library-'||id as id,id as "definitionId",title,description,category
    from standards where category is not null order by category,title`);
  return rows;
}
