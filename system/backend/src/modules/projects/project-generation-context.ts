import type { Project } from './projects.service';

// Treat the saved FDA market code as the US region in synopsis/protocol AI inputs.
export function normalizeAiMarkets(markets: unknown): string[] {
  if (!Array.isArray(markets)) return [];
  return [...new Set(markets.filter((market): market is string => typeof market === 'string')
    .map(market => market.trim())
    .filter(Boolean)
    .map(market => market.toUpperCase() === 'FDA' ? 'US' : market))];
}

export function acceptedRequirementsText(requirements: unknown): string {
  if (!Array.isArray(requirements)) return '';
  return requirements.filter(requirement => requirement?.status === 'accepted')
    .map(requirement => [requirement.title, requirement.description]
      .filter(value => typeof value === 'string' && value.trim())
      .join(': '))
    .filter(Boolean)
    .join('\n');
}

// Read authored/extracted content only. Readiness findings and file metadata are
// analysis of the synopsis, not a substitute for the source document.
export function sourceSynopsisText(synopsis: any): string {
  if (typeof synopsis === 'string') return synopsis;
  for (const key of ['extractedText', 'synopsisText', 'text', 'content']) {
    if (typeof synopsis?.[key] === 'string' && synopsis[key].trim()) return synopsis[key];
  }
  return '';
}

// These fields identify the project/device. They have one persisted source each:
// relational project fields where a normalized column/table exists, otherwise
// data.projectData, except intended use which is owned by data.scope because that
// is the established AI contract.
export function intendedUseText(scope: Record<string, any>): string {
  const selected = typeof scope.intendedUse === 'string'
    ? scope.intendedUse.trim()
    : '';
  const custom = typeof scope.customIntendedUse === 'string'
    ? scope.customIntendedUse.trim()
    : '';
  return selected === 'other-custom' ? custom : selected;
}

export function buildProjectGenerationContext(project: Project | any) {
  const storedProjectData = project?.data?.projectData || {};
  const storedScope = project?.data?.scope || {};
  const scope = { ...storedScope };

  const aiProjectData = {
    ...storedProjectData,
    // Adapt canonical storage to the existing AI request contract. This object
    // is returned to the caller and is never written back to the project row.
    projectName: project?.name || '',
    risk: project?.risk ?? '',
    deviceCategory: project?.deviceCategory || '',
    targetMarkets: Array.isArray(project?.targetMarkets) ? project.targetMarkets : [],
  };

  // These relational values are included in the transient Scope request only
  // because the existing AI service contract reads them there. They are not
  // persisted under data.scope.
  scope.deviceCategory = aiProjectData.deviceCategory;
  scope.targetMarkets = aiProjectData.targetMarkets;

  return {
    aiProjectData,
    scope,
    intendedUse: intendedUseText(scope),
  };
}

// Protocol opts into the updated Python context contract. Reports continue to
// use buildProjectGenerationContext with their existing payload behavior.
export function buildProtocolGenerationContext(project: Project | any) {
  const { aiProjectData, scope, intendedUse } = buildProjectGenerationContext(project);
  const targetMarkets = normalizeAiMarkets(aiProjectData.targetMarkets);
  return {
    aiProjectData: { ...aiProjectData, targetMarkets, intendedUse },
    scope: {
      ...scope,
      targetMarkets,
      intendedUse,
      requirements: Array.isArray(scope.requirements)
        ? scope.requirements.filter(requirement => requirement?.status === 'accepted')
        : [],
    },
    intendedUse,
  };
}

export function buildGenerationMetadataLog(
  generationPath: 'protocol' | 'report' | 'report-section',
  projectId: string,
  aiProjectData: Record<string, any>,
  scope: Record<string, any>,
  roles: any[],
) {
  const projectManager = roles
    .find(role => role?.title === 'Project Manager')
    ?.assignedTo?.[0]?.name || '';

  return {
    event: 'ai.generation_metadata',
    generationPath,
    projectId,
    // These are the exact metadata values supplied to the AI request. Keeping this
    // log next to the request adapter makes stale or conflicting values visible
    // without logging the synopsis, generated document, or other clinical text.
    projectData: {
      projectName: aiProjectData.projectName || '',
      sponsor: aiProjectData.sponsor || '',
      deviceName: aiProjectData.deviceName || '',
      deviceCategory: aiProjectData.deviceCategory || '',
      targetMarkets: Array.isArray(aiProjectData.targetMarkets) ? aiProjectData.targetMarkets : [],
    },
    scope: {
      intendedUse: scope.intendedUse || '',
      customIntendedUse: scope.customIntendedUse || '',
    },
    effectiveIntendedUse: intendedUseText(scope),
    projectManager,
  };
}

type ProtocolContext = ReturnType<typeof buildProtocolGenerationContext>;

// Named project values for internal services such as the AI service. Each is
// defined once, from the same context generation requests already use, so every
// consumer gets the same answer. Add a field here to make it available.
const PROJECT_CONTEXT_FIELDS: Record<string, (context: ProtocolContext, project: Project | any) => unknown> = {
  projectName: context => context.aiProjectData.projectName,
  sponsor: context => context.aiProjectData.sponsor ?? '',
  deviceName: context => context.aiProjectData.deviceName ?? '',
  deviceCategory: context => context.aiProjectData.deviceCategory,
  risk: context => context.aiProjectData.risk,
  targetMarkets: context => context.aiProjectData.targetMarkets,
  intendedUse: context => context.intendedUse,
  acceptedRequirements: context => context.scope.requirements.map((requirement: any) => ({
    id: requirement.id ?? null,
    title: requirement.title ?? '',
    description: requirement.description ?? '',
  })),
  synopsis: (_context, project) => sourceSynopsisText(project?.data?.synopsis),
};

export const PROJECT_CONTEXT_FIELD_NAMES = Object.keys(PROJECT_CONTEXT_FIELDS);

export function selectProjectContext(project: Project | any, fields: string[]): Record<string, unknown> {
  const context = buildProtocolGenerationContext(project);
  return Object.fromEntries(fields.map(field => [field, PROJECT_CONTEXT_FIELDS[field](context, project)]));
}
