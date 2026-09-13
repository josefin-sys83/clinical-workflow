import { getReportSectionDefinitions, resolveReportMarkets } from './report-section-definitions';

describe('report section definitions', () => {
  it.each([
    [['Australia', 'Canada'], 10],
    [['EU'], 11],
    [['FDA'], 11],
    [['EU', 'US'], 12],
  ])('numbers sections and appendices for markets %j', (markets, count) => {
    const definitions = getReportSectionDefinitions(markets as string[]);
    expect(definitions.map(d => d.number)).toEqual(Array.from({ length: count as number }, (_, i) => i + 1));
    expect(definitions.at(-1)?.id).toBe('section-appendices');
  });

  it('uses the same market fallback as the report metadata endpoint', () => {
    expect(resolveReportMarkets([], {})).toEqual(['EU']);
    expect(resolveReportMarkets([], { requirements: [{ title: 'FDA guidance', status: 'accepted' }] })).toEqual(['FDA']);
    expect(resolveReportMarkets(['Canada'], {})).toEqual(['Canada']);
  });
});
