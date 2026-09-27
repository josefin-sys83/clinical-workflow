import { withAcceptedBaselineRequirements } from './baseline-requirements';
import { ProjectsService } from './projects.service';
import * as pg from '../../db/pg';
import { ProtocolsController } from '../protocols/protocols.controller';

jest.mock('../../common/analysis-request-logger', () => ({ logAnalyzeSectionRequest: jest.fn() }));

const standards = [
  { id: 1, code: 'ISO-14971', title: 'ISO 14971 (Risk Management)', alwaysApplies: true },
  { id: 2, code: 'ISO-13485', title: 'ISO 13485 (QMS)', alwaysApplies: true },
  { id: 3, code: 'ISO-14155', title: 'ISO 14155 (GCP)', alwaysApplies: false },
];

describe('accepted baseline requirements', () => {
  afterEach(() => jest.restoreAllMocks());

  it('follows the database flag rather than a hardcoded standard code', () => {
    const scope = withAcceptedBaselineRequirements({ requirements: [
      { id: 'standard-1', title: 'ISO-14971', status: 'not-applicable' },
    ] }, [
      { ...standards[0], alwaysApplies: false },
      { id: 4, code: 'OTHER-STANDARD', title: 'Another baseline', alwaysApplies: true },
    ]);
    expect(scope.requirements.map((r: any) => [r.id, r.status, r.alwaysApplies])).toEqual([
      ['standard-4', 'accepted', true], ['standard-1', 'not-applicable', false],
    ]);
  });

  it('adds only the two baselines and preserves acceptance choices for every other requirement', () => {
    const optional = { id: 'standard-3', title: 'ISO-14155', status: 'not-applicable', source: 'mandatory' };
    const scope = withAcceptedBaselineRequirements({ requirements: [optional] }, standards);
    expect(scope.requirements.map((r: any) => [r.id, r.status, r.alwaysApplies])).toEqual([
      ['standard-1', 'accepted', true], ['standard-2', 'accepted', true], ['standard-3', 'not-applicable', false],
    ]);
  });

  it('restores baselines if omitted or declined and deduplicates spaced ISO names', () => {
    const scope = withAcceptedBaselineRequirements({ requirements: [
      { id: 'standard-1', title: 'ISO-14971', status: 'not-applicable', justification: 'Declined' },
      { id: 'duplicate', title: 'ISO 13485 (QMS)', status: 'suggested' },
    ] }, standards);
    expect(scope.requirements).toHaveLength(2);
    expect(scope.requirements.every((r: any) => r.status === 'accepted' && r.alwaysApplies)).toBe(true);
    expect(scope.requirements[0].justification).toBeUndefined();
  });

  it('includes both baselines in GET project Scope and marks only those standards always applicable', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('from projects where')) return { rows: [{ id: 'project', data: { scope: { requirements: [] } } }] };
      if (sql.includes('FROM project_standards')) return { rows: standards };
      return { rows: [] };
    });
    jest.spyOn(pg, 'getPool').mockReturnValue({ query } as any);
    const protocols = { getByProject: jest.fn(), getSignaturesByProject: jest.fn().mockResolvedValue([]) };
    const reports = { getByProject: jest.fn(), getSignaturesByProject: jest.fn().mockResolvedValue([]) };
    const service = new ProjectsService({} as any, {} as any, protocols as any, reports as any);
    const project = await service.get('project');
    const accepted = project.data.scope.requirements.filter((r: any) => r.status === 'accepted')
      .map((r: any) => `${r.title}: ${r.description}`).join('\n');
    expect(accepted).toContain('ISO-14971');
    expect(accepted).toContain('ISO-13485');
    expect(accepted).not.toContain('ISO-14155');
    expect((await service.getProjectStandards('project')).map(s => s.alwaysApplies)).toEqual([true, true, false]);
    const standardsQuery = query.mock.calls.find(([sql]) => sql.includes('FROM project_standards'))?.[0];
    expect(standardsQuery).toContain('EXISTS (');
    expect(standardsQuery).toContain('sr.standard_id = s.id AND sr.always_applies = true');
  });

  it('persists both baselines as accepted when a Scope update tries to omit or decline them', async () => {
    const client = { query: jest.fn(async (sql: string) => {
      if (sql.includes('SELECT data, risk')) return { rows: [{ data: { scope: {} }, risk: 'IIa', device_category: 'active' }] };
      if (sql.includes('FROM project_standards')) return { rows: standards };
      if (sql.includes('SELECT m.code')) return { rows: [{ code: 'EU' }] };
      return { rows: [] };
    }), release: jest.fn() };
    jest.spyOn(pg, 'getPool').mockReturnValue({ connect: async () => client } as any);
    const service = new ProjectsService({} as any, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, 'replaceProjectStandards').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'recordProjectMutation').mockResolvedValue(undefined);
    jest.spyOn(service, 'get').mockResolvedValue({ id: 'project' } as any);
    await service.update('project', { data: { scope: { requirements: [
      { id: 'standard-1', title: 'ISO-14971', status: 'not-applicable' },
      { id: 'optional', title: 'Study requirement', status: 'accepted', description: 'Specific constraint' },
    ] } } });
    const write = (client.query.mock.calls as any[]).find(([sql]) => sql.includes('UPDATE projects SET'));
    const saved = JSON.parse(write[1][5]).scope.requirements;
    expect(saved.map((r: any) => [r.id, r.status])).toEqual([
      ['standard-1', 'accepted'], ['standard-2', 'accepted'], ['optional', 'accepted'],
    ]);
  });

  it('sends both baselines alongside user-accepted requirements in analyze-section', async () => {
    const scope = withAcceptedBaselineRequirements({ requirements: [
      { id: 'optional', title: 'Study requirement', description: 'Specific constraint', status: 'accepted' },
      { id: 'standard-3', title: 'ISO-14155', status: 'not-applicable', source: 'mandatory' },
    ] }, standards);
    const project = { id: 'project', targetMarkets: ['EU'], deviceCategory: 'active', data: { scope } };
    const section = { id: '1', title: 'Protocol Overview', content: 'Protocol overview', requiredElements: [] };
    const protocols = {
      beginSectionAnalysis: jest.fn().mockResolvedValue({ section, requestId: 'request' }),
      finishSectionAnalysis: jest.fn(), listAttachmentsForAnalysis: jest.fn().mockResolvedValue([]),
    };
    const ai = { analyzeSection: jest.fn().mockResolvedValue({ issues: [] }) };
    const controller = new ProtocolsController({ get: jest.fn().mockResolvedValue(project) } as any,
      protocols as any, ai as any, {} as any, {} as any,
      { assertDocumentNotSigned: jest.fn() } as any, {} as any);
    await controller.analyzeSection('project', { sectionId: '1', sectionTitle: section.title, sectionContent: section.content });
    const accepted = ai.analyzeSection.mock.calls[0][8];
    expect(accepted).toContain('ISO-14971');
    expect(accepted).toContain('ISO-13485');
    expect(accepted).toContain('Study requirement: Specific constraint');
    expect(accepted).not.toContain('ISO-14155');
  });
});
