import { BadRequestException } from '@nestjs/common';
import { requireOverrideJustification } from './projects.service';

describe('synopsis AI finding override validation', () => {
  it.each([undefined, null, '', '   '])('rejects a missing justification: %p', value => {
    expect(() => requireOverrideJustification(value)).toThrow(BadRequestException);
  });

  it('trims and accepts a meaningful justification', () => {
    expect(requireOverrideJustification('  Reviewed against source section 4.2.  '))
      .toBe('Reviewed against source section 4.2.');
  });
});
