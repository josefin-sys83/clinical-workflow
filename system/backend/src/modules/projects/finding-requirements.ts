import { BadGatewayException, BadRequestException } from '@nestjs/common';

export function acceptedFindingRequirements(requirements: unknown): Array<{
  id: string; title: string; description: string;
}> {
  if (!Array.isArray(requirements)) return [];
  return requirements
    .filter(requirement => requirement?.status === 'accepted'
      && typeof requirement.id === 'string' && requirement.id.trim())
    .map(requirement => ({
      id: requirement.id,
      title: typeof requirement.title === 'string' ? requirement.title : '',
      description: typeof requirement.description === 'string' ? requirement.description : '',
    }));
}

// Keep the existing string request contract while carrying stable IDs explicitly.
export function findingRequirementsText(requirements: unknown): string {
  return JSON.stringify(acceptedFindingRequirements(requirements));
}

export function validateFindingRequirements(
  issues: any[], requirements: unknown, origin: 'ai' | 'saved' = 'saved',
): any[] {
  const acceptedIds = new Set(acceptedFindingRequirements(requirements).map(requirement => requirement.id));
  const fail = (message: string): never => {
    if (origin === 'ai') throw new BadGatewayException(`AI finding ${message}`);
    throw new BadRequestException(`Finding ${message}`);
  };
  return issues.map(issue => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) fail('must be an object');
    if (origin === 'ai' && issue.requirementId === undefined) {
      fail('must include requirementId (an accepted requirement ID or null)');
    }
    const id = issue.requirementId;
    // Legacy/manual findings can omit the field. Explicit empty strings mean no link.
    if (id == null || id === '') return { ...issue, requirementId: null };
    if (typeof id !== 'string' || !acceptedIds.has(id)) {
      fail('requirementId must reference an accepted requirement in this project');
    }
    return { ...issue, requirementId: id };
  });
}
