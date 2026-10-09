import { getPool } from '../../db/pg';
import { ProjectsService } from './projects.service';
import { buildProtocolGenerationContext, selectProjectContext } from './project-generation-context';
import { replaceProjectRequirements } from './project-requirements';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

describe('relational project requirements', () => {
  it('hydrates a project from the tables without synthesizing a JSON requirement list', async () => {
    const requirements = [{ id: 'standard-1', title: 'ISO-14971', status: 'accepted', source: 'mandatory', alwaysApplies: true }];
    (getPool as jest.Mock).mockReturnValue({ query: jest.fn(async (sql: string) => ({ rows:
      sql.includes('from projects where') ? [{ id: 'project', data: { scope: { intendedUse: 'Monitoring' } } }]
      : sql.includes('from project_standards pr') ? requirements : [] })) });
    const service = new ProjectsService({} as any, {} as any,
      { getByProject: async () => null, getSignaturesByProject: async () => [] } as any,
      { getByProject: async () => null, getSignaturesByProject: async () => [] } as any);
    const project = await service.get('project');
    expect(project.requirements).toEqual(requirements);
    expect(project.data.scope).not.toHaveProperty('requirements');
    expect(selectProjectContext(project, ['acceptedRequirements']).acceptedRequirements)
      .toEqual([{ id: 'standard-1', title: 'ISO-14971', description: '' }]);
  });

  it('uses table-backed assignments in Python context, never the retired JSON list', () => {
    const project = { requirements: [{ id: 'stored', definitionId: 42, title: 'PMCF', status: 'accepted' }],
      data: { scope: { requirements: [{ id: 'obsolete', status: 'accepted' }] } } };
    expect(buildProtocolGenerationContext(project).scope.requirements).toEqual([{ id: 'stored', title: 'PMCF', status: 'accepted' }]);
  });

  it('rejects old-format writes before opening a transaction', async () => {
    const service = new ProjectsService({} as any, {} as any, {} as any, {} as any);
    await expect(service.update('project', { data: { scope: { requirements: [] } } })).rejects.toThrow('no longer supported');
  });

  it.each([
    [{ id: 'r', title: 'PMCF', description: '', status: 'not-applicable', source: 'ai-suggested' }],
    [{ id: 'r', title: 'PMCF', description: '', status: 'accepted', source: 'invalid' }],
  ])('rejects invalid decisions before writes: %p', async requirements => {
    const client = { query: jest.fn() };
    await expect(replaceProjectRequirements('project', requirements, client as any)).rejects.toThrow();
    expect(client.query).not.toHaveBeenCalled();
  });
});
