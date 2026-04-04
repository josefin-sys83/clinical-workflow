import { ReportSection, ProtocolSection, DataAsset, UploadedFile, ValidationFinding } from '../types';

/**
 * AI Validation Service
 * Continuously validates report content against protocol, SAP, and data consistency
 */

export function validateReportContent(
  section: ReportSection,
  protocolSections: ProtocolSection[],
  dataAssets: DataAsset[],
  uploadedFiles: UploadedFile[],
  allReportSections: ReportSection[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Only validate if section has content
  if (!section.content || section.content.trim().length === 0) {
    return findings;
  }

  switch (section.id) {
    case 'section-3': // Study Objectives
      findings.push(...validateObjectives(section, protocolSections));
      break;
    
    case 'section-4': // Methods
      findings.push(...validateMethods(section, protocolSections, uploadedFiles));
      break;
    
    case 'section-5': // Results
      findings.push(...validateResults(section, protocolSections, dataAssets));
      break;
    
    case 'section-6': // Safety Analysis
      findings.push(...validateSafety(section, dataAssets));
      break;
    
    case 'section-7': // Discussion
      findings.push(...validateDiscussion(section, allReportSections));
      break;
    
    case 'section-8': // Conclusions
      findings.push(...validateConclusions(section, allReportSections, protocolSections));
      break;
  }

  return findings;
}

function validateObjectives(
  section: ReportSection,
  protocolSections: ProtocolSection[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const protocolEndpoint = protocolSections.find(p => p.title.includes('Primary Endpoint'));

  // Check if content mentions "Disease Activity Score" (from protocol)
  if (protocolEndpoint && protocolEndpoint.content.includes('Disease Activity Score')) {
    if (!section.content.includes('Disease Activity Score') && !section.content.includes('DAS')) {
      findings.push({
        id: `finding-${Date.now()}-1`,
        type: 'blocker',
        category: 'protocol-consistency',
        title: 'Primary endpoint missing from objectives',
        description: 'The primary endpoint "Disease Activity Score (DAS)" defined in the approved protocol must be explicitly stated in the Study Objectives section.',
        sectionId: section.id,
        protocolReference: 'Protocol Section 5.1: Primary Endpoint',
        resolved: false,
      });
    }
  }

  // Check for Week 24 timepoint
  if (protocolEndpoint && protocolEndpoint.content.includes('Week 24')) {
    if (!section.content.includes('Week 24') && !section.content.includes('24 week')) {
      findings.push({
        id: `finding-${Date.now()}-2`,
        type: 'warning',
        category: 'protocol-consistency',
        title: 'Primary endpoint timepoint not specified',
        description: 'The protocol specifies "Week 24" as the primary endpoint assessment timepoint. Consider including this in the objectives.',
        sectionId: section.id,
        protocolReference: 'Protocol Section 5.1: Primary Endpoint',
        resolved: false,
      });
    }
  }

  return findings;
}

function validateMethods(
  section: ReportSection,
  protocolSections: ProtocolSection[],
  uploadedFiles: UploadedFile[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const protocolDesign = protocolSections.find(p => p.title.includes('Study Design'));
  const hasSAP = uploadedFiles.some(f => f.type === 'sap');

  // Check randomization ratio
  if (protocolDesign && protocolDesign.content.includes('2:1')) {
    if (!section.content.includes('2:1')) {
      findings.push({
        id: `finding-${Date.now()}-3`,
        type: 'blocker',
        category: 'protocol-consistency',
        title: 'Randomization ratio mismatch',
        description: 'The protocol specifies a 2:1 randomization ratio. The Methods section must reflect this exactly.',
        sectionId: section.id,
        protocolReference: 'Protocol Section 3.1: Study Design',
        resolved: false,
      });
    }
  }

  // Check SAP reference
  if (hasSAP && !section.content.includes('Statistical Analysis Plan') && !section.content.includes('SAP')) {
    findings.push({
      id: `finding-${Date.now()}-4`,
      type: 'warning',
      category: 'sap-alignment',
      title: 'SAP reference missing',
      description: 'Consider explicitly referencing the Statistical Analysis Plan in the Methods section to ensure transparency of statistical methodology.',
        sectionId: section.id,
      resolved: false,
    });
  }

  // Check ANCOVA method
  if (protocolDesign && protocolDesign.content.includes('ANCOVA')) {
    if (!section.content.includes('ANCOVA')) {
      findings.push({
        id: `finding-${Date.now()}-5`,
        type: 'warning',
        category: 'sap-alignment',
        title: 'Statistical method not specified',
        description: 'The protocol specifies ANCOVA as the primary analysis method. This should be stated in the Methods section.',
        sectionId: section.id,
        protocolReference: 'Protocol Section 5.1: Primary Endpoint',
        resolved: false,
      });
    }
  }

  return findings;
}

function validateResults(
  section: ReportSection,
  protocolSections: ProtocolSection[],
  dataAssets: DataAsset[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Check if primary endpoint results are included
  if (!section.content.includes('primary endpoint') && !section.content.includes('Primary Endpoint')) {
    findings.push({
      id: `finding-${Date.now()}-6`,
      type: 'blocker',
      category: 'regulatory-requirement',
      title: 'Primary endpoint results not presented',
      description: 'Regulatory requirements mandate clear presentation of primary endpoint results. The Results section must explicitly present primary endpoint findings.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check for p-value reporting
  if (section.content.includes('significant') && !section.content.includes('p<') && !section.content.includes('p =') && !section.content.includes('p-value')) {
    findings.push({
      id: `finding-${Date.now()}-7`,
      type: 'warning',
      category: 'regulatory-requirement',
      title: 'Statistical significance not quantified',
      description: 'When reporting statistical significance, include the actual p-value for transparency and regulatory compliance.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check if confidence intervals are reported
  if (section.content.includes('treatment difference') && !section.content.includes('95% CI') && !section.content.includes('confidence interval')) {
    findings.push({
      id: `finding-${Date.now()}-8`,
      type: 'warning',
      category: 'regulatory-requirement',
      title: 'Confidence interval not reported',
      description: 'Regulatory guidelines recommend reporting 95% confidence intervals for treatment differences.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check for selected tables/figures
  const selectedAssets = dataAssets.filter(a => a.selected && a.suggestedSections?.includes(section.id));
  if (selectedAssets.length === 0 && section.content.length > 100) {
    findings.push({
      id: `finding-${Date.now()}-9`,
      type: 'warning',
      category: 'data-consistency',
      title: 'No supporting tables or figures',
      description: 'The Results section contains narrative text but no supporting tables or figures have been selected. Consider adding visual data representations.',
      sectionId: section.id,
      resolved: false,
    });
  }

  return findings;
}

function validateSafety(
  section: ReportSection,
  dataAssets: DataAsset[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Check for safety tables
  const safetyTables = dataAssets.filter(a => 
    a.selected && 
    a.suggestedSections?.includes(section.id) && 
    (a.name.toLowerCase().includes('adverse') || a.name.toLowerCase().includes('safety'))
  );

  if (safetyTables.length === 0 && section.content.length > 100) {
    findings.push({
      id: `finding-${Date.now()}-10`,
      type: 'warning',
      category: 'regulatory-requirement',
      title: 'Safety tables not included',
      description: 'Regulatory guidance requires tabular presentation of safety data. Consider adding adverse event summary tables.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check for SAE mention
  if (!section.content.includes('serious adverse') && !section.content.includes('SAE')) {
    findings.push({
      id: `finding-${Date.now()}-11`,
      type: 'blocker',
      category: 'regulatory-requirement',
      title: 'Serious adverse events not addressed',
      description: 'Regulatory requirements mandate reporting of serious adverse events (SAEs) in all clinical investigation reports.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check for death reporting
  if (!section.content.includes('death') && !section.content.includes('fatal') && !section.content.includes('mortality')) {
    findings.push({
      id: `finding-${Date.now()}-12`,
      type: 'warning',
      category: 'regulatory-requirement',
      title: 'Mortality data not explicitly reported',
      description: 'Best practice is to explicitly state mortality outcomes, even if no deaths occurred.',
      sectionId: section.id,
      resolved: false,
    });
  }

  return findings;
}

function validateDiscussion(
  section: ReportSection,
  allReportSections: ReportSection[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const resultsSection = allReportSections.find(s => s.id === 'section-5');

  // Check if Discussion references Results
  if (resultsSection && resultsSection.content && !section.content.toLowerCase().includes('result')) {
    findings.push({
      id: `finding-${Date.now()}-13`,
      type: 'warning',
      category: 'data-consistency',
      title: 'Results not referenced in Discussion',
      description: 'The Discussion section should interpret and contextualize the findings presented in the Results section.',
      sectionId: section.id,
      resolved: false,
    });
  }

  // Check for limitation mention
  if (!section.content.toLowerCase().includes('limitation')) {
    findings.push({
      id: `finding-${Date.now()}-14`,
      type: 'warning',
      category: 'regulatory-requirement',
      title: 'Study limitations not discussed',
      description: 'Regulatory guidelines recommend acknowledging study limitations for balanced reporting.',
      sectionId: section.id,
      resolved: false,
    });
  }

  return findings;
}

function validateConclusions(
  section: ReportSection,
  allReportSections: ReportSection[],
  protocolSections: ProtocolSection[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const objectivesSection = allReportSections.find(s => s.id === 'section-3');

  // Check if objectives were addressed
  if (objectivesSection && objectivesSection.content && !section.content.toLowerCase().includes('objective')) {
    findings.push({
      id: `finding-${Date.now()}-15`,
      type: 'blocker',
      category: 'protocol-consistency',
      title: 'Study objectives not addressed in conclusions',
      description: 'The Conclusions section must explicitly state whether the study objectives were met.',
      sectionId: section.id,
      protocolReference: 'Protocol Section 3: Study Objectives',
      resolved: false,
    });
  }

  // Check for primary endpoint conclusion
  if (!section.content.toLowerCase().includes('primary endpoint') && !section.content.toLowerCase().includes('primary objective')) {
    findings.push({
      id: `finding-${Date.now()}-16`,
      type: 'blocker',
      category: 'regulatory-requirement',
      title: 'Primary endpoint not addressed in conclusions',
      description: 'Regulatory requirements mandate clear conclusions regarding the primary endpoint. This must be explicitly stated.',
      sectionId: section.id,
      resolved: false,
    });
  }

  return findings;
}
