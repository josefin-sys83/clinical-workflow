import type { Project } from './projects.service';

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
