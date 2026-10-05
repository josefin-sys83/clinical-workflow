import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { findingRequirementsText, validateFindingRequirements } from './finding-requirements';

const requirements = [
  { id: 'accepted-1', title: 'Safety', description: 'Describe monitoring', status: 'accepted' },
  { id: 'suggested-1', title: 'Suggested', status: 'suggested' },
  { id: 'excluded-1', title: 'Excluded', status: 'not-applicable' },
];

describe('finding requirement links', () => {
  it('sends only accepted requirements with their exact IDs and text', () => {
    expect(JSON.parse(findingRequirementsText(requirements))).toEqual([
      { id: 'accepted-1', title: 'Safety', description: 'Describe monitoring' },
    ]);
    expect(findingRequirementsText(undefined)).toBe('[]');
  });

  it.each(['accepted-1', null, ''])('accepts an explicit AI link or no link: %p', requirementId => {
    expect(validateFindingRequirements([{ requirementId }], requirements, 'ai'))
      .toEqual([{ requirementId: requirementId || null }]);
  });

  it.each([undefined, 'invented', 'other-project-id', 'suggested-1', 'excluded-1', ' accepted-1 ', 42, {}])(
    'rejects missing, unaccepted, foreign, or malformed AI IDs: %p', requirementId => {
      expect(() => validateFindingRequirements([{ requirementId }], requirements, 'ai'))
        .toThrow(BadGatewayException);
    },
  );

  it('rejects links when the project has no accepted requirements', () => {
    expect(() => validateFindingRequirements([{ requirementId: 'accepted-1' }], [], 'ai'))
      .toThrow(BadGatewayException);
  });

  it('allows legacy unlinked findings but rejects invented links on writes', () => {
    expect(validateFindingRequirements([{ description: 'Legacy' }], requirements))
      .toEqual([{ description: 'Legacy', requirementId: null }]);
    expect(() => validateFindingRequirements([{ requirementId: 'invented' }], requirements))
      .toThrow(BadRequestException);
  });
});
