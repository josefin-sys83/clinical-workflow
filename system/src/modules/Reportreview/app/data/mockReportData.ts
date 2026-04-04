import type { ReportSection, RegulatoryFinding, ReviewerComment, AIFinding, AuditEntry } from '../types/review';

export const projectRoles = [
  { role: 'Project Manager', name: 'Dr. Sarah Chen' },
  { role: 'Medical Writer', name: 'Dr. Thomas Weber' },
  { role: 'Protocol Lead', name: 'Dr. Helena Schmit' },
  { role: 'Statistician', name: 'Marcus Rivera' },
  { role: 'Regulatory Affairs', name: 'Elena Kowalski' },
  { role: 'Quality Assurance', name: 'Helena Schmit' },
];

export const reportSections: ReportSection[] = [
  {
    id: 'section-1',
    title: 'Executive Summary',
    status: 'approved',
    content: `The clinical investigation was conducted to evaluate the safety and efficacy of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device in patients with chronic or advanced heart failure. The study enrolled 150 participants across 3 sites between January 2024 and December 2025.

Key findings demonstrate that the device met all primary endpoints with statistical significance (p<0.001). Safety profile was favorable with no serious adverse device effects (SADEs) reported. The risk-benefit analysis supports the intended use of the device.

This report provides comprehensive documentation of study design, execution, results, and conclusions in compliance with ISO 14155:2020 and applicable regulatory requirements.`,
  },
  {
    id: 'section-2',
    title: 'Study Design & Methodology',
    status: 'warning',
    content: `This was a prospective, randomized, controlled clinical investigation conducted at three investigational sites in accordance with the approved Clinical Investigation Plan (CIP) version 2.1.

Study Population: Adult patients (18-75 years) diagnosed with chronic or advanced heart failure for at least 6 months, with baseline severity score >15.

Randomization: Participants were randomized 2:1 to treatment (device) versus control (standard care) using a computer-generated randomization schedule stratified by site.

Primary Endpoint: Change in severity score from baseline to 6 months.

Secondary Endpoints: Quality of life assessment, device usability, and safety outcomes.

Sample Size: 150 participants (100 treatment, 50 control) to provide 90% power to detect a 5-point difference in severity score.`,
  },
  {
    id: 'section-3',
    title: 'Study Population & Demographics',
    status: 'approved',
    content: [
      'A total of 152 participants were screened, with 150 enrolled and randomized. Demographics were well-balanced between groups as shown in Table 1.',
      '[TABLE:table-1]',
      'No statistically significant differences were observed in baseline characteristics (p>0.05 for all comparisons). Protocol deviations were minimal (3.3%) and did not impact study integrity.',
    ],
    tables: [
      {
        id: 'table-1',
        caption: 'Baseline Demographics and Clinical Characteristics',
        reference: 'Source: Dataset ADSL v1.2, Table 14.1.1 per SAP v1.2',
        headers: ['Characteristic', 'Treatment (N=100)', 'Control (N=50)', 'P-value'],
        rows: [
          ['Age, years (mean ± SD)', '54.3 ± 12.1', '52.8 ± 11.8', '0.452'],
          ['Female, n (%)', '58 (58.0%)', '27 (54.0%)', '0.638'],
          ['Race, n (%)', '', '', '0.721'],
          ['  White', '72 (72.0%)', '37 (74.0%)', ''],
          ['  Black or African American', '18 (18.0%)', '8 (16.0%)', ''],
          ['  Asian', '7 (7.0%)', '4 (8.0%)', ''],
          ['  Other', '3 (3.0%)', '1 (2.0%)', ''],
          ['BMI, kg/m² (mean ± SD)', '28.4 ± 4.2', '27.9 ± 4.5', '0.512'],
          ['Baseline severity score (mean ± SD)', '24.5 ± 6.2', '24.1 ± 6.5', '0.701'],
          ['Disease duration, months (median [IQR])', '18 [12-36]', '20 [14-32]', '0.583'],
          ['Prior treatments, n (%)', '82 (82.0%)', '39 (78.0%)', '0.554'],
        ],
      },
    ],
  },
  {
    id: 'section-4',
    title: 'Efficacy Results',
    status: 'blocked',
    content: [
      'Primary Endpoint Analysis:',
      'The primary efficacy endpoint was the change in severity score from baseline to 6 months. Results demonstrated a statistically significant improvement in the treatment group compared to control (Table 2).',
      '[TABLE:table-2]',
      'The primary endpoint was met with high statistical significance (p<0.001). Effect size (Cohen\'s d = 2.3) indicates a large clinical effect. Figure 1 illustrates the treatment effect across key subgroups.',
      '[FIGURE:figure-1]',
      'Secondary Endpoints:',
      'Quality of life improved significantly in the treatment group (Table 3). Device usability scores averaged 8.2/10 (excellent). Sensitivity analyses confirmed robustness of findings across subgroups.',
      '[TABLE:table-3]',
    ],
    tables: [
      {
        id: 'table-2',
        caption: 'Primary Efficacy Endpoint Analysis - Change in Severity Score at 6 Months',
        reference: 'Source: Dataset ADEFF v1.1, Table 14.2.1 per SAP v1.2',
        headers: ['Analysis', 'Treatment (N=100)', 'Control (N=50)', 'Difference (95% CI)', 'P-value'],
        rows: [
          ['ITT Population', '', '', '', ''],
          ['  Baseline, mean ± SD', '24.5 ± 6.2', '24.1 ± 6.5', '—', '—'],
          ['  Month 6, mean ± SD', '12.1 ± 5.8', '21.0 ± 6.2', '—', '—'],
          ['  Change from baseline', '-12.4 ± 4.2', '-3.1 ± 3.8', '-9.3 (-10.8, -7.8)', '<0.001'],
          ['Per-Protocol Population', '', '', '', ''],
          ['  Change from baseline', '-12.8 ± 4.0', '-3.0 ± 3.9', '-9.8 (-11.2, -8.4)', '<0.001'],
          ['Responder Analysis (≥50% improvement)', '', '', '', ''],
          ['  n (%)', '76 (76.0%)', '12 (24.0%)', '—', '<0.001'],
        ],
      },
      {
        id: 'table-3',
        caption: 'Secondary Endpoint Analysis - Quality of Life Scores',
        reference: 'Source: Dataset ADQOL v1.0, Table 14.2.5 per SAP v1.2',
        headers: ['QoL Domain', 'Treatment (N=100)', 'Control (N=50)', 'P-value'],
        rows: [
          ['Physical Function (0-100)', '68.4 ± 12.3', '52.1 ± 14.2', '<0.001'],
          ['Emotional Well-being (0-100)', '72.8 ± 10.5', '58.3 ± 13.1', '<0.001'],
          ['Social Function (0-100)', '65.2 ± 15.1', '54.7 ± 12.8', '<0.001'],
          ['Overall QoL Score (0-100)', '70.1 ± 11.2', '55.8 ± 12.4', '<0.001'],
        ],
      },
    ],
    figures: [
      {
        id: 'figure-1',
        caption: 'Forest Plot: Treatment Effect on Primary Endpoint by Subgroup',
        reference: 'Source: Dataset ADEFF v1.1, Figure 14.2.2 per SAP v1.2',
        type: 'forest-plot',
        data: [
          { subgroup: 'Overall', estimate: -9.3, ci: [-10.8, -7.8] },
          { subgroup: 'Age <65 years', estimate: -9.8, ci: [-11.5, -8.1] },
          { subgroup: 'Age ≥65 years', estimate: -8.2, ci: [-11.0, -5.4] },
          { subgroup: 'Female', estimate: -9.5, ci: [-11.4, -7.6] },
          { subgroup: 'Male', estimate: -9.0, ci: [-11.2, -6.8] },
          { subgroup: 'Baseline severity <25', estimate: -7.8, ci: [-9.8, -5.8] },
          { subgroup: 'Baseline severity ≥25', estimate: -10.4, ci: [-12.3, -8.5] },
        ],
      },
    ],
  },
  {
    id: 'section-5',
    title: 'Safety Analysis',
    status: 'approved',
    content: [
      'Safety population included all 150 randomized participants. Mean follow-up was 6.2 months. The overall safety profile was favorable with no serious adverse device effects reported.',
      'Adverse Events (AEs):',
      'A summary of all adverse events is provided in Table 4. Most events were mild in severity and resolved without intervention.',
      '[TABLE:table-4]',
      'Serious Adverse Events (SAEs):',
      'Three serious adverse events were reported during the study period (Table 5). All were assessed as unrelated to the investigational device by the independent safety committee.',
      '[TABLE:table-5]',
      'Device-Related Events:',
      'Device-related adverse events were infrequent and predominantly mild in severity. No SADEs, USDEs, or device malfunctions were reported. Safety profile supports favorable risk-benefit ratio.',
    ],
    tables: [
      {
        id: 'table-4',
        caption: 'Summary of Adverse Events',
        reference: 'Source: Dataset ADAE v1.3, Table 14.3.1 per SAP v1.2',
        headers: ['Event Category', 'Treatment (N=100)', 'Control (N=50)'],
        rows: [
          ['Any AE, n (%)', '28 (28.0%)', '12 (24.0%)'],
          ['Total number of AEs', '42', '18'],
          ['Device-related AE, n (%)', '15 (15.0%)', '0 (0%)'],
          ['Serious AE, n (%)', '2 (2.0%)', '1 (2.0%)'],
          ['AE leading to discontinuation, n (%)', '1 (1.0%)', '0 (0%)'],
          ['By Maximum Severity:', '', ''],
          ['  Mild', '22 (22.0%)', '10 (20.0%)'],
          ['  Moderate', '5 (5.0%)', '2 (4.0%)'],
          ['  Severe', '1 (1.0%)', '0 (0%)'],
          ['Most Common AEs (≥5%):', '', ''],
          ['  Skin irritation', '12 (12.0%)', '2 (4.0%)'],
          ['  Transient discomfort', '8 (8.0%)', '1 (2.0%)'],
          ['  Headache', '5 (5.0%)', '4 (8.0%)'],
        ],
      },
      {
        id: 'table-5',
        caption: 'Serious Adverse Events',
        reference: 'Source: Dataset ADAE v1.3, Table 14.3.3 per SAP v1.2',
        headers: ['Subject ID', 'Event', 'Severity', 'Relationship', 'Outcome'],
        rows: [
          ['T-045', 'Pneumonia', 'Severe', 'Unrelated', 'Resolved'],
          ['T-078', 'Myocardial infarction', 'Severe', 'Unrelated', 'Resolved with sequelae'],
          ['C-023', 'Fall with fracture', 'Severe', 'Unrelated', 'Resolved'],
        ],
      },
    ],
  },
  {
    id: 'section-6',
    title: 'Risk-Benefit Assessment',
    status: 'approved',
    content: `The risk-benefit assessment integrates efficacy, safety, and usability data to support the intended use of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device.

Benefits:
- Clinically meaningful and statistically significant improvement in primary endpoint
- High effect size indicating robust treatment effect
- Improved quality of life across multiple domains
- High patient satisfaction and device usability

Risks:
- Low frequency of mild, self-limiting device-related events
- No serious device-related safety concerns identified
- Risk profile comparable to or better than existing treatment options

Conclusion: The benefit-risk profile is favorable and supports the use of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device for the intended indication in the target population.`,
  },
  {
    id: 'section-7',
    title: 'Data Quality & Monitoring',
    status: 'approved',
    content: `Data quality was maintained through rigorous monitoring and quality control procedures.

Monitoring Activities:
- Site initiation visits: 3/3 sites (100%)
- Interim monitoring visits: 12 visits across sites
- Close-out visits: 3/3 sites (100%)

Data Review:
- Source data verification: 100% of primary endpoints, 20% of secondary data
- Query resolution rate: 98.5%
- Protocol deviations: 5 total (3.3%), all minor and documented

Audit and Inspection:
- Internal audit conducted October 2025, no major findings
- All data management procedures followed 21 CFR Part 11 requirements

Database lock completed January 15, 2026 following resolution of all queries.`,
  },
  {
    id: 'section-8',
    title: 'Conclusions & Recommendations',
    status: 'warning',
    content: `The clinical investigation successfully demonstrated that the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device is safe and effective for the treatment of chronic or advanced heart failure in the intended patient population.

Key Conclusions:
1. Primary endpoint met with high statistical and clinical significance
2. Safety profile favorable with no serious device-related concerns
3. Risk-benefit assessment supports device approval for intended use
4. Study conduct was compliant with applicable regulations and standards

Recommendations:
- Proceed with regulatory submission based on positive study outcomes
- Post-market surveillance should monitor long-term safety and effectiveness
- Consider label updates to reflect study findings and appropriate use

This clinical investigation report provides substantial evidence to support the safety and performance claims of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device.`,
  },
];

export const regulatoryFindings: RegulatoryFinding[] = [
  {
    id: 'finding-1',
    sectionId: 'section-2',
    severity: 'warning',
    description: 'Statistical Analysis Plan (SAP) version not explicitly referenced',
    location: 'Study Design & Methodology, paragraph 1',
    textHighlight: 'Clinical Investigation Plan (CIP) version 2.1',
  },
  {
    id: 'finding-2',
    sectionId: 'section-4',
    severity: 'blocker',
    description: 'Missing confidence intervals for secondary endpoint analysis',
    location: 'Efficacy Results, Secondary Endpoints',
    textHighlight: 'Quality of life improved significantly',
  },
  {
    id: 'finding-3',
    sectionId: 'section-8',
    severity: 'warning',
    description: 'Post-market surveillance plan should reference specific PMCF protocol',
    location: 'Conclusions, Recommendations section',
    textHighlight: 'Post-market surveillance should monitor long-term safety',
  },
];

export const reviewerComments: ReviewerComment[] = [
  {
    id: 'comment-1',
    sectionId: 'section-2',
    author: 'Dr. Sarah Mitchell',
    role: 'Clinical Assessor',
    timestamp: new Date('2026-02-14T10:30:00'),
    content: 'Please add explicit reference to SAP version 1.2 dated March 15, 2024 to ensure traceability.',
    status: 'open',
  },
  {
    id: 'comment-2',
    sectionId: 'section-4',
    author: 'Dr. James Chen',
    role: 'Lead Reviewer',
    timestamp: new Date('2026-02-14T14:15:00'),
    content: 'CI for secondary endpoints must be provided before approval. This is a regulatory requirement per ICH E9 guidelines.',
    status: 'open',
    replies: [
      {
        id: 'comment-2-reply-1',
        sectionId: 'section-4',
        author: 'Dr. Sarah Mitchell',
        role: 'Clinical Assessor',
        timestamp: new Date('2026-02-14T15:45:00'),
        content: 'Agreed. Statistical team should provide these within 48 hours.',
        status: 'open',
      },
    ],
  },
  {
    id: 'comment-3',
    sectionId: 'section-3',
    author: 'Dr. Emily Rodriguez',
    role: 'Biostatistician',
    timestamp: new Date('2026-02-13T09:20:00'),
    content: 'Demographics table is well-balanced and appropriately presented. No concerns.',
    status: 'resolved',
  },
  {
    id: 'comment-4',
    sectionId: 'section-5',
    author: 'Dr. James Chen',
    role: 'Lead Reviewer',
    timestamp: new Date('2026-02-14T11:00:00'),
    content: 'Safety analysis is comprehensive and meets regulatory expectations. Section approved.',
    status: 'resolved',
  },
];

export const aiFindings: AIFinding[] = [
  {
    id: 'ai-1',
    sectionId: 'section-2',
    type: 'missing',
    description: 'SAP version number not found in methodology section',
    dismissed: false,
  },
  {
    id: 'ai-2',
    sectionId: 'section-4',
    type: 'inconsistency',
    description: 'Sample size reported as 150 in Section 2 but analysis includes only 147 in efficacy analysis',
    dismissed: false,
  },
  {
    id: 'ai-3',
    sectionId: 'section-4',
    type: 'missing',
    description: 'Secondary endpoint confidence intervals not provided',
    dismissed: false,
  },
  {
    id: 'ai-4',
    sectionId: 'section-8',
    type: 'conflict',
    description: 'Post-market surveillance mentioned but no protocol reference number provided',
    dismissed: false,
  },
];

export const auditTrail: AuditEntry[] = [
  {
    id: 'audit-1',
    domain: 'Review',
    timestamp: '02/22/2026 08:45',
    action: 'Risk accepted for Statistical Methodology blocker',
    userBy: 'Dr. Sarah Chen',
    userEmail: 'sarah.chen@medtech.com',
    details: 'Missing confidence intervals in Table 2 primary analysis',
  },
  {
    id: 'audit-2',
    domain: 'Review',
    timestamp: '02/21/2026 15:30',
    action: 'Comment added to Section 4: Efficacy Results',
    userBy: 'Dr. Emily Rodriguez',
    userEmail: 'emily.rodriguez@medtech.com',
    details: 'Please verify the statistical analysis methodology for subgroup analyses',
  },
  {
    id: 'audit-3',
    domain: 'Review',
    timestamp: '02/21/2026 14:15',
    action: 'Reply added to comment on Section 2',
    userBy: 'Dr. James Chen',
    userEmail: 'james.chen@medtech.com',
    details: 'Confirmed with biostatistics team - approach is appropriate per SAP v1.2',
  },
  {
    id: 'audit-4',
    domain: 'Review',
    timestamp: '02/21/2026 11:20',
    action: 'Comment added to Section 2: Study Design & Methodology',
    userBy: 'Dr. Sarah Mitchell',
    userEmail: 'sarah.mitchell@medtech.com',
    details: 'Randomization stratification needs clarification - which factors were used?',
  },
  {
    id: 'audit-5',
    domain: 'Review',
    timestamp: '02/21/2026 09:45',
    action: 'Risk accepted for Missing Data warning',
    userBy: 'Dr. James Chen',
    userEmail: 'james.chen@medtech.com',
    details: 'Incomplete adverse event documentation in Section 5',
  },
  {
    id: 'audit-6',
    domain: 'Review',
    timestamp: '02/20/2026 16:30',
    action: 'Comment added to Section 3: Study Population & Demographics',
    userBy: 'Dr. Emily Rodriguez',
    userEmail: 'emily.rodriguez@medtech.com',
    details: 'Demographics table looks good - baseline characteristics well balanced',
  },
];