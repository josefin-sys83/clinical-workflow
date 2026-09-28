import { buildGenerationMetadataLog, buildProjectGenerationContext, intendedUseText } from './project-generation-context';

describe('project generation context', () => {
  it('uses normalized relational fields and projectData identity fields', () => {
    const context = buildProjectGenerationContext({
      name: 'Relational title',
      risk: 'IIa',
      deviceCategory: 'active',
      targetMarkets: ['EU', 'FDA'],
      data: {
        projectData: {
          sponsor: 'Canonical sponsor',
          deviceName: 'Canonical device',
        },
        scope: {
          intendedUse: 'monitoring',
          requirements: [{ id: 'requirement-1' }],
        },
      },
    });

    expect(context.aiProjectData).toEqual(expect.objectContaining({
      projectName: 'Relational title',
      risk: 'IIa',
      deviceCategory: 'active',
      targetMarkets: ['EU', 'FDA'],
      sponsor: 'Canonical sponsor',
      deviceName: 'Canonical device',
    }));
    expect(context.intendedUse).toBe('monitoring');
    expect(context.scope).toEqual({
      intendedUse: 'monitoring',
      requirements: [{ id: 'requirement-1' }],
      deviceCategory: 'active',
      targetMarkets: ['EU', 'FDA'],
    });
  });

  it('logs the exact metadata adapted for an AI generation request', () => {
    const context = buildProjectGenerationContext({
      id: 'project-1',
      name: 'Canonical study',
      deviceCategory: 'active',
      targetMarkets: ['EU'],
      data: {
        projectData: { sponsor: 'Canonical sponsor', deviceName: 'Canonical device' },
        scope: { intendedUse: 'other-custom', customIntendedUse: 'New intended use' },
      },
    });

    expect(buildGenerationMetadataLog(
      'protocol', 'project-1', context.aiProjectData, context.scope,
      [{ title: 'Project Manager', assignedTo: [{ name: 'Manager name' }] }],
    )).toEqual({
      event: 'ai.generation_metadata',
      generationPath: 'protocol',
      projectId: 'project-1',
      projectData: {
        projectName: 'Canonical study',
        sponsor: 'Canonical sponsor',
        deviceName: 'Canonical device',
        deviceCategory: 'active',
        targetMarkets: ['EU'],
      },
      scope: { intendedUse: 'other-custom', customIntendedUse: 'New intended use' },
      effectiveIntendedUse: 'New intended use',
      projectManager: 'Manager name',
    });
  });

  it('resolves custom intended use from scope', () => {
    expect(intendedUseText({
      intendedUse: 'other-custom',
      customIntendedUse: 'Custom clinical purpose',
    })).toBe('Custom clinical purpose');
  });
});
