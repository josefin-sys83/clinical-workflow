import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InternalServiceGuard } from '../../common/internal-service.guard';
import { ProjectContextController } from './project-context.controller';
import { PROJECT_CONTEXT_FIELD_NAMES, selectProjectContext } from './project-generation-context';

const project = {
  id: 'project',
  name: 'CardioSense LP — FIH',
  risk: 'III',
  deviceCategory: 'aimd',
  targetMarkets: ['EU', 'FDA'],
  requirements: [
    { id: 'r1', title: 'PMCF plan', description: 'MDR Annex XIV', status: 'accepted' },
    { id: 'r2', title: 'Not chosen', description: '', status: 'not-applicable' },
  ],
  data: {
    projectData: { sponsor: 'Nordkap Medical AB', deviceName: 'CardioSense LP' },
    scope: {
      intendedUse: 'other-custom',
      customIntendedUse: 'Leadless single-chamber pacing.',
    },
    synopsis: { extractedText: 'Synopsis text' },
  },
};

describe('project context fields', () => {
  it('reads each value from the shared generation context', () => {
    expect(selectProjectContext(project, PROJECT_CONTEXT_FIELD_NAMES)).toEqual({
      projectName: 'CardioSense LP — FIH',
      sponsor: 'Nordkap Medical AB',
      deviceName: 'CardioSense LP',
      deviceCategory: 'aimd',
      risk: 'III',
      targetMarkets: ['EU', 'US'],
      intendedUse: 'Leadless single-chamber pacing.',
      acceptedRequirements: [{ id: 'r1', title: 'PMCF plan', description: 'MDR Annex XIV' }],
      synopsis: 'Synopsis text',
    });
  });

  it('returns empty values rather than failing for a sparse project', () => {
    expect(selectProjectContext({ id: 'p', name: 'Empty' }, ['sponsor', 'acceptedRequirements', 'synopsis']))
      .toEqual({ sponsor: '', acceptedRequirements: [], synopsis: '' });
  });
});

describe('ProjectContextController', () => {
  const projects = { get: jest.fn() };
  const controller = new ProjectContextController(projects as any);

  beforeEach(() => projects.get.mockReset().mockResolvedValue(project));

  it('returns only the requested fields, once each', async () => {
    await expect(controller.getContext('project', 'sponsor, intendedUse,sponsor')).resolves.toEqual({
      projectId: 'project',
      fields: { sponsor: 'Nordkap Medical AB', intendedUse: 'Leadless single-chamber pacing.' },
    });
  });

  it('returns every field when none are requested', async () => {
    const result = await controller.getContext('project');
    expect(Object.keys(result.fields)).toEqual(PROJECT_CONTEXT_FIELD_NAMES);
  });

  it('rejects unknown fields before loading the project', async () => {
    await expect(controller.getContext('project', 'sponsor,password_hash')).rejects.toThrow(BadRequestException);
    expect(projects.get).not.toHaveBeenCalled();
  });

  it('passes through a missing project', async () => {
    projects.get.mockRejectedValue(new NotFoundException('Project not found'));
    await expect(controller.getContext('project', 'sponsor')).rejects.toThrow(NotFoundException);
  });
});

describe('InternalServiceGuard', () => {
  const guard = new InternalServiceGuard();
  const request = (authorization?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers: authorization ? { authorization } : {} }) }),
  }) as any;
  const original = process.env.AI_SERVICE_TOKEN;

  afterEach(() => { process.env.AI_SERVICE_TOKEN = original; });

  it('admits the service token', () => {
    process.env.AI_SERVICE_TOKEN = 'service-secret';
    expect(guard.canActivate(request('Bearer service-secret'))).toBe(true);
  });

  it.each([undefined, 'Bearer wrong', 'service-secret', 'Bearer '])('rejects %p', header => {
    process.env.AI_SERVICE_TOKEN = 'service-secret';
    expect(() => guard.canActivate(request(header))).toThrow(UnauthorizedException);
  });

  it('rejects everything when no service token is configured', () => {
    process.env.AI_SERVICE_TOKEN = '';
    expect(() => guard.canActivate(request('Bearer '))).toThrow(UnauthorizedException);
  });
});
