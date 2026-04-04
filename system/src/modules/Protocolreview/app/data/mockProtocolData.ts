import type { ReportSection, RegulatoryFinding, ReviewerComment, AIFinding, AuditEntry } from '../types/review';

export const protocolSections: ReportSection[] = [
  {
    id: 'section-1',
    title: 'Protocol Overview',
    status: 'approved',
    content: `Protocol Title: A Prospective, Randomized, Multi-Center Clinical Investigation to Evaluate the Safety and Performance of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device in Patients with Chronic or Advanced Heart Failure

Protocol ID: CIP-2024-MED-0847
Version: 3.0
Date: 2024-11-15
Study Phase: Pivotal Clinical Investigation (EU MDR Class III)

Sponsor: CardiaLife Medical Technologies GmbH
Regulatory Contact: Dr. Maria Bergström, VP Regulatory Affairs
Principal Investigator: Prof. Dr. Johan Lundqvist, Karolinska University Hospital
Coordinating Investigator: Dr. Anna Svensson, Sahlgrenska University Hospital

Regulatory Framework: ISO 14155:2020, EU MDR 2017/745, MDR Article 62

Status: Fully approved and locked. Any modifications require formal protocol amendment per ISO 14155 and EU MDR requirements.`,
  },
  {
    id: 'section-2',
    title: 'Study Rationale & Objectives',
    status: 'warning',
    content: `Medical and Scientific Background:
Chronic heart failure affects approximately 64 million people worldwide, with advanced heart failure representing a severe subset with limited therapeutic options. Current medical management and cardiac resynchronization therapy provide insufficient benefit for many patients in NYHA Class III-IV.

Clinical Need and Study Justification:
The CARDIA-SUPPORT-2026 device represents a novel approach to mechanical circulatory support, designed for long-term ambulatory use. Preclinical studies and early feasibility data support safety and technical feasibility.

Primary Objectives:
• To evaluate the safety of the CARDIA-SUPPORT-2026 device at 6 months post-implantation
• To assess device performance through change in NYHA functional class and 6-minute walk distance

Secondary Objectives:
• Quality of life assessment (MLHFQ, EQ-5D-5L)
• Hospitalization rate reduction
• Device reliability and technical performance
• Long-term survival at 12 months`,
  },
  {
    id: 'section-3',
    title: 'Device Description & Intended Clinical Use',
    status: 'warning',
    content: `Technical Description:
The CARDIA-SUPPORT-2026 is a fully implantable cardiac support device consisting of:
• Miniaturized rotary blood pump (titanium housing, biocompatible polymer coating)
• Transcutaneous energy transfer system (inductive charging)
• Internal control unit with physiologic response algorithm
• External controller and battery pack

Intended Use:
The device is indicated for long-term mechanical circulatory support in adult patients with chronic or advanced heart failure (NYHA Class III-IV) who remain symptomatic despite optimal medical management.

Target Population:
• Adults aged 18-75 years
• Left ventricular ejection fraction (LVEF) ≤35%
• NYHA Class III or ambulatory Class IV
• Ineligible for or declined cardiac transplantation

Clinical Environment: Specialized cardiac centers with cardiac surgery and mechanical circulatory support expertise

MDR Classification: Class III, Rule 8 (Active implantable device)
Risk Profile: High-risk device requiring clinical investigation per MDR Article 62`,
  },
  {
    id: 'section-4',
    title: 'Study Design',
    status: 'approved',
    content: `Study Type: Prospective, randomized (2:1), open-label, multi-center pivotal clinical investigation

Control Group: Optimal medical management (OMM) per current ESC heart failure guidelines

Randomization: Computer-generated randomization schedule, stratified by:
• Study site
• NYHA functional class (III vs. IV)
• LVEF (≤25% vs. 26-35%)

Sample Size: 180 patients total
• Device arm: 120 patients
• Control arm: 60 patients
• Target enrollment across 6 European centers

Study Duration:
• Enrollment period: 24 months
• Primary endpoint assessment: 6 months post-randomization
• Extended follow-up: 12 months and annually up to 5 years

Primary Endpoint:
Composite safety endpoint: Freedom from major adverse cardiac and cerebrovascular events (MACCE) at 6 months, defined as:
• Death
• Stroke (disabling)
• Device malfunction requiring replacement
• Myocardial infarction

Primary Performance Endpoint:
Improvement in 6-minute walk distance (6MWD) of ≥50 meters from baseline to 6 months

Secondary Endpoints:
• Change in NYHA functional class
• Quality of life scores (MLHFQ, EQ-5D-5L)
• Hospitalization days
• Device reliability and technical performance
• Survival at 12 months`,
  },
  {
    id: 'section-5',
    title: 'Subject Eligibility Criteria',
    status: 'blocked',
    content: `Inclusion Criteria:
1. Age 18-75 years at time of enrollment
2. Documented diagnosis of chronic heart failure for ≥6 months
3. NYHA functional class III or ambulatory class IV despite optimal medical management for ≥3 months
4. Left ventricular ejection fraction (LVEF) ≤35% by echocardiography within 30 days of enrollment
5. [CRITICAL GAP: Specific biomarker thresholds needed - NT-proBNP/BNP ranges must be defined]
6. On stable heart failure medication regimen for ≥30 days
7. Willing and able to comply with study procedures and follow-up schedule
8. Signed informed consent

Exclusion Criteria:
1. Acute myocardial infarction within 90 days
2. Cardiac surgery or percutaneous coronary intervention within 90 days
3. Severe right ventricular dysfunction (TAPSE <14mm or RV dysfunction requiring inotropic support)
4. [CRITICAL GAP: Exact definitions for organ dysfunction criteria missing]
5. Active infection or systemic inflammatory condition
6. Irreversible pulmonary hypertension (PVR >6 Wood units)
7. Chronic kidney disease (eGFR <30 mL/min/1.73m²)
8. Hepatic dysfunction (ALT/AST >3× ULN or bilirubin >2× ULN)
9. Body surface area <1.5 m² or >2.5 m² (device size limitations)
10. Pregnancy or breastfeeding
11. Life expectancy <12 months from non-cardiac cause
12. Participation in another investigational device/drug study within 30 days

[BLOCKER: Section requires completion of biomarker criteria and organ dysfunction definitions before regulatory approval can proceed]`,
  },
  {
    id: 'section-6',
    title: 'Study Procedures & Assessments',
    status: 'blocked',
    content: `Study Flow:
1. Screening Period (Days -30 to -1)
2. Baseline Assessment (Day 0)
3. Device Implantation (Device Arm) or Randomization Visit (Control Arm)
4. Hospital Discharge
5. Follow-up Visits: Month 1, 3, 6, 9, 12, and annually

Visit Schedule:

Screening (Day -30 to -1):
• Informed consent
• Medical history and physical examination
• Echocardiography (LVEF, RV function, valve assessment)
• 6-minute walk test
• Quality of life questionnaires (MLHFQ, EQ-5D-5L)
• Laboratory tests (CBC, CMP, coagulation panel, BNP/NT-proBNP)
• Right heart catheterization
• Eligibility confirmation

Baseline (Day 0):
• Final eligibility verification
• Randomization (if control arm)
• Pre-operative assessment (if device arm)

Device Implantation Visit (Device Arm Only):
• Surgical implantation procedure per Instructions for Use
• Post-operative monitoring (ICU and step-down)
• Device parameter optimization
• Anticoagulation initiation

[CRITICAL BLOCKER: Visit windows and tolerances not defined]
Example missing specifications:
• Month 3 visit: Target Day 90, acceptable window ± ? days
• Primary endpoint (6 months): Day 180 ± ? days
• Protocol deviation criteria for missed/late visits

Follow-up Assessments (All Timepoints):
• Physical examination and vital signs
• Adverse event assessment
• Concomitant medication review
• Echocardiography (at months 1, 6, 12)
• 6-minute walk test (at all visits)
• NYHA functional class
• Quality of life questionnaires
• Laboratory tests
• [Device arm only: Device interrogation, alarm log review, technical performance]

Core Lab and Adjudication:
• Echocardiography Core Lab: Karolinska Imaging Core (blinded analysis)
• Clinical Events Committee: Independent adjudication of all endpoints and adverse events
• Data Safety Monitoring Board: Safety oversight with pre-specified stopping rules

[BLOCKER: Visit windows must be defined for regulatory compliance and to ensure statistical analysis validity. Without these, the protocol cannot be approved.]`,
  },
  {
    id: 'section-7',
    title: 'Safety Monitoring & Reporting',
    status: 'warning',
    content: `Adverse Event Definitions:

Adverse Event (AE): Any untoward medical occurrence in a study participant, regardless of causal relationship to the investigational device.

Serious Adverse Event (SAE): An adverse event that:
• Results in death
• Is life-threatening
• Requires inpatient hospitalization or prolongation of existing hospitalization
• Results in persistent or significant disability/incapacity
• Is a congenital anomaly/birth defect
• Is an event requiring medical or surgical intervention to prevent serious outcome

Adverse Device Effect (ADE): Adverse event related to the investigational device

Serious Adverse Device Effect (SADE): SAE determined to be related to the device

Unanticipated Serious Adverse Device Effect (USADE): SADE not identified in nature, severity, or frequency in the risk analysis or investigation plan

Reporting Requirements:

Immediate Reporting (within 24 hours):
• Death
• Life-threatening events
• Suspected USADE
• Device deficiency that might have led to serious event

Expedited Reporting (within 7 calendar days):
• All SAEs and SADEs
• Device malfunctions
• Protocol deviations with potential safety impact

Routine Reporting:
• All AEs documented in eCRF at each visit
• Annual safety reports to ethics committee and competent authority

Notification Pathways:
• Sponsor Medical Monitor (24/7 contact)
• Ethics Committee per local requirements
• National Competent Authority (per MDR Article 80)
• Clinical investigation participants (if applicable per assessment)

Data Safety Monitoring Board (DSMB):
• Independent board of clinical and statistical experts
• Reviews unblinded safety data at 6-month intervals
• Authority to recommend study modification or termination
• Pre-specified stopping rules for safety concerns`,
  },
  {
    id: 'section-8',
    title: 'Statistical Considerations',
    status: 'warning',
    content: `Statistical Analysis Plan:

Sample Size Calculation:
Based on primary safety endpoint (freedom from MACCE at 6 months):
• Null hypothesis: MACCE rate ≥30% (unacceptable)
• Alternative hypothesis: MACCE rate ≤15% (acceptable)
• Alpha: 0.05 (one-sided)
• Beta: 0.10 (90% power)
• Required sample size: 120 device patients
• Control arm: 60 patients (2:1 randomization for ethical considerations)
• Total enrollment: 180 patients
• Assumed dropout rate: 10%

Analysis Populations:

Intent-to-Treat (ITT): All randomized participants analyzed as randomized
Per-Protocol (PP): Participants completing protocol without major deviations
Safety Population: All participants who undergo randomization (device arm) or initiate study medication changes (control arm)

Primary Endpoint Analysis:
• Primary safety: Kaplan-Meier survival analysis for time to first MACCE
• Primary performance: ANCOVA for change in 6MWD from baseline, adjusted for baseline value, site, and stratification factors
• Success criteria: Lower bound of 95% CI for MACCE rate <20% AND mean improvement in 6MWD ≥50m with p<0.05

Secondary Endpoint Analysis:
• Continuous variables: Mixed-effects models for repeated measures
• Categorical variables: Chi-square or Fisher's exact test
• Time-to-event: Kaplan-Meier and Cox proportional hazards models

Interim Analysis:
• Single interim analysis at 50% enrollment (90 patients) for futility
• DSMB review every 6 months for safety
• Stopping boundaries per O'Brien-Fleming method

Missing Data Handling:
• Primary analysis: Complete case analysis
• Sensitivity analyses: Multiple imputation, worst-case scenario
• Participants lost to follow-up censored at last known contact for time-to-event endpoints

Subgroup Analysis (exploratory):
• Age (<65 vs ≥65 years)
• Sex
• NYHA class (III vs IV)
• LVEF (≤25% vs 26-35%)
• Ischemic vs non-ischemic etiology

Multiplicity Adjustment:
• Hierarchical testing procedure for primary and key secondary endpoints
• No adjustment for exploratory analyses`,
  },
  {
    id: 'section-9',
    title: 'Ethics & Regulatory Considerations',
    status: 'warning',
    content: `Ethical Review and Approval:
This clinical investigation must receive approval from:
• Ethics Committee at each participating site per local requirements
• National Competent Authority per MDR Article 70
• Institutional Review Board (IRB) or equivalent

Informed Consent Process:
• Written informed consent required before any study procedures
• Participant Information Sheet and Informed Consent Form (PIS/ICF) prepared per MDR Annex XV and ISO 14155
• Adequate time for participant questions and decision-making
• Voluntary participation with right to withdraw at any time
• Consent process documented in source documents and eCRF

Participant Rights and Data Protection:
• Confidentiality maintained per GDPR (EU 2016/679)
• Participant identification by unique study ID only in study documents
• Data protection impact assessment completed
• Participant access to personal data per GDPR Article 15
• Right to erasure after study completion (with limitations for regulatory retention)

Insurance and Compensation:
• Clinical investigation insurance coverage per MDR Article 69
• No-fault compensation for investigation-related injury
• Coverage details provided in PIS/ICF

Regulatory Compliance:
• EU Medical Device Regulation (MDR) 2017/745
• ISO 14155:2020 - Clinical investigation of medical devices for human subjects
• ICH-GCP E6(R2) principles applied where applicable
• Declaration of Helsinki principles
• Local regulations per participating country

Protocol Amendments:
• Substantial amendments require ethics committee and competent authority approval before implementation
• Non-substantial amendments notified to ethics committee
• All amendments documented with version control

Study Termination:
• Sponsor may terminate study for safety, futility, or regulatory reasons
• Ethics committee or competent authority may suspend or terminate study
• Participant notification and closeout procedures defined
• Final study report per MDR Annex XV within 1 year of study conclusion

Document Retention:
• Essential documents retained per MDR requirements (minimum 10 years after study completion or device market withdrawal)
• Electronic archiving in validated system per EU regulatory requirements`,
  },
];

export const protocolFindings: RegulatoryFinding[] = [
  {
    id: 'finding-1',
    sectionId: 'section-5',
    type: 'regulatory',
    severity: 'blocker',
    description: 'Missing specific biomarker inclusion criteria (NT-proBNP/BNP threshold values)',
    details: 'Section 5.1 Inclusion Criteria lacks quantitative biomarker thresholds. EU MDR and ISO 14155 require precise, measurable eligibility criteria for reproducibility and regulatory assessment.',
    regulation: 'ISO 14155:2020 Section 6.2.2 - Eligibility criteria must be objective and measurable',
    recommendation: 'Define specific NT-proBNP or BNP threshold ranges (e.g., NT-proBNP >600 pg/mL for NYHA III or >1000 pg/mL for NYHA IV)',
  },
  {
    id: 'finding-2',
    sectionId: 'section-5',
    type: 'regulatory',
    severity: 'blocker',
    description: 'Incomplete organ dysfunction exclusion criteria definitions',
    details: 'Exclusion criteria reference "severe organ dysfunction" without quantitative parameters. Specific laboratory values and clinical thresholds must be defined.',
    regulation: 'MDR Annex XV, Part A - Clinical Investigation Plan requirements',
    recommendation: 'Add specific criteria for hepatic, renal, and pulmonary dysfunction with laboratory reference ranges',
  },
  {
    id: 'finding-3',
    sectionId: 'section-6',
    type: 'regulatory',
    severity: 'blocker',
    description: 'Visit windows and protocol deviation criteria not defined',
    details: 'Section 6 lacks visit window specifications (e.g., ± days tolerance). This is critical for regulatory compliance and statistical analysis validity. Without defined windows, protocol deviations cannot be objectively determined.',
    regulation: 'ISO 14155:2020 Section 7.4.2 - Visit schedules and windows must be specified',
    recommendation: 'Define acceptable visit windows for each timepoint (e.g., Month 6: Day 180 ± 14 days) and criteria for major vs. minor protocol deviations',
  },
  {
    id: 'finding-4',
    sectionId: 'section-2',
    type: 'regulatory',
    severity: 'warning',
    description: 'Study rationale could strengthen link between preclinical data and clinical investigation design',
    details: 'Section 2.1 mentions preclinical studies but does not explicitly reference the preclinical evaluation report or summarize key safety findings that inform the clinical investigation plan.',
    regulation: 'MDR Annex XV - Rationale should reference preclinical evaluation',
    recommendation: 'Add summary of preclinical evaluation outcomes and how they support the proposed clinical investigation design and endpoints',
  },
  {
    id: 'finding-5',
    sectionId: 'section-3',
    type: 'regulatory',
    severity: 'warning',
    description: 'Device description should reference technical documentation version',
    details: 'Section 3 provides comprehensive device description but does not cite the specific version of the technical documentation or IFU being used in the investigation.',
    regulation: 'ISO 14155:2020 Section 6.2.1 - Device documentation traceability',
    recommendation: 'Add reference to technical documentation package version and IFU version used in the clinical investigation',
  },
  {
    id: 'finding-6',
    sectionId: 'section-7',
    type: 'regulatory',
    severity: 'warning',
    description: 'DSMB charter and stopping rules should be explicitly referenced',
    details: 'Section 7 mentions DSMB and stopping rules but does not reference the DSMB charter document or provide detail on pre-specified stopping criteria.',
    regulation: 'ISO 14155:2020 Section 8.3 - Safety monitoring',
    recommendation: 'Reference DSMB Charter document and summarize key stopping rules (e.g., if MACCE rate exceeds X% at interim analysis)',
  },
  {
    id: 'finding-7',
    sectionId: 'section-8',
    type: 'regulatory',
    severity: 'warning',
    description: 'Statistical Analysis Plan should be documented as separate controlled document',
    details: 'Section 8 provides statistical considerations but should explicitly state that a detailed SAP exists as a separate, version-controlled document that will be finalized before database lock.',
    regulation: 'ICH E9 - Statistical Principles for Clinical Trials',
    recommendation: 'Add statement that a detailed Statistical Analysis Plan (SAP) will be prepared as a separate document and finalized before any unblinded analysis',
  },
  {
    id: 'finding-8',
    sectionId: 'section-9',
    type: 'regulatory',
    severity: 'warning',
    description: 'Data protection impact assessment should be referenced',
    details: 'Section 9 mentions GDPR compliance and data protection but should explicitly reference the Data Protection Impact Assessment (DPIA) completed for this investigation.',
    regulation: 'GDPR Article 35 - Data Protection Impact Assessment',
    recommendation: 'Add reference to completed DPIA document and confirmation of data protection officer review',
  },
];

export const protocolComments: ReviewerComment[] = [
  {
    id: 'comment-1',
    sectionId: 'section-2',
    author: 'Dr. Emma Nilsson',
    role: 'Senior Regulatory Reviewer',
    timestamp: new Date('2024-02-20T10:30:00'),
    comment: 'The clinical rationale is strong. Consider adding a brief statement about why this specific patient population was selected over bridge-to-transplant candidates.',
    priority: 'low',
  },
  {
    id: 'comment-2',
    sectionId: 'section-5',
    author: 'Dr. Anders Bergman',
    role: 'Clinical Reviewer',
    timestamp: new Date('2024-02-21T14:15:00'),
    comment: 'Critical: NT-proBNP thresholds must be defined before protocol can be approved. Recommend using ESC heart failure guideline thresholds as reference.',
    priority: 'high',
  },
  {
    id: 'comment-3',
    sectionId: 'section-6',
    author: 'Dr. Emma Nilsson',
    role: 'Senior Regulatory Reviewer',
    timestamp: new Date('2024-02-21T16:45:00'),
    comment: 'Visit windows are essential regulatory requirement - this is blocking approval. Standard practice is ±14 days for monthly visits and ±21 days for quarterly visits, but should be justified based on endpoint stability.',
    priority: 'high',
  },
  {
    id: 'comment-4',
    sectionId: 'section-8',
    author: 'Dr. Lisa Andersson',
    role: 'Biostatistician',
    timestamp: new Date('2024-02-22T09:00:00'),
    comment: 'Sample size calculation is appropriate. Confirm that SAP will include sensitivity analyses for missing data and description of interim analysis methods.',
    priority: 'medium',
  },
];

export const protocolAIFindings: AIFinding[] = [
  {
    id: 'ai-1',
    sectionId: 'section-5',
    type: 'ai-suggestion',
    severity: 'info',
    description: 'Consider adding frailty assessment to exclusion criteria',
    details: 'Recent literature suggests frailty is a strong predictor of mechanical circulatory support outcomes. Consider adding a validated frailty scale (e.g., Fried Frailty Phenotype) as exclusion criterion.',
    source: 'AI Clinical Literature Analysis',
    confidence: 0.78,
  },
  {
    id: 'ai-2',
    sectionId: 'section-8',
    type: 'ai-suggestion',
    severity: 'info',
    description: 'Consider adding device-specific subgroup analyses',
    details: 'Protocol may benefit from pre-specified subgroup analysis based on device flow rate quartiles or patient hemodynamic response patterns.',
    source: 'AI Protocol Optimization',
    confidence: 0.72,
  },
];

export const protocolAuditTrail: AuditEntry[] = [
  {
    id: 'audit-1',
    domain: 'Review',
    timestamp: new Date('2024-02-22T14:30:00'),
    action: 'Added comment to Section 2',
    userBy: 'Dr. Emma Nilsson',
    userEmail: 'emma.nilsson@medtech.com',
    details: 'Requested clarification on study objectives alignment with endpoints',
  },
  {
    id: 'audit-2',
    domain: 'Review',
    timestamp: new Date('2024-02-22T13:15:00'),
    action: 'Replied to comment in Section 5',
    userBy: 'Dr. Anders Bergman',
    userEmail: 'anders.bergman@medtech.com',
    details: 'Confirmed biomarker criteria needs specification',
  },
  {
    id: 'audit-3',
    domain: 'Approval',
    timestamp: new Date('2024-02-21T16:45:00'),
    action: 'Accepted warning risk',
    userBy: 'Dr. Emma Nilsson',
    userEmail: 'emma.nilsson@medtech.com',
    details: 'Concurrent medication tracking details limited to cardiovascular medications',
  },
  {
    id: 'audit-4',
    domain: 'Review',
    timestamp: new Date('2024-02-21T14:20:00'),
    action: 'Added comment to Section 6',
    userBy: 'Dr. Anders Bergman',
    userEmail: 'anders.bergman@medtech.com',
    details: 'Visit windows need explicit definition for per-protocol analysis',
  },
  {
    id: 'audit-5',
    domain: 'Review',
    timestamp: new Date('2024-02-20T15:30:00'),
    action: 'Added comment to Section 3',
    userBy: 'Dr. Emma Nilsson',
    userEmail: 'emma.nilsson@medtech.com',
    details: 'Device specifications section is comprehensive and meets requirements',
  },
];