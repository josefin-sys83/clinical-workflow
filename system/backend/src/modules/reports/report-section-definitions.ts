// Shared by report metadata, persisted section creation, and ordered reads.
export function resolveReportMarkets(markets: string[], scope: any): string[] {
  if (markets.length) return markets;
  const inferred = (scope?.requirements || [])
    .filter((r: any) => r.status === 'accepted')
    .flatMap((r: any) => {
      const title = String(r.title || '');
      if (title.includes('FDA') || title.includes('US')) return ['FDA'];
      if (title.includes('EU') || title.includes('MDR')) return ['EU']; 
      return [];
    });
  return inferred.length ? [...new Set<string>(inferred)] : ['EU'];
}
//['EU'] or ['FDA'] or ['EU', 'FDA'] or ['FDA', 'EU'] or ['US'] or other markets 


export function getReportSectionDefinitions(targetMarkets: string[]): Array<{ id: string; title: string; number: number }> {
    const baseSections = [
      { id: 'section-1', title: 'Executive Summary', number: 1 },
      { id: 'section-2', title: 'Introduction and Background', number: 2 },
      { id: 'section-3', title: 'Objectives and Endpoints', number: 3 },
      { id: 'section-4', title: 'Clinical Investigation Design', number: 4 },
      { id: 'section-5', title: 'Statistical Methods', number: 5 },
      { id: 'section-6', title: 'Subject Disposition and Baseline', number: 6 },
      { id: 'section-7', title: 'Clinical Performance Results', number: 7 },
      { id: 'section-8', title: 'Safety Analysis', number: 8 },
      { id: 'section-9', title: 'Conclusions and Benefit-Risk Assessment', number: 9 },
    ];

    const dynamicSections: Array<{ id: string; title: string }> = [];
    if (targetMarkets.includes('EU')) {
      dynamicSections.push({
        id: 'section-eu-compliance',
        title: 'Regulatory Compliance Statement (EU MDR 2017/745)',
      });
    }
    if (targetMarkets.includes('FDA') || targetMarkets.includes('US')) {
      dynamicSections.push({
        id: 'section-us-ide',
        title: 'Investigational Device Exemption (IDE) Compliance Summary',
      });
    }

    const numbered = dynamicSections.map((s, i) => ({ ...s, number: 10 + i }));
    const appendicesNumber = 10 + dynamicSections.length;

    return [
      ...baseSections,
      ...numbered,
      { id: 'section-appendices', title: 'Report Appendices', number: appendicesNumber },
    ];
}
