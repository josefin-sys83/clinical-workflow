import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResultDto, ResultDecisionDto, UpdateResultDto } from './dto';

describe('result validation', () => {
  it('accepts structured content and a file location', async () => {
    expect(
      await validate(
        plainToInstance(CreateResultDto, {
          type: 'table',
          title: 'Population',
          content: { rows: [[42]] },
          sourceFilename: 'analysis.xlsx',
          sourceLocation: 'Sheet 2, rows 4-9',
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    'title',
    'content',
    'sourceFilename',
    'description',
    'placement',
    'titleOrigin',
  ])('does not treat null %s as an omitted edit', async (field) => {
    expect(
      await validate(
        plainToInstance(UpdateResultDto, { expectedVersion: 1, [field]: null }),
      ),
    ).not.toEqual([]);
  });

  it('allows clearing nullable references, and requires a positive version', async () => {
    expect(
      await validate(
        plainToInstance(UpdateResultDto, {
          expectedVersion: 1,
          reportSectionId: null,
          sourceDocumentId: null,
          originalReference: null,
        }),
      ),
    ).toEqual([]);
    for (const expectedVersion of [undefined, 0, -1, '1'])
      expect(
        await validate(
          plainToInstance(ResultDecisionDto, {
            expectedVersion,
            decision: 'accept',
          }),
        ),
      ).not.toEqual([]);
  });

  it('rejects embedded null bytes in content values', async () => {
    expect(
      await validate(
        plainToInstance(UpdateResultDto, {
          expectedVersion: 1,
          content: { rows: [['bad\0value']] },
        }),
      ),
    ).not.toEqual([]);
  });
});
