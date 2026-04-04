import { ReportSection, DataAsset, ProtocolSection, UploadedFile, User, AuditLogEntry, CompletenessElement, ReportCompletenessStatus } from '../types';

// Mock users
export const mockUsers: User[] = [
  { id: 'user-1', name: 'Dr. Sarah Chen', email: 's.chen@clinicalsite.com', role: 'Project Manager' },
  { id: 'user-2', name: 'Dr. Thomas Weber', email: 't.weber@clinicalsite.com', role: 'Medical Writer' },
  { id: 'user-3', name: 'Dr. Helena Schmit', email: 'h.schmit@clinicalsite.com', role: 'Protocol Lead' },
  { id: 'user-4', name: 'Marcus Rivera', email: 'm.rivera@clinicalsite.com', role: 'Statistician' },
  { id: 'user-5', name: 'Elena Kowalski', email: 'e.kowalski@clinicalsite.com', role: 'Regulatory Affairs' },
];

export const initialReportSections: ReportSection[] = [
  {
    id: 'section-1',
    title: 'Executive Summary',
    helperText: 'Provide a concise overview of the clinical investigation, key findings, and conclusions.',
    content: `This Clinical Investigation Report presents the clinical data generated from the clinical investigation conducted to evaluate the safety and performance of the investigational medical device in its intended clinical use.

The investigation was conducted in accordance with the approved Clinical Investigation Plan, ISO 14155, applicable regulatory requirements, and Good Clinical Practice. The primary objective of the investigation was to confirm that the device meets the applicable safety and performance requirements and achieves its intended purpose.

The investigation was completed as planned. The clinical data generated demonstrate that the device performs as intended. No new or unexpected safety concerns were identified. The results support the overall benefit–risk profile of the device.`,
    order: 1,
    state: 'approved',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [],
    aiDraftGenerated: true,
    userEdited: true,
    insertedAssets: [],
    approvals: [
      {
        id: 'approval-1-1',
        sectionId: 'section-1',
        approver: mockUsers[3],
        status: 'approved',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        comment: 'Executive summary is comprehensive and accurately reflects the investigation outcomes.',
      },
    ],
    linkedSAPSections: ['SAP Section 1.1', 'SAP Section 8.0'],
    linkedProtocolSections: ['Protocol Section 1.0', 'Protocol Section 3.1'],
    completenessElements: [
      {
        id: 'comp-1-1',
        title: 'Title page and document identifiers',
        isoReference: 'ISO 14155:2020 Section 7.3.1',
        status: 'verified',
        verifiedBy: mockUsers[0],
        verificationDate: '2026-02-18T14:30:00Z',
        aiSuggestion: 'covered',
      },
      {
        id: 'comp-1-2',
        title: 'Executive summary or abstract',
        isoReference: 'ISO 14155:2020 Section 7.3.2',
        status: 'verified',
        verifiedBy: mockUsers[0],
        verificationDate: '2026-02-18T14:35:00Z',
        aiSuggestion: 'covered',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 6.6 · MDR Article 62(4)',
        items: [
          'Concise summary of clinical investigation objectives and design',
          'Primary and secondary endpoints with acceptance criteria',
          'Key findings from efficacy and safety analyses',
          'Benefit–risk assessment and conclusion',
          'Statement of compliance with approved protocol and regulatory requirements',
          'Clear conclusion on whether the device meets applicable safety and performance requirements',
        ],
        mustAlignWith: 'Must align with: Device intended use, sample size target (Section 4.8), enrollment feasibility',
      },
      commonPitfalls: [
        'Summary omits statement of regulatory compliance (ISO 14155, GCP, applicable regulations)',
        'Conclusions are not clearly stated or do not address all primary objectives',
        'Benefit–risk conclusion is ambiguous or lacks supporting data reference',
        'Executive summary contains new information not covered in main report sections',
        'Inconsistency between summary conclusions and detailed analysis results',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
        {
          name: 'Clinical Evaluation Report',
          version: 'Version 1.5',
          date: '2025-01-10',
          approvalStatus: 'Under Review',
        },
      ],
    },
  },
  {
    id: 'section-2',
    title: 'Introduction and Background',
    helperText: 'Describe the regulatory and clinical context, and provide device description.',
    content: `**2.1 Regulatory and Clinical Context**

This clinical investigation was conducted to generate clinical evidence required to support conformity assessment of the medical device in accordance with the applicable regulatory framework.

Clinical data were generated to address identified clinical risks, performance claims, and to support the overall clinical evaluation of the device.

**2.2 Device Description**

The investigational device is a medical device designed for use in the specified clinical indication as defined in the Clinical Investigation Plan. The device incorporates design features intended to achieve its intended medical purpose while minimizing associated clinical risks.

A detailed technical description of the device, its components, materials, and operating principles is provided in the approved protocol and technical documentation.`,
    order: 2,
    state: 'under-review',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [
      {
        id: 'comment-intro-1',
        sectionId: 'section-2',
        author: mockUsers[1],
        text: 'Please ensure all background information aligns with the protocol rationale section.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        resolved: false,
        commentType: 'general',
        regarding: 'Protocol Title',
      }
    ],
    validationFindings: [],
    aiDraftGenerated: true,
    userEdited: true,
    insertedAssets: [],
    approvals: [
      {
        id: 'approval-2-1',
        sectionId: 'section-2',
        approver: mockUsers[3],
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    ],
    linkedSAPSections: ['SAP Section 2.0'],
    linkedProtocolSections: ['Protocol Section 2.1', 'Protocol Section 2.3'],
    completenessElements: [
      {
        id: 'comp-2-1',
        title: 'Introduction and background',
        isoReference: 'ISO 14155:2020 Section 7.3.3',
        status: 'partially-covered',
        aiSuggestion: 'partial',
      },
      {
        id: 'comp-2-2',
        title: 'Device description and specifications',
        isoReference: 'ISO 14155:2020 Section 7.3.3.2',
        status: 'not-yet-verified',
        aiSuggestion: 'covered',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.3',
        items: [
          'Clinical context and rationale for clinical investigation',
          'Description of investigational device including version, model, and key technical specifications',
          'Intended purpose and indications for use',
          'Known or foreseeable risks associated with device use',
          'Summary of preclinical evaluation and bench testing results',
          'Reference to clinical evaluation plan and risk management documentation',
        ],
        mustAlignWith: 'Must align with: Device intended use, clinical evaluation plan, risk management file',
      },
      commonPitfalls: [
        'Device description omits essential technical specifications or version control',
        'Rationale does not adequately justify the need for clinical data generation',
        'Background section contains clinical claims not yet substantiated by evidence',
        'Insufficient linkage to risk management file or clinical evaluation report',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Evaluation Plan',
          version: 'Version 2.0',
          date: '2024-10-05',
          approvalStatus: 'Approved',
        },
        {
          name: 'Risk Management File',
          version: 'Version 4.2',
          date: '2025-01-22',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-3',
    title: 'Objectives and Endpoints',
    helperText: 'State the primary and secondary objectives and endpoints as defined in the approved protocol.',
    content: `**3.1 Primary Objective**

The primary objective of this clinical investigation was to evaluate the safety and performance of the investigational device when used according to its intended purpose.

**3.2 Secondary Objectives**

Secondary objectives included assessment of additional performance parameters, usability aspects, and clinical outcomes as specified in the protocol.

**3.3 Endpoints**

Primary and secondary endpoints were predefined in the Clinical Investigation Plan and Statistical Analysis Plan. No changes to the defined endpoints were made during the investigation.`,
    order: 3,
    state: 'approved',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[2]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 3.1', 'SAP Section 3.2'],
    linkedProtocolSections: ['Protocol Section 3.0'],
    completenessElements: [
      {
        id: 'comp-3-1',
        title: 'Primary objective statement',
        isoReference: 'ISO 14155:2020 § 6.2.2',
        status: 'verified',
        verifiedBy: mockUsers[0],
        verificationDate: '2026-02-19',
        aiSuggestion: 'covered',
      },
      {
        id: 'comp-3-2',
        title: 'Secondary objectives definition',
        isoReference: 'ISO 14155:2020 § 6.2.2',
        status: 'verified',
        verifiedBy: mockUsers[0],
        verificationDate: '2026-02-19',
        aiSuggestion: 'covered',
      },
      {
        id: 'comp-3-3',
        title: 'Primary and secondary endpoints',
        isoReference: 'ISO 14155:2020 § 6.2.3',
        status: 'verified',
        verifiedBy: mockUsers[0],
        verificationDate: '2026-02-19',
        aiSuggestion: 'covered',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 6.2',
        items: [
          'Clear statement of primary objective',
          'Description of all secondary and exploratory objectives',
          'Definition of primary endpoint with measurement method',
          'Definition of all secondary endpoints',
          'Pre-specification of endpoint acceptance criteria',
          'Alignment with device intended use and clinical evaluation plan',
        ],
        mustAlignWith: 'Must align with: Protocol objectives, SAP endpoints, device intended purpose',
      },
      commonPitfalls: [
        'Objectives are vague or not clearly measurable',
        'Endpoints do not directly address the stated objectives',
        'Acceptance criteria not defined or ambiguous',
        'Inconsistency between primary endpoint in CIP and SAP',
        'Endpoint definitions differ from those in approved protocol',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-4',
    title: 'Clinical Investigation Design',
    helperText: 'Describe study design, study population, and study procedures.',
    content: `**4.1 Study Design Overview**

The clinical investigation was designed as described in the approved Clinical Investigation Plan. The study design, including study type, duration, and number of subjects, was selected to adequately address the study objectives.

**4.2 Study Population**

The target study population consisted of subjects meeting the inclusion and exclusion criteria defined in the protocol. Eligibility criteria were applied consistently across all investigational sites.

**4.3 Study Procedures**

All study procedures, assessments, and follow-up activities were conducted according to the protocol. Investigators were trained on the protocol requirements prior to study initiation.`,
    order: 4,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1], mockUsers[2]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 4.0'],
    linkedProtocolSections: ['Protocol Section 4.0', 'Protocol Section 5.0'],
    completenessElements: [
      {
        id: 'comp-4-1',
        title: 'Study design overview',
        isoReference: 'ISO 14155:2020 Section 7.3.4',
        status: 'not-yet-verified',
        aiSuggestion: 'covered',
      },
      {
        id: 'comp-4-2',
        title: 'Study population definition',
        isoReference: 'ISO 14155:2020 Section 7.3.5',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
      {
        id: 'comp-4-3',
        title: 'Study procedures and assessments',
        isoReference: 'ISO 14155:2020 Section 7.3.6',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.4-7.3.6',
        items: [
          'Study type (e.g., randomized, single-arm, feasibility)',
          'Study duration and follow-up periods',
          'Number of investigational sites and geographical distribution',
          'Inclusion and exclusion criteria for subject eligibility',
          'Planned sample size and enrollment target',
          'Study procedures, assessments, and visit schedule',
          'Device specifications and comparator details (if applicable)',
        ],
        mustAlignWith: 'Must align with: Protocol design, SAP analysis populations, enrolled subjects',
      },
      commonPitfalls: [
        'Study design description does not match approved protocol',
        'Inclusion/exclusion criteria omitted or inconsistently stated',
        'Actual enrollment differs from protocol target without explanation',
        'Study procedures not adequately described for reproducibility',
        'Missing description of blinding or randomization methods (if applicable)',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-5',
    title: 'Statistical Methods',
    helperText: 'Describe statistical analyses conducted in accordance with the Statistical Analysis Plan.',
    content: `Statistical analyses were conducted in accordance with the Statistical Analysis Plan. The predefined analysis populations, statistical methods, and handling of missing data were applied as planned.

No post-hoc analyses outside the SAP were performed unless explicitly stated.`,
    order: 5,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1], mockUsers[2]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [
      {
        id: 'finding-1',
        sectionId: 'section-5',
        type: 'blocker',
        category: 'sap-alignment',
        title: 'Missing Statistical Methods Detail',
        description: 'Section must include complete description of analysis populations and statistical methods as defined in SAP Section 5.2.',
        protocolReference: 'SAP v2.1 Section 5.2',
        resolved: false,
        textPosition: {
          start: 0,
          end: 50,
          markedText: 'Statistical analyses were conducted in accordance'
        }
      },
      {
        id: 'finding-2',
        sectionId: 'section-5',
        type: 'warning',
        category: 'protocol-consistency',
        title: 'Analysis populations not defined',
        description: 'The text mentions "predefined analysis populations" but does not specify which populations (ITT, PP, Safety) were used.',
        resolved: false,
        textPosition: {
          start: 87,
          end: 114,
          markedText: 'predefined analysis populations'
        },
        relatedSectionId: 'section-4',
        relatedSectionTitle: 'Clinical Investigation Design'
      },
    ],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 5.0'],
    linkedProtocolSections: ['Protocol Section 5.0'],
    completenessElements: [
      {
        id: 'comp-5-1',
        title: 'Statistical methods description',
        isoReference: 'ISO 14155:2020 Section 7.3.8',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
      {
        id: 'comp-5-2',
        title: 'Analysis populations definition',
        isoReference: 'ISO 14155:2020 Section 7.3.8.1',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
      {
        id: 'comp-5-3',
        title: 'Sample size justification',
        isoReference: 'ISO 14155:2020 Section 7.3.8.2',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.8',
        items: [
          'Definition of analysis populations (ITT, Per Protocol, Safety Set)',
          'Description of statistical methods for primary and secondary endpoints',
          'Sample size calculation and justification',
          'Significance levels and handling of multiplicity',
          'Methods for handling missing data and protocol deviations',
          'Description of interim analyses (if applicable)',
        ],
        mustAlignWith: 'Must align with: SAP methodology, protocol-defined endpoints, actual data completeness',
      },
      commonPitfalls: [
        'Statistical methods differ from those defined in approved SAP',
        'Sample size justification not provided or inconsistent with protocol',
        'Analysis populations not clearly defined or differ from SAP',
        'Post-hoc analyses performed without clear justification',
        'Missing data handling methods not described or not applied as planned',
      ],
      referencedDocuments: [
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-6',
    title: 'Subject Disposition and Baseline',
    helperText: 'Summarize subject enrollment, disposition, and baseline characteristics.',
    content: `**6.1 Subject Disposition**

A total of [number] subjects were enrolled in the clinical investigation. Subject disposition, including enrollment, completion, and discontinuation, is summarized in the corresponding tables.

Reasons for subject withdrawal, where applicable, are documented and evaluated for potential impact on study outcomes.

**6.2 Baseline Characteristics**

Baseline demographic and clinical characteristics of the study population are summarized to provide context for interpretation of the results.

Baseline data were comparable across study subjects and consistent with the intended use population defined in the protocol.`,
    order: 6,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [
      {
        id: 'finding-6-1',
        sectionId: 'section-6',
        type: 'warning',
        category: 'data-consistency',
        title: 'Missing specific enrollment number',
        description: 'The text uses \"[number]\" as a placeholder. Replace with actual enrollment count from study database.',
        resolved: false,
        textPosition: {
          start: 49,
          end: 57,
          markedText: '[number]'
        },
        relatedSectionId: 'section-4',
        relatedSectionTitle: 'Clinical Investigation Design',
        sectionOwner: 'Dr. Marcus Rivera',
        dueDate: '2026-03-01',
      },
      {
        id: 'finding-6-2',
        sectionId: 'section-6',
        type: 'info',
        category: 'protocol-consistency',
        title: 'Consider adding table cross-reference',
        description: 'Consider adding \"Table X\" reference to guide reader to the specific disposition table.',
        resolved: false,
        textPosition: {
          start: 160,
          end: 172,
          markedText: 'summarized'
        }
      },
    ],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 6.0'],
    linkedProtocolSections: ['Protocol Section 6.0'],
    completenessElements: [
      {
        id: 'comp-6-1',
        title: 'Subject accountability and disposition',
        isoReference: 'ISO 14155:2020 Section 7.3.9',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
      {
        id: 'comp-6-2',
        title: 'Baseline characteristics',
        isoReference: 'ISO 14155:2020 Section 7.3.10',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.9-7.3.10',
        items: [
          'Total number of subjects enrolled and screened',
          'Subject disposition flow (screening, enrollment, completion, withdrawal)',
          'Reasons for discontinuation with frequencies',
          'Protocol deviations summary',
          'Baseline demographic characteristics (age, sex, ethnicity)',
          'Baseline disease characteristics relevant to device indication',
          'Comparability across treatment groups or study sites',
        ],
        mustAlignWith: 'Must align with: Protocol enrollment target, SAP analysis populations, actual study data',
      },
      commonPitfalls: [
        'Enrollment numbers inconsistent across sections or with SAP',
        'Missing disposition flowchart or unclear subject accountability',
        'Baseline characteristics not stratified by relevant subgroups',
        'Protocol deviations not adequately summarized',
        'Withdrawn subjects not accounted for in disposition summary',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-7',
    title: 'Clinical Performance Results',
    helperText: 'Present findings for primary and secondary endpoints with referenced tables and figures.',
    content: `**7.1 Primary Endpoint Results**

Results for the primary endpoint are presented in the referenced tables and figures. The analysis demonstrates whether the predefined performance criteria were met.

**7.2 Secondary Endpoint Results**

Secondary endpoint results provide additional information regarding device performance and clinical outcomes.

All results are presented objectively without interpretation beyond the predefined analyses.`,
    order: 7,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1], mockUsers[2]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 7.0'],
    linkedProtocolSections: ['Protocol Section 7.0'],
    completenessElements: [
      {
        id: 'comp-7-1',
        title: 'Performance and efficacy results',
        isoReference: 'ISO 14155:2020 Section 7.3.11',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
      {
        id: 'comp-7-2',
        title: 'Primary endpoint analysis presentation',
        isoReference: 'ISO 14155:2020 Section 7.3.11.1',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.11',
        items: [
          'Presentation of primary endpoint results with statistical analysis',
          'Presentation of secondary endpoint results',
          'Cross-references to tables and figures supporting each result',
          'Objective reporting without interpretation or speculation',
          'Statement on whether acceptance criteria were met',
          'Subgroup analyses as prespecified in SAP',
        ],
        mustAlignWith: 'Must align with: SAP analysis methods, protocol endpoints, completeness status elements',
      },
      commonPitfalls: [
        'Results reported without clear reference to corresponding tables/figures',
        'Interpretation mixed with results presentation (should be in Discussion)',
        'Primary endpoint results buried in text without clear prominence',
        'Results presented that were not prespecified in protocol or SAP',
        'Missing statement on whether acceptance criteria were achieved',
      ],
      referencedDocuments: [
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-8',
    title: 'Safety Analysis',
    helperText: 'Summarize adverse events, serious adverse events, and device effects.',
    content: `**8.1 Adverse Events**

All adverse events reported during the clinical investigation were collected, coded, and evaluated according to the protocol.

The incidence, severity, and relationship of adverse events to the device and procedures are summarized in the safety tables.

**8.2 Serious Adverse Events and Device Effects**

No unexpected serious adverse device effects were identified unless otherwise stated. All serious events were reviewed and assessed for regulatory significance.`,
    order: 8,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [
      {
        id: 'finding-safety-1',
        sectionId: 'section-8',
        type: 'blocker',
        title: 'Mandatory Safety Section',
        description: 'Safety Analysis section must be completed before final report assembly. All adverse events must be documented and analyzed.',
        protocolReference: 'EU MDR Article 62, ISO 14155:2020 Section 9.3',
        resolved: false,
      },
    ],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: ['SAP Section 8.0'],
    linkedProtocolSections: ['Protocol Section 8.0'],
    completenessElements: [
      {
        id: 'comp-8-1',
        title: 'Safety results (AEs, SAEs, device effects)',
        isoReference: 'ISO 14155:2020 Section 7.3.12',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
      {
        id: 'comp-8-2',
        title: 'Adverse event summary and analysis',
        isoReference: 'ISO 14155:2020 Section 7.3.12.1',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.3.12 · MDR Article 62',
        items: [
          'Summary of all adverse events (AEs) with incidence and severity',
          'Summary of serious adverse events (SAEs) and serious adverse device effects',
          'Device deficiencies and malfunctions',
          'Relationship assessment (device-related, procedure-related, unrelated)',
          'Analysis of expected vs. unexpected events',
          'Statement on unanticipated adverse device effects (UADEs)',
          'Regulatory reporting compliance statement',
        ],
        mustAlignWith: 'Must align with: Protocol safety specifications, risk management file, device deficiency reports',
      },
      commonPitfalls: [
        'Safety section incomplete or missing mandatory event categories',
        'Adverse events not coded according to standardized terminology (e.g., MedDRA)',
        'Missing analysis of device-related vs. procedure-related events',
        'Serious events not adequately described or missing causality assessment',
        'No clear statement on whether events were expected or unexpected',
        'Incomplete reporting of device deficiencies or malfunctions',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
        {
          name: 'Risk Management File',
          version: 'Version 4.2',
          date: '2025-01-22',
          approvalStatus: 'Approved',
        },
      ],
    },
  },
  {
    id: 'section-9',
    title: 'Report Appendices',
    helperText: 'Appendices provide full traceability and supporting evidence for the Clinical Investigation Report. All required appendices must be attached before final approval.',
    content: `Appendices provide full traceability and supporting evidence for the Clinical Investigation Report. All required appendices must be attached before final approval.

**Required Appendices**

These appendices are mandatory and must be attached to complete the Clinical Investigation Report:

• Final Approved Clinical Investigation Protocol
• Statistical Analysis Plan (SAP)
• Protocol Deviations Listing
• Adverse Event Listings

**Recommended Appendices**

These appendices provide additional context and supporting documentation:

• DSMB Meeting Summaries and Recommendations
• Ethics Committee Approvals

**Optional Appendices**

These appendices may be included based on study-specific requirements:

• Core Lab Reports
• Data Quality / Monitoring Summary`,
    order: 9,
    state: 'draft',
    roles: {
      contentOwner: [mockUsers[0]],
      reviewer: [mockUsers[1]],
      requiredApprover: [mockUsers[3]],
    },
    comments: [],
    validationFindings: [
      {
        id: 'finding-appendix-1',
        sectionId: 'section-9',
        type: 'blocker',
        title: 'Required Appendices Missing',
        description: 'All required appendices must be attached before final report approval. Currently missing: Final Approved Clinical Investigation Protocol, Statistical Analysis Plan, Protocol Deviations Listing, Adverse Event Listings.',
        protocolReference: 'ISO 14155:2020 Section 7.4, MDR Article 62(7)',
        resolved: false,
      },
    ],
    aiDraftGenerated: false,
    userEdited: false,
    insertedAssets: [],
    approvals: [],
    linkedSAPSections: [],
    linkedProtocolSections: ['Protocol Section 1.0'],
    completenessElements: [
      {
        id: 'comp-9-1',
        title: 'Required appendices attached',
        isoReference: 'ISO 14155:2020 Section 7.4',
        status: 'not-yet-verified',
        aiSuggestion: 'missing',
      },
      {
        id: 'comp-9-2',
        title: 'Appendix references and version control',
        isoReference: 'ISO 14155:2020 Section 7.4',
        status: 'not-yet-verified',
        aiSuggestion: 'partial',
      },
    ],
    guidance: {
      requiredElements: {
        reference: 'ISO 14155:2020 § 7.4 · MDR Article 62(7)',
        items: [
          'Final approved Clinical Investigation Protocol with all amendments',
          'Statistical Analysis Plan (SAP) version used for analyses',
          'Complete listing of protocol deviations',
          'Complete adverse event listings (all AEs and SAEs)',
          'Ethics Committee approvals for all participating sites',
          'DSMB meeting summaries and recommendations (if applicable)',
          'Version control and document identification for all appendices',
        ],
        mustAlignWith: 'Must align with: Document version references in report text, regulatory submission requirements',
      },
      commonPitfalls: [
        'Missing required appendices blocks final report approval',
        'Appendix versions do not match references cited in report body',
        'Protocol amendments not included in appendix package',
        'Adverse event listings incomplete or not reflecting final database lock',
        'Ethics committee approvals missing for some sites',
        'Document dates and versions not clearly identified',
      ],
      referencedDocuments: [
        {
          name: 'Clinical Investigation Plan',
          version: 'Version 3.0',
          date: '2024-11-15',
          approvalStatus: 'Approved',
        },
        {
          name: 'Statistical Analysis Plan',
          version: 'Version 2.1',
          date: '2025-03-20',
          approvalStatus: 'Approved',
        },
      ],
    },
    appendices: [
      {
        id: 'appendix-protocol',
        name: 'Final Approved Clinical Investigation Protocol',
        category: 'required',
        status: 'not-attached',
        description: 'Complete protocol including all amendments',
      },
      {
        id: 'appendix-sap',
        name: 'Statistical Analysis Plan (SAP)',
        category: 'required',
        status: 'not-attached',
        description: 'Final SAP version used for all analyses',
      },
      {
        id: 'appendix-deviations',
        name: 'Protocol Deviations Listing',
        category: 'required',
        status: 'not-attached',
        description: 'Complete listing of all protocol deviations',
      },
      {
        id: 'appendix-ae',
        name: 'Adverse Event Listings',
        category: 'required',
        status: 'not-attached',
        description: 'All AEs and SAEs with full details',
      },
      {
        id: 'appendix-dsmb',
        name: 'DSMB Meeting Summaries and Recommendations',
        category: 'recommended',
        status: 'not-attached',
        description: 'Data Safety Monitoring Board summaries',
      },
      {
        id: 'appendix-ethics',
        name: 'Ethics Committee Approvals',
        category: 'recommended',
        status: 'not-attached',
        description: 'EC approvals for all participating sites',
      },
      {
        id: 'appendix-corelab',
        name: 'Core Lab Reports',
        category: 'optional',
        status: 'not-attached',
        description: 'Central laboratory analysis reports',
      },
      {
        id: 'appendix-monitoring',
        name: 'Data Quality / Monitoring Summary',
        category: 'optional',
        status: 'not-attached',
        description: 'Data monitoring and quality assurance summary',
      },
    ],
  },
];

export const mockDataAssets: DataAsset[] = [
  {
    id: 'table-1',
    type: 'table',
    name: 'Table 1: Baseline Demographics',
    description: 'Patient demographics by treatment group',
    selected: false,
    suggestedSections: ['section-6'],
    source: 'dataset',
    uploadStatus: 'ready',
  },
  {
    id: 'table-2',
    type: 'table',
    name: 'Table 2: Primary Endpoint Analysis',
    description: 'Statistical analysis of primary efficacy endpoint',
    selected: false,
    suggestedSections: ['section-7'],
    source: 'sap',
    uploadStatus: 'ready',
  },
  {
    id: 'table-3',
    type: 'table',
    name: 'Table 3: Adverse Events Summary',
    description: 'Summary of treatment-emergent adverse events',
    selected: false,
    suggestedSections: ['section-8'],
    source: 'dataset',
    uploadStatus: 'ready',
  },
  {
    id: 'graph-1',
    type: 'graph',
    name: 'Figure 1: Kaplan-Meier Survival Curve',
    description: 'Time to event analysis by treatment arm',
    selected: false,
    suggestedSections: ['section-7'],
    source: 'sap',
    uploadStatus: 'ready',
  },
  {
    id: 'graph-2',
    type: 'graph',
    name: 'Figure 2: Change from Baseline Over Time',
    description: 'Mean change in primary endpoint by visit',
    selected: false,
    suggestedSections: ['section-7'],
    source: 'statistical-report',
    uploadStatus: 'ready',
  },
  {
    id: 'stat-1',
    type: 'statistical-output',
    name: 'ANCOVA Model Output',
    description: 'Analysis of covariance for primary endpoint',
    selected: false,
    suggestedSections: ['section-7'],
    source: 'sap',
    uploadStatus: 'ready',
  },
];

export const mockProtocolSections: ProtocolSection[] = [
  {
    id: 'proto-1',
    title: 'Protocol: Study Design',
    content: 'This is a Phase III, randomized, double-blind, placebo-controlled, multicenter study to evaluate the efficacy and safety of Investigational Product X in patients with moderate to severe condition Y. Approximately 300 patients will be randomized 2:1 to receive either IP-X or placebo for 24 weeks.',
  },
  {
    id: 'proto-2',
    title: 'Protocol: Primary Endpoint',
    content: 'The primary efficacy endpoint is the change from baseline to Week 24 in the Disease Activity Score (DAS). Statistical significance will be assessed using ANCOVA with treatment group, baseline score, and stratification factors as covariates.',
  },
  {
    id: 'proto-3',
    title: 'Protocol: Safety Assessments',
    content: 'Safety will be assessed through adverse event monitoring, clinical laboratory tests, vital signs, and physical examinations. All adverse events will be coded using MedDRA version 25.0.',
  },
];

export const mockUploadedFiles: UploadedFile[] = [
  {
    id: 'file-1',
    name: 'Statistical_Analysis_Plan_v2.1.pdf',
    type: 'sap',
    uploadDate: '2026-02-10',
    size: '2.4 MB',
  },
  {
    id: 'file-2',
    name: 'SDTM_Datasets_Final.zip',
    type: 'dataset',
    uploadDate: '2026-02-11',
    size: '45.8 MB',
  },
];

export const mockAuditLog: AuditLogEntry[] = [
  // Section 1: Executive Summary
  {
    id: 'audit-1-1',
    sectionId: 'section-1',
    timestamp: '2026-02-05T14:32:18Z',
    action: 'Section locked for regulatory submission',
    user: mockUsers[3],
    role: 'VP Clinical Affairs',
    affected: 'Section 4.1 (entire)',
    description: 'Section locked after final approval. Further changes require formal amendment process per protocol change control.',
    domain: 'Approval',
  },
  {
    id: 'audit-1-2',
    sectionId: 'section-1',
    timestamp: '2026-02-05T14:30:45Z',
    action: 'Section approved',
    user: mockUsers[3],
    role: 'VP Clinical Affairs',
    affected: 'Section 4.1 (entire)',
    description: 'Final approval granted for Review Cycle 3. All protocol identifiers verified against sponsor records and registry.',
    domain: 'Approval',
  },
  {
    id: 'audit-1-3',
    sectionId: 'section-1',
    timestamp: '2026-02-04T16:20:33Z',
    action: 'Review comment added',
    user: mockUsers[1],
    role: 'Regulatory Reviewer',
    affected: 'EudraCT Number',
    description: 'Confirmed EudraCT number 2026-000547-19 obtained from EU Clinical Trials Register. Status updated from "pending" to confirmed.',
    domain: 'Review',
  },
  {
    id: 'audit-1-4',
    sectionId: 'section-1',
    timestamp: '2026-02-04T11:15:22Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'Principal Investigator',
    affected: 'Protocol Version & Date',
    description: 'Version updated from 1.2 to 1.3 following incorporation of review comments from Cycle 2.',
    domain: 'Content',
  },
  {
    id: 'audit-1-5',
    sectionId: 'section-1',
    timestamp: '2026-02-03T09:45:10Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'Principal Investigator',
    affected: 'Coordinating Investigator',
    description: 'Added full institutional affiliation and contact details for Prof. Dr. Andreas Müller.',
    domain: 'Content',
  },
  {
    id: 'audit-1-6',
    sectionId: 'section-1',
    timestamp: '2026-02-01T10:30:05Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'Principal Investigator',
    affected: 'Section 1 (entire)',
    description: 'Initial section structure created based on ISO 14155:2020 template.',
    domain: 'Content',
  },

  // Section 2: Introduction and Background
  {
    id: 'audit-2-1',
    sectionId: 'section-2',
    timestamp: '2026-02-20T15:45:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Device Description',
    description: 'Updated device description to align with Clinical Evaluation Plan v2.0.',
    domain: 'Content',
  },
  {
    id: 'audit-2-2',
    sectionId: 'section-2',
    timestamp: '2026-02-20T10:15:00Z',
    action: 'Review comment added',
    user: mockUsers[1],
    role: 'Senior Reviewer',
    affected: 'Background section',
    description: 'Requested alignment between background information and protocol rationale section.',
    domain: 'Review',
  },
  {
    id: 'audit-2-3',
    sectionId: 'section-2',
    timestamp: '2026-02-18T09:30:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 2 (entire)',
    description: 'Initial section structure created with regulatory context and device description.',
    domain: 'Content',
  },

  // Section 5: Statistical Methods
  {
    id: 'audit-5-1',
    sectionId: 'section-5',
    timestamp: '2026-02-19T14:20:00Z',
    action: 'Validation finding raised',
    user: mockUsers[2],
    role: 'Clinical Scientist',
    affected: 'Analysis populations',
    description: 'Blocker raised: Statistical methods section requires complete description of analysis populations as per SAP v2.1 Section 5.2.',
    domain: 'Review',
  },
  {
    id: 'audit-5-2',
    sectionId: 'section-5',
    timestamp: '2026-02-18T11:00:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 5 (entire)',
    description: 'Initial section structure created. Content pending completion.',
    domain: 'Content',
  },

  // Section 3: Objectives and Endpoints
  {
    id: 'audit-3-1',
    sectionId: 'section-3',
    timestamp: '2026-02-19T16:30:00Z',
    action: 'Completeness verified',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Primary and secondary endpoints',
    description: 'All endpoint definitions verified against approved Clinical Investigation Plan v3.0 and SAP v2.1.',
    domain: 'Review',
  },
  {
    id: 'audit-3-2',
    sectionId: 'section-3',
    timestamp: '2026-02-19T14:15:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Secondary objectives',
    description: 'Added secondary objectives description to align with protocol Section 3.2.',
    domain: 'Content',
  },
  {
    id: 'audit-3-3',
    sectionId: 'section-3',
    timestamp: '2026-02-18T10:00:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 3 (entire)',
    description: 'Initial section created based on approved protocol objectives and endpoints.',
    domain: 'Content',
  },

  // Section 4: Clinical Investigation Design
  {
    id: 'audit-4-1',
    sectionId: 'section-4',
    timestamp: '2026-02-19T11:45:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Study procedures',
    description: 'Added study procedures description including visit schedule and assessments.',
    domain: 'Content',
  },
  {
    id: 'audit-4-2',
    sectionId: 'section-4',
    timestamp: '2026-02-18T13:30:00Z',
    action: 'Review comment added',
    user: mockUsers[1],
    role: 'Senior Reviewer',
    affected: 'Inclusion/exclusion criteria',
    description: 'Requested complete listing of all eligibility criteria as defined in protocol.',
    domain: 'Review',
  },
  {
    id: 'audit-4-3',
    sectionId: 'section-4',
    timestamp: '2026-02-18T09:15:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 4 (entire)',
    description: 'Initial section structure created for clinical investigation design description.',
    domain: 'Content',
  },

  // Section 6: Subject Disposition and Baseline
  {
    id: 'audit-6-1',
    sectionId: 'section-6',
    timestamp: '2026-02-20T14:20:00Z',
    action: 'Validation finding raised',
    user: mockUsers[1],
    role: 'Senior Reviewer',
    affected: 'Enrollment numbers',
    description: 'Warning raised: Replace placeholder \"[number]\" with actual enrollment count from study database.',
    domain: 'Review',
  },
  {
    id: 'audit-6-2',
    sectionId: 'section-6',
    timestamp: '2026-02-19T15:30:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Baseline characteristics',
    description: 'Added baseline characteristics description pending data lock and final analysis.',
    domain: 'Content',
  },
  {
    id: 'audit-6-3',
    sectionId: 'section-6',
    timestamp: '2026-02-18T11:45:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 6 (entire)',
    description: 'Section created for subject disposition and baseline reporting.',
    domain: 'Content',
  },

  // Section 7: Clinical Performance Results
  {
    id: 'audit-7-1',
    sectionId: 'section-7',
    timestamp: '2026-02-20T09:45:00Z',
    action: 'Review comment added',
    user: mockUsers[2],
    role: 'Clinical Scientist',
    affected: 'Primary endpoint results',
    description: 'Section awaiting final statistical analysis outputs from biostatistics team.',
    domain: 'Review',
  },
  {
    id: 'audit-7-2',
    sectionId: 'section-7',
    timestamp: '2026-02-19T10:30:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section structure',
    description: 'Created subsections for primary and secondary endpoint results presentation.',
    domain: 'Content',
  },
  {
    id: 'audit-7-3',
    sectionId: 'section-7',
    timestamp: '2026-02-18T14:00:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 7 (entire)',
    description: 'Section created for clinical performance results. Pending data availability.',
    domain: 'Content',
  },

  // Section 8: Safety Analysis
  {
    id: 'audit-8-1',
    sectionId: 'section-8',
    timestamp: '2026-02-20T16:15:00Z',
    action: 'Validation finding raised',
    user: mockUsers[3],
    role: 'VP Clinical Affairs',
    affected: 'Safety Analysis (entire)',
    description: 'Blocker raised: Safety Analysis section is mandatory before final report assembly per EU MDR Article 62 and ISO 14155:2020.',
    domain: 'Review',
  },
  {
    id: 'audit-8-2',
    sectionId: 'section-8',
    timestamp: '2026-02-19T13:00:00Z',
    action: 'Content updated',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Adverse events structure',
    description: 'Created subsections for AEs, SAEs, and device effects reporting.',
    domain: 'Content',
  },
  {
    id: 'audit-8-3',
    sectionId: 'section-8',
    timestamp: '2026-02-18T15:30:00Z',
    action: 'Section created',
    user: mockUsers[0],
    role: 'VP Clinical Affairs',
    affected: 'Section 8 (entire)',
    description: 'Safety Analysis section created. Awaiting completion of adverse event coding and analysis.',
    domain: 'Content',
  },
];

export const mockCompletenessStatus: ReportCompletenessStatus = {
  elements: [
    {
      id: 'comp-1',
      title: 'Title page and document identifiers',
      isoReference: 'ISO 14155:2020 Section 7.3.1',
      status: 'verified',
      verifiedBy: mockUsers[0],
      verificationDate: '2026-02-18T14:30:00Z',
      aiSuggestion: 'covered',
    },
    {
      id: 'comp-2',
      title: 'Executive summary or abstract',
      isoReference: 'ISO 14155:2020 Section 7.3.2',
      status: 'verified',
      verifiedBy: mockUsers[0],
      verificationDate: '2026-02-18T14:35:00Z',
      aiSuggestion: 'covered',
    },
    {
      id: 'comp-3',
      title: 'Introduction and background',
      isoReference: 'ISO 14155:2020 Section 7.3.3',
      status: 'partially-covered',
      aiSuggestion: 'partial',
    },
    {
      id: 'comp-4',
      title: 'Clinical investigation objectives',
      isoReference: 'ISO 14155:2020 Section 7.3.4',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-5',
      title: 'Clinical investigation design',
      isoReference: 'ISO 14155:2020 Section 7.3.5',
      status: 'not-yet-verified',
      aiSuggestion: 'partial',
    },
    {
      id: 'comp-6',
      title: 'Subject selection (inclusion/exclusion criteria)',
      isoReference: 'ISO 14155:2020 Section 7.3.6',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-7',
      title: 'Risk management summary',
      isoReference: 'ISO 14155:2020 Section 7.3.7',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-8',
      title: 'Statistical methods and sample size justification',
      isoReference: 'ISO 14155:2020 Section 7.3.8',
      status: 'not-yet-verified',
      aiSuggestion: 'partial',
    },
    {
      id: 'comp-9',
      title: 'Subject accountability and disposition',
      isoReference: 'ISO 14155:2020 Section 7.3.9',
      status: 'not-yet-verified',
      aiSuggestion: 'partial',
    },
    {
      id: 'comp-10',
      title: 'Baseline characteristics',
      isoReference: 'ISO 14155:2020 Section 7.3.10',
      status: 'not-yet-verified',
      aiSuggestion: 'partial',
    },
    {
      id: 'comp-11',
      title: 'Performance and efficacy results',
      isoReference: 'ISO 14155:2020 Section 7.3.11',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-12',
      title: 'Safety results (AEs, SAEs, device effects)',
      isoReference: 'ISO 14155:2020 Section 7.3.12',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-13',
      title: 'Discussion and clinical interpretation',
      isoReference: 'ISO 14155:2020 Section 7.3.13',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-14',
      title: 'Conclusion and benefit–risk assessment',
      isoReference: 'ISO 14155:2020 Section 7.3.14',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
    {
      id: 'comp-15',
      title: 'References',
      isoReference: 'ISO 14155:2020 Section 7.3.15',
      status: 'not-yet-verified',
      aiSuggestion: 'missing',
    },
  ],
};