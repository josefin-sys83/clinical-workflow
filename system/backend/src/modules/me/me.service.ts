import { Injectable } from '@nestjs/common';
import { getPool } from '../../db/pg';

type ActionDef = {
  action: string;
  actionType: 'signature' | 'review' | 'input' | 'blocker';
  document: string;
  description: string;
};

const ROLE_STEP_ACTIONS: Record<string, Record<string, ActionDef>> = {
  'Medical Writer': {
    'protocol-make': { action: 'Input needed', actionType: 'input', document: 'Clinical Investigation Protocol', description: 'Protocol sections require authoring' },
    'report-make': { action: 'Input needed', actionType: 'input', document: 'Clinical Investigation Report', description: 'Report sections require authoring' },
  },
  'Protocol Lead': {
    'protocol-make': { action: 'Input needed', actionType: 'input', document: 'Clinical Investigation Protocol', description: 'Protocol requires your input as Protocol Lead' },
    'protocol-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Protocol', description: 'Protocol requires your review' },
    'report-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Report', description: 'Report requires your review' },
    'report-pdf': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Report', description: 'Report PDF requires your signature as Protocol Lead' },
  },
  'Principal Investigator': {
    'protocol-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Protocol', description: 'Protocol requires your clinical review' },
    'protocol-pdf': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Protocol', description: 'Protocol PDF requires your signature' },
    'report-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Report', description: 'Report requires your clinical review' },
    'report-pdf': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Report', description: 'Report PDF requires your signature' },
  },
  'Statistician': {
    'protocol-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Protocol', description: 'Protocol requires your statistical review' },
    'report-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Report', description: 'Report requires your statistical review' },
  },
  'Regulatory Affairs': {
    'protocol-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Protocol', description: 'Protocol requires your regulatory review' },
    'report-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Report', description: 'Report requires your regulatory review' },
  },
  'Quality Assurance': {
    'protocol-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Protocol', description: 'Protocol requires your QA review' },
    'report-review': { action: 'Review', actionType: 'review', document: 'Clinical Investigation Report', description: 'Report requires your QA review' },
  },
  'Clinical Affairs VP': {
    'protocol-review': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Protocol', description: 'Protocol requires your executive approval' },
    'protocol-pdf': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Protocol', description: 'Protocol PDF requires your signature' },
    'report-review': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Report', description: 'Report requires your executive approval' },
    'report-pdf': { action: 'Sign', actionType: 'signature', document: 'Clinical Investigation Report', description: 'Report PDF requires your signature' },
  },
  'Project Manager': {
    'project-setup': { action: 'Input needed', actionType: 'input', document: 'Project Setup', description: 'Project setup requires your completion' },
  },
};

const STEP_PATHS: Record<string, string> = {
  'project-setup': 'project-setup',
  'protocol-make': 'protocol/make',
  'protocol-review': 'protocol/review',
  'protocol-pdf': 'protocol/pdf',
  'report-make': 'report/make',
  'report-review': 'report/review',
  'report-pdf': 'report/pdf',
};

const PRIORITY_BY_TYPE: Record<string, 'High' | 'Medium' | 'Low'> = {
  signature: 'High',
  review: 'Medium',
  input: 'Medium',
  blocker: 'High',
};

export type RequiredAction = {
  id: string;
  projectId: string;
  projectName: string;
  document: string;
  description: string;
  action: string;
  actionType: 'signature' | 'review' | 'input' | 'blocker';
  myRole: string;
  priority: 'High' | 'Medium' | 'Low';
  link: string;
};

@Injectable()
export class MeService {
  async getEmail(userId: string): Promise<string | null> {
    const pool = getPool();
    const { rows } = await pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
    return rows[0]?.email ?? null;
  }

  async getActions(userId: string, companyId?: string | null, isSuperadmin?: boolean): Promise<RequiredAction[]> {
    const pool = getPool();

    const userEmail = (await this.getEmail(userId))?.toLowerCase();

    if (!userEmail) return [];

    // Scoped by company_id (superadmins see across all companies, matching
    // ProjectsService.list()) and selecting only data->'roles' instead of the full
    // `data` blob — this endpoint is hit on every dashboard load, and `data` can carry
    // MB-scale embedded content (protocol/report sections, base64 synopsis files) that
    // has nothing to do with computing required actions.
    const { rows: projects } = isSuperadmin
      ? await pool.query<{ id: string; name: string; roles: any }>(
        `SELECT id, name, data->'roles' AS roles FROM projects WHERE status = 'active'`,
      )
      : await pool.query<{ id: string; name: string; roles: any }>(
        `SELECT id, name, data->'roles' AS roles FROM projects WHERE status = 'active' AND company_id = $1`,
        [companyId ?? null],
      );

    const projectIds = projects.map((p) => p.id);
    const { rows: stepStateRows } = projectIds.length
      ? await pool.query<{ project_id: string; step_id: string; state: string }>(
        `SELECT project_id, step_id, state FROM workflow_step_state WHERE project_id = ANY($1::uuid[])`,
        [projectIds],
      )
      : { rows: [] as { project_id: string; step_id: string; state: string }[] };

    const stateByKey = new Map<string, string>();
    for (const row of stepStateRows) {
      stateByKey.set(`${row.project_id}:${row.step_id}`, row.state);
    }

    console.log(`[me/actions] user=${userEmail} projects=${projects.length}`);
    const actions: RequiredAction[] = [];

    for (const project of projects) {
      const roles: Array<{ title: string; assignedTo?: Array<{ email: string }> }> =
        project.roles ?? [];

      const userRoleTitles = roles
        .filter(r => r.assignedTo?.some(a => a.email?.toLowerCase() === userEmail))
        .map(r => r.title);

      if (userRoleTitles.length) {
        console.log(`[me/actions]   project=${project.id} roles=[${userRoleTitles.join(',')}]`);
      }

      for (const roleTitle of userRoleTitles) {
        const stepMap = ROLE_STEP_ACTIONS[roleTitle];
        if (!stepMap) continue;

        for (const [stepId, def] of Object.entries(stepMap)) {
          const state = stateByKey.get(`${project.id}:${stepId}`) ?? 'draft';
          if (state !== 'draft') continue;

          const stepPath = STEP_PATHS[stepId];
          if (!stepPath) continue;

          actions.push({
            id: `${project.id}:${stepId}:${roleTitle}`,
            projectId: project.id,
            projectName: project.name,
            document: def.document,
            description: def.description,
            action: def.action,
            actionType: def.actionType,
            myRole: roleTitle,
            priority: PRIORITY_BY_TYPE[def.actionType],
            link: `/projects/${project.id}/workflow/${stepPath}`,
          });
        }
      }
    }

    return actions;
  }
}
