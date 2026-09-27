/** Database rules determine which standards are automatically accepted. */
export function withAcceptedBaselineRequirements(
  scope: any,
  standards: Array<{ id: number; code: string; title: string; alwaysApplies: boolean }>,
) {
  const baseline = standards.filter(standard => standard.alwaysApplies);
  const ids = new Set(baseline.map(standard => `standard-${standard.id}`));
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const codes = baseline.map(standard => normalize(standard.code));
  const requirements = Array.isArray(scope?.requirements) ? scope.requirements : [];
  return {
    ...(scope || {}),
    requirements: [
      ...baseline.map(standard => ({
        id: `standard-${standard.id}`,
        title: `${standard.code} — ${standard.title}`,
        description: 'Always required as a mandatory baseline for every project.',
        status: 'accepted',
        source: 'mandatory',
        alwaysApplies: true,
      })),
      ...requirements.filter((requirement: any) =>
        !ids.has(requirement.id) &&
        !codes.some(code => normalize(String(requirement.title ?? '')).includes(code)),
      ).map((requirement: any) => ({ ...requirement, alwaysApplies: false })),
    ],
  };
}
