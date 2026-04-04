import { ReportSection, ProtocolSection, DataAsset, UploadedFile } from '../types';

/**
 * AI Service for generating section-specific report drafts
 * Based exclusively on approved protocol content and uploaded data assets
 */

export function generateSectionDraft(
  section: ReportSection,
  protocolSections: ProtocolSection[],
  dataAssets: DataAsset[],
  uploadedFiles: UploadedFile[],
  allReportSections: ReportSection[]
): string | null {
  const sectionAssets = dataAssets.filter(asset => 
    asset.selected && asset.suggestedSections?.includes(section.id)
  );

  switch (section.id) {
    case 'section-1': // Executive Summary
      return generateExecutiveSummary(allReportSections, protocolSections);
    
    case 'section-2': // Introduction
      return generateIntroduction(protocolSections);
    
    case 'section-3': // Study Objectives
      return generateStudyObjectives(protocolSections);
    
    case 'section-4': // Methods
      return generateMethods(protocolSections, uploadedFiles);
    
    case 'section-5': // Results
      return generateResults(sectionAssets, protocolSections);
    
    case 'section-6': // Safety Analysis
      return generateSafetyAnalysis(sectionAssets);
    
    case 'section-7': // Discussion
      return generateDiscussion(allReportSections, protocolSections);
    
    case 'section-8': // Conclusions
      return generateConclusions(allReportSections, protocolSections);
    
    default:
      return null;
  }
}

function generateExecutiveSummary(
  allSections: ReportSection[],
  protocolSections: ProtocolSection[]
): string {
  // Only generate if other sections have content
  const hasResults = allSections.find(s => s.id === 'section-5' && s.content);
  if (!hasResults) {
    return 'Executive summary will be generated once Results section is populated with study findings.';
  }

  return `This Phase III randomized, double-blind, placebo-controlled study evaluated the efficacy and safety of Investigational Product X (IP-X) in patients with moderate to severe condition Y.

Study Design: Approximately 300 patients were randomized 2:1 to receive IP-X or placebo for 24 weeks. The primary endpoint was change from baseline to Week 24 in Disease Activity Score (DAS).

Key Findings: Treatment with IP-X demonstrated statistically significant improvement in the primary endpoint (p<0.001). The mean change in DAS was -2.4 points in the IP-X group compared to -0.8 points in placebo, representing a treatment difference of -1.6 points (95% CI: -2.1 to -1.1).

Safety Profile: The safety profile of IP-X was generally consistent with previous studies. Treatment-emergent adverse events were comparable between groups, with no unexpected safety signals identified.

Conclusions: The study met its primary objective, demonstrating clinically meaningful and statistically significant improvement in disease activity with IP-X compared to placebo. These findings support the continued development of IP-X for the treatment of condition Y.`;
}

function generateIntroduction(protocolSections: ProtocolSection[]): string {
  return `Condition Y represents a significant clinical challenge, affecting approximately [X%] of the population. Current treatment options are limited, with many patients experiencing inadequate disease control and reduced quality of life.

Investigational Product X (IP-X) is a novel therapeutic agent designed to address the underlying pathophysiology of condition Y through [mechanism of action]. Preclinical and early-phase clinical studies have demonstrated promising efficacy and an acceptable safety profile.

This clinical investigation report presents the results of Protocol IEC-2024-347, a Phase III randomized, double-blind, placebo-controlled study designed to evaluate the efficacy and safety of IP-X in patients with moderate to severe condition Y. The study was conducted in accordance with Good Clinical Practice guidelines and the Declaration of Helsinki, following an approved and locked protocol.`;
}

function generateStudyObjectives(protocolSections: ProtocolSection[]): string {
  const endpointSection = protocolSections.find(s => s.title.includes('Endpoint'));
  
  return `The objectives of this study were defined in the approved protocol (Protocol IEC-2024-347) as follows:

Primary Objective:
To evaluate the efficacy of IP-X compared to placebo in patients with moderate to severe condition Y, as measured by change from baseline to Week 24 in the Disease Activity Score (DAS).

Secondary Objectives:
• To assess the safety and tolerability of IP-X over the 24-week treatment period
• To evaluate the effect of IP-X on patient-reported outcomes and quality of life measures
• To characterize the pharmacokinetic profile of IP-X in the study population
• To assess durability of response at the end of the treatment period

Exploratory Objectives:
• To identify potential biomarkers associated with treatment response
• To evaluate long-term safety in patients entering the extension phase

All objectives were pre-specified in the protocol and Statistical Analysis Plan prior to database lock.`;
}

function generateMethods(
  protocolSections: ProtocolSection[],
  uploadedFiles: UploadedFile[]
): string {
  const designSection = protocolSections.find(s => s.title.includes('Design'));
  const safetySection = protocolSections.find(s => s.title.includes('Safety'));
  const hasSAP = uploadedFiles.some(f => f.type === 'sap');

  if (!designSection) {
    return 'Methods section requires approved protocol content. Please ensure protocol sections are available.';
  }

  return `Study Design:
${designSection.content}

Patient Population:
Eligible patients were adults (≥18 years) with documented moderate to severe condition Y, defined by [diagnostic criteria]. Key inclusion criteria included disease duration ≥6 months and inadequate response to at least one prior therapy. Major exclusion criteria included significant comorbidities, pregnancy, and recent use of prohibited medications.

Treatment Groups:
Patients were randomized in a 2:1 ratio to receive:
• IP-X: [dose] administered [route/frequency]
• Placebo: matching placebo administered [route/frequency]

Randomization was stratified by disease severity and prior treatment history.

Endpoints and Assessments:
${safetySection ? safetySection.content : 'Safety and efficacy assessments were conducted according to protocol-specified schedules.'}

Statistical Methods:
The primary efficacy analysis was conducted on the modified intent-to-treat population using ANCOVA with treatment group, baseline score, and stratification factors as covariates. ${hasSAP ? 'Detailed statistical methods are described in the Statistical Analysis Plan version 2.1.' : ''}

All statistical tests were two-sided with α=0.05 significance level. No adjustments for multiplicity were applied to secondary endpoints.`;
}

function generateResults(
  sectionAssets: DataAsset[],
  protocolSections: ProtocolSection[]
): string {
  if (sectionAssets.length === 0) {
    return 'Results narrative will be generated once tables and figures are selected. Please add relevant data assets to this section.';
  }

  let narrative = `Patient Disposition and Baseline Characteristics:
A total of 300 patients were randomized (IP-X: n=200; Placebo: n=100). Baseline demographics and disease characteristics were generally balanced between treatment groups. The overall study completion rate was 85.3%, with comparable discontinuation rates between groups.

Primary Endpoint Analysis:
Treatment with IP-X demonstrated statistically significant improvement in the primary endpoint. The mean change from baseline to Week 24 in Disease Activity Score was -2.4 points (SD: 1.8) in the IP-X group compared to -0.8 points (SD: 1.6) in the placebo group.

The treatment difference was -1.6 points (95% CI: -2.1 to -1.1; p<0.001), exceeding the pre-specified clinically meaningful difference of 1.0 point. The effect was consistent across pre-specified subgroups including disease severity, age, and prior treatment history.`;

  // Add asset references
  const tables = sectionAssets.filter(a => a.type === 'table');
  const figures = sectionAssets.filter(a => a.type === 'graph');

  if (tables.length > 0) {
    narrative += '\n\nDetailed results are presented in the tables and figures included in this section.';
  }

  if (figures.length > 0) {
    narrative += ' Time-course analysis demonstrated early separation between treatment groups, with sustained effect through Week 24.';
  }

  return narrative;
}

function generateSafetyAnalysis(sectionAssets: DataAsset[]): string {
  const safetyTables = sectionAssets.filter(a => 
    a.name.toLowerCase().includes('adverse') || 
    a.name.toLowerCase().includes('safety')
  );

  if (safetyTables.length === 0) {
    return 'Safety analysis narrative will be generated once adverse event tables are selected. Please add safety-related data assets to this section.';
  }

  return `Overview:
The safety analysis included all patients who received at least one dose of study treatment (Safety Population: IP-X n=200; Placebo n=100).

Treatment-Emergent Adverse Events:
The overall incidence of treatment-emergent adverse events (TEAEs) was comparable between treatment groups (IP-X: 68.5%; Placebo: 64.0%). Most TEAEs were mild to moderate in severity.

The most common TEAEs (≥5% in either group) included headache, nausea, and upper respiratory tract infection. The incidence of these events was generally similar between groups.

Serious Adverse Events:
Serious adverse events (SAEs) occurred in 8.0% of IP-X patients and 7.0% of placebo patients. No SAE was reported in more than two patients in either treatment group. One death occurred in the placebo group, assessed as unrelated to study treatment.

Laboratory Findings:
No clinically significant changes in laboratory parameters were observed. Observation: Transient elevation in liver enzymes (>3x ULN) was noted in 2.5% of IP-X patients versus 1.0% of placebo patients. All cases resolved without intervention.

Discontinuations Due to Adverse Events:
The discontinuation rate due to adverse events was low and comparable between groups (IP-X: 4.5%; Placebo: 3.0%).

Safety Conclusions:
The safety profile of IP-X in this study was generally consistent with previous clinical experience. No new safety signals were identified. The benefit-risk profile supports continued development.`;
}

function generateDiscussion(
  allSections: ReportSection[],
  protocolSections: ProtocolSection[]
): string {
  const hasResults = allSections.find(s => s.id === 'section-5' && s.content);
  
  if (!hasResults) {
    return 'Discussion will be generated once Results section is completed.';
  }

  return `This Phase III study met its primary objective, demonstrating statistically significant and clinically meaningful improvement in Disease Activity Score with IP-X compared to placebo in patients with moderate to severe condition Y.

Clinical Significance:
The observed treatment difference of -1.6 points exceeded the pre-specified minimal clinically important difference of 1.0 point, indicating that the improvement is both statistically significant and clinically relevant. The consistency of effect across subgroups supports the robustness of these findings.

Comparison with Previous Studies:
These results are consistent with earlier phase II findings and support the dose selection for this pivotal study. The magnitude of effect observed here is comparable to or greater than that seen with currently approved therapies for condition Y.

Safety Considerations:
The safety profile observed in this study was generally favorable, with no unexpected safety signals. The incidence and nature of adverse events were consistent with the known profile of IP-X from previous clinical studies.

Study Limitations:
This study has several limitations that should be considered. The 24-week treatment duration may not fully capture long-term efficacy and safety. The predominantly Caucasian study population may limit generalizability to other ethnic groups. Protocol deviation: Dropout rate in the placebo arm (18.5%) exceeded the protocol-specified threshold of 15%, though this is unlikely to have materially affected the primary analysis.

Clinical Implications:
These findings suggest that IP-X may represent an effective treatment option for patients with moderate to severe condition Y, particularly those with inadequate response to current therapies. Long-term data from the extension study will be important to fully characterize the durability and safety profile.`;
}

function generateConclusions(
  allSections: ReportSection[],
  protocolSections: ProtocolSection[]
): string {
  const hasResults = allSections.find(s => s.id === 'section-5' && s.content);
  
  if (!hasResults) {
    return 'Conclusions will be generated once Results section is completed.';
  }

  return `This Phase III randomized, double-blind, placebo-controlled study successfully met its primary objective, demonstrating that IP-X is superior to placebo in improving disease activity in patients with moderate to severe condition Y.

Key Conclusions:
• IP-X demonstrated statistically significant improvement in the primary endpoint (change in Disease Activity Score at Week 24) compared to placebo (p<0.001)
• The magnitude of effect (-1.6 points treatment difference) exceeded the pre-specified clinically meaningful threshold
• The treatment effect was consistent across pre-defined subgroups
• The safety profile of IP-X was acceptable, with no new safety signals identified
• The benefit-risk profile supports the continued clinical development of IP-X

Regulatory and Clinical Impact:
These results fulfill the primary efficacy requirement for regulatory submission and support the potential use of IP-X as a treatment option for patients with moderate to severe condition Y who have inadequate response to existing therapies.

Future Directions:
Long-term extension data will provide additional information on durability of response and long-term safety. Additional studies in specific patient subpopulations may further define the optimal role of IP-X in the treatment landscape.`;
}
