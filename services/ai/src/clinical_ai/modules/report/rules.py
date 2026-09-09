from __future__ import annotations

from typing import Any

from clinical_ai.utils import get_value


REPORT_HIGH_ISSUE_SECTIONS = [
    'Safety Analysis',
    'Statistical Methods',
    'Report Appendices',
    'Clinical Investigation Design',
    'Algorithm Performance and Validation',
    'Long-term Safety and Performance Assessment',
    'Conclusions and Benefit-Risk Assessment',
]


def get_report_section_instructions(sectionTitle: str, sectionNumber: int) -> dict[str, str]:
    section_map = {
        'Executive Summary': {
            'instructions': """Extract from protocol sections to write a complete executive summary:
- Study overview: purpose, device, indication, study design type
- Brief methodology: study type, number of subjects, follow-up period, sites
- Key results summary: use [RESULT: primary endpoint result] and [RESULT: overall study outcome] placeholders
- Safety summary: use [RESULT: total AEs] and [RESULT: SAE count] placeholders
- Overall conclusions and benefit-risk assessment
- Regulatory context: applicable regulations and target markets
Reference the protocol ID and device name throughout.""",
            'placeholderGuidance': 'For results not yet available, use exactly: [RESULT: description]. For dates: [DATE: description]. For tables: [TABLE: description]. For names/confirmations: [CONFIRM: description].',
        },
        'Introduction and Background': {
            'instructions': """Extract from Protocol sections "Protocol Overview", "Study Rationale & Objectives", and "Device Description & Intended Clinical Use":
- Device description: name, model, intended use, regulatory classification per target market
- Clinical need justification: unmet medical need, current standard of care limitations
- State of the art review: existing devices and therapies, clinical evidence gaps
- Study regulatory context: applicable regulations, standards, previous studies
- Rationale for this specific clinical investigation""",
            'placeholderGuidance': 'Use [CONFIRM: regulatory classification] if classification is unclear. Use [CONFIRM: previous study references] if prior studies should be cited.',
        },
        'Objectives and Endpoints': {
            'instructions': """Extract verbatim from Protocol "Study Rationale & Objectives":
- Primary endpoint: exact measurable definition with timepoint
- Secondary endpoints: each with measurable definition and timepoint
- Exploratory endpoints if any
- Study hypothesis (null and alternative)
- Rationale for endpoint selection
Preserve all endpoint definitions literally from the protocol.""",
            'placeholderGuidance': 'Use [CONFIRM: endpoint definition] if any endpoint definition is unclear or missing from the protocol.',
        },
        'Clinical Investigation Design': {
            'instructions': """Extract from Protocol "Study Design" and "Subject Eligibility Criteria":
- Study type: prospective/retrospective, interventional/observational, single-arm/controlled
- Multicenter or single-center status with number of sites
- Total sample size with statistical justification
- Follow-up period and total study duration
- Visit schedule overview (screening, baseline, treatment, follow-up visits)
- Subject eligibility summary: key inclusion and exclusion criteria""",
            'placeholderGuidance': 'Use [CONFIRM: number of sites] if not specified. Use [CONFIRM: country/region of sites] if not specified.',
        },
        'Statistical Methods': {
            'instructions': """Extract from Protocol "Statistical Considerations":
- Analysis populations: ITT (Intent-to-Treat), PP (Per-Protocol), Safety populations — with definitions
- Primary statistical test: method, null hypothesis, significance level (α)
- Secondary analyses methods
- Missing data handling strategy (imputation methods)
- Reference to the Statistical Analysis Plan (SAP)
- Multiplicity adjustments if applicable""",
            'placeholderGuidance': 'Use [CONFIRM: SAP document reference] for the SAP reference. Use [CONFIRM: significance level] if α is not explicitly stated.',
        },
        'Subject Disposition and Baseline': {
            'instructions': """Create a complete section template with data placeholders. Use eligibility criteria from the protocol for context.
Structure:
6.1 Enrollment: [RESULT: total enrolled] subjects enrolled across [RESULT: number of sites] sites between [DATE: first subject enrolled] and [DATE: last subject enrolled].
6.2 Disposition: [TABLE: subject disposition flowchart showing screened, enrolled, completed, withdrawn with reasons]
Include [RESULT: total completed], [RESULT: total withdrawn] with breakdown by reason.
6.3 Baseline Characteristics: [TABLE: baseline demographics and clinical characteristics table]
NOTE: This section requires actual study data. All [RESULT:] placeholders must be replaced with verified data from the clinical database before regulatory submission.""",
            'placeholderGuidance': 'All [RESULT:] placeholders in this section are REQUIRED to be filled with actual data before submission. They are listed as blockers until resolved.',
        },
        'Clinical Performance Results': {
            'instructions': """Use protocol endpoints as structure to create a complete results template.
Structure:
7.1 Primary Endpoint: [RESULT: primary endpoint result] achieved in [RESULT: percentage]% of subjects (95% CI: [RESULT: confidence interval], p=[RESULT: p-value]). [TABLE: primary endpoint results table]
7.2 Secondary Endpoints: [TABLE: secondary endpoints summary table with results for each endpoint]
7.3 Subgroup Analyses: [TABLE: subgroup analysis results] — Reference the SAP for pre-specified subgroups.
Include clinical significance discussion and comparison to performance goals or literature benchmarks.
NOTE: This section requires actual study data. All [RESULT:] placeholders must be replaced with verified data from the clinical database before regulatory submission.""",
            'placeholderGuidance': 'All [RESULT:] placeholders are REQUIRED data — listed as blockers until filled with verified study results.',
        },
        'Safety Analysis': {
            'instructions': """Use protocol "Safety Monitoring & Reporting" to create a complete AE summary template.
Structure:
8.1 Adverse Events: A total of [RESULT: total AEs] adverse events were reported in [RESULT: number of subjects with AEs] subjects. [TABLE: AE summary by system organ class and preferred term]
8.2 Serious Adverse Events: [RESULT: SAE count] SAEs reported. [TABLE: SAE individual listing with causality and outcome]
8.3 Device-Related Events: [RESULT: device-related AE rate]% device-related adverse event rate. [TABLE: device-related AE listing]
8.4 Deaths: [RESULT: number of deaths] deaths reported during the study period. Detail causality assessments.
8.5 Safety Conclusion: Overall safety profile assessment.
NOTE: This section requires actual study data. All [RESULT:] placeholders must be replaced with verified data from the clinical database before regulatory submission.""",
            'placeholderGuidance': 'All [RESULT:] placeholders are REQUIRED safety data — listed as blockers until filled with verified data from the safety database.',
        },
        'Conclusions and Benefit-Risk Assessment': {
            'instructions': """Write a definitive conclusions section that:
- States clearly whether the study met its primary and secondary objectives
- Provides an explicit benefit-risk conclusion: quantify benefits (clinical performance improvement, quality of life) vs risks (adverse event rates, device-related risks)
- States regulatory conclusion: "The clinical data generated in [study name] support that [device name] meets the requirements of [applicable regulations] for its intended use"
- Includes recommendation for clinical use in the intended patient population
- References the overall study outcome and any limitations
- Uses [RESULT: overall study conclusion] for the final benefit-risk statement""",
            'placeholderGuidance': 'Use [RESULT: primary endpoint conclusion] and [RESULT: benefit-risk conclusion]',
        },
        'Regulatory Compliance Statement (EU MDR 2017/745)': {
            'instructions': """Write EU MDR 2017/745 compliance statement including:
- Confirmation that the clinical investigation was conducted in compliance with EU MDR 2017/745 Annex XV
- Reference to applicable harmonized standards (ISO 14155:2020, ISO 14971, IEC 60601 series as applicable)
- Notified Body name and number if applicable (use [CONFIRM: Notified Body details])
- CE marking status and certificate reference if applicable
- SSCP (Summary of Safety and Clinical Performance) reference if a post-market study
- Declaration of Helsinki compliance statement""",
            'placeholderGuidance': 'Use [CONFIRM: Notified Body name and number] and [CONFIRM: CE certificate reference]',
        },
        'Investigational Device Exemption (IDE) Compliance Summary': {
            'instructions': """Write FDA IDE compliance summary including:
- IDE application number (use [CONFIRM: IDE number G-XXXX])
- 21 CFR Part 812 compliance statement
- Summary of the investigational plan as submitted to FDA
- FDA correspondence and approval dates
- IRB approvals for all US investigational sites
- Adverse device effects reporting per 21 CFR 812.150""",
            'placeholderGuidance': 'Use [CONFIRM: IDE number] and [CONFIRM: FDA approval date]',
        },
        'Long-term Safety and Performance Assessment': {
            'instructions': """Write long-term safety and performance assessment for AIMD per ISO 14708 including:
- Device longevity data: battery life projections and measured performance (ISO 14708-1)
- Long-term biocompatibility assessment per ISO 10993
- Chronic tissue response data if available
- Device reliability: failure modes, fault analysis
- Long-term performance trends vs. baseline
- Comparison to manufacturer performance specifications""",
            'placeholderGuidance': 'Use [RESULT: device longevity data] and [RESULT: long-term safety findings]',
        },
        'Post-Market Clinical Follow-up Summary': {
            'instructions': """Write PMCF summary per EU MDR 2017/745 Annex XIV Part B including:
- PMCF objectives aligned with residual risks from risk management file
- PMCF methods: literature reviews, registries, patient surveys, follow-up studies
- Timeline and milestones for PMCF activities
- Preliminary PMCF findings if data is available
- Updated benefit-risk assessment based on post-market data
- Plan for PSUR (Periodic Safety Update Report) updates""",
            'placeholderGuidance': 'Use [RESULT: PMCF findings summary] for post-market data',
        },
        'Algorithm Performance and Validation': {
            'instructions': """Write SaMD algorithm performance section per IMDRF SaMD N41 including:
- Algorithm description: inputs, outputs, intended function
- Training dataset: size, demographics, data sources, preprocessing
- Validation dataset: independent validation methodology
- Performance metrics: sensitivity, specificity, AUC, NPV, PPV with confidence intervals
- Subgroup performance analysis
- Generalizability assessment across populations and settings
- Real-world performance monitoring plan
- Cybersecurity considerations per IMDRF N60""",
            'placeholderGuidance': 'Use [RESULT: algorithm sensitivity/specificity] for performance metrics',
        },
        'Report Appendices': {
            'instructions': """Generate a complete list of required appendices based on the study type and target markets. List each appendix with a letter designation (A, B, C...) and a clear description of what must be included:
A. Clinical Investigation Protocol and all amendments
B. Investigator's Brochure (IB) or equivalent device documentation
C. Ethics committee / IRB approval letters for each site
D. Informed Consent Form(s) — all versions
E. Investigator CVs and qualification documentation
F. Statistical Analysis Plan (SAP)
G. Case Report Forms (CRFs) — blank copies
H. Protocol deviation listing
I. Subject data listing (per-subject data)
J. Statistical output and analysis datasets
K. Regulatory approvals (IDE approval for US; CIV notification for EU MDR)
Add any additional appendices relevant to the specific device category and markets.""",
            'placeholderGuidance': 'Use [CONFIRM: appendix reference number] for documents that need official document numbers assigned.',
        },
    }
    return section_map.get(sectionTitle, {
        'instructions': f'Write a complete "{sectionTitle}" section for a Clinical Investigation Report (CIR) per ISO 14155:2020 and applicable regulations.',
        'placeholderGuidance': 'Use [RESULT: description] for missing data, [DATE: description] for dates, [TABLE: description] for tables, [CONFIRM: description] for items requiring verification.',
    })


def get_report_section_analysis_requirements(sectionTitle: str) -> dict[str, Any]:
    section_map: dict[str, dict[str, Any]] = {
        'Executive Summary': {
            'required': 'benefit-risk conclusion, primary endpoint result summary, safety summary, study outcome statement, protocol ID and device name',
            'forbidden': 'Do not flag missing detailed methodology, raw data tables, or statistical calculations - these belong in other sections.',
            'dataPlaceholderSections': True,
        },
        'Introduction and Background': {
            'required': 'device description with regulatory classification, clinical need/rationale, state of the art review, study regulatory context',
            'forbidden': 'Do not flag missing study results, safety data, or statistical analyses - these belong in later sections.',
            'dataPlaceholderSections': False,
        },
        'Objectives and Endpoints': {
            'required': 'measurable primary endpoint with definition, secondary endpoints, study hypothesis, timepoints for each endpoint',
            'forbidden': 'Do not flag missing study results, statistical analyses, or safety summaries.',
            'dataPlaceholderSections': False,
        },
        'Clinical Investigation Design': {
            'required': 'study type explicitly stated (prospective/retrospective/randomized etc.) per ISO 14155:2020 §7.3.4, sample size with statistical power justification per ISO 14155:2020 §7.3.6, number of investigational sites, follow-up duration and visit schedule, subject eligibility criteria (inclusion/exclusion), ethical and regulatory compliance statement',
            'forbidden': 'Do not flag missing statistical results, safety outcomes, or efficacy data - these belong in results sections.',
            'dataPlaceholderSections': False,
        },
        'Statistical Methods': {
            'required': 'reference to Statistical Analysis Plan (SAP), analysis populations defined (ITT, PP, Safety) per ISO 14155:2020 §7.4.1 (EU) or FDA SAP guidance (US), primary statistical test specified with null hypothesis, significance level (α) stated, missing data handling method described, multiplicity adjustments if applicable',
            'forbidden': 'Do not flag missing actual results or data - only methodology belongs here. Do not flag missing patient numbers if the SAP reference is present.',
            'dataPlaceholderSections': False,
        },
        'Subject Disposition and Baseline': {
            'required': 'actual enrollment numbers (no [RESULT:] placeholders allowed — these are blockers), subject accountability, baseline characteristics table reference',
            'forbidden': 'Do not flag missing efficacy results, statistical analyses, or safety conclusions.',
            'dataPlaceholderSections': True,
        },
        'Clinical Performance Results': {
            'required': 'primary endpoint result with CI and p-value (no [RESULT:] placeholders — blockers), secondary endpoint results, clinical significance discussion, performance goals per ISO 14155:2020 §9.7 for EU market, IDE success criteria per 21 CFR 812.25 for FDA market',
            'forbidden': 'Do not flag missing safety data, statistical methodology details, or baseline demographics - these belong in other sections.',
            'dataPlaceholderSections': True,
        },
        'Safety Analysis': {
            'required': 'total AE count, SAE count, device-related AE rate (no [RESULT:] placeholders — blockers), deaths if any, safety conclusion, EU MDR Article 2(58-60) AE definitions for EU market, 21 CFR 803 MDR reporting requirements for FDA market, ISO 14708 long-term safety data for AIMD devices',
            'forbidden': 'Do not flag missing efficacy results, baseline characteristics, or statistical methodology - these belong in other sections.',
            'dataPlaceholderSections': True,
        },
        'Conclusions and Benefit-Risk Assessment': {
            'required': 'explicit benefit-risk conclusion, statement on whether study met objectives, regulatory compliance conclusion, recommendation for clinical use',
            'forbidden': 'Do not flag missing raw data, detailed statistical analyses, or appendices - these belong in other sections.',
            'dataPlaceholderSections': True,
        },
        'Regulatory Compliance Statement (EU MDR 2017/745)': {
            'required': 'EU MDR 2017/745 Annex XV compliance statement, applicable harmonized standards listed, notified body reference if applicable, Declaration of Helsinki reference',
            'forbidden': 'Do not flag missing clinical results, statistical analyses, or safety data - these belong in other sections.',
            'dataPlaceholderSections': False,
        },
        'Investigational Device Exemption (IDE) Compliance Summary': {
            'required': 'IDE number, 21 CFR Part 812 compliance, FDA correspondence dates, IRB approvals for US sites',
            'forbidden': 'Do not flag missing clinical results, EU regulatory content, or statistical analyses.',
            'dataPlaceholderSections': False,
        },
        'Long-term Safety and Performance Assessment': {
            'required': 'device longevity data with battery life projections (ISO 14708-1), long-term biocompatibility assessment per ISO 10993, chronic tissue response data, device reliability and failure analysis, long-term performance trends vs baseline, comparison to manufacturer specifications.',
            'forbidden': 'Do not flag missing short-term efficacy results or baseline demographics - focus only on long-term safety data gaps.',
            'dataPlaceholderSections': True,
            'blockerCondition': 'No long-term safety data presented for AIMD device',
        },
        'Post-Market Clinical Follow-up Summary': {
            'required': 'PMCF objectives aligned with residual risks (EU MDR 2017/745 Annex XIV Part B), PMCF methods described (literature reviews, registries, follow-up studies), timeline and milestones, preliminary PMCF findings or plan if not yet available, updated benefit-risk assessment, PSUR update plan.',
            'forbidden': 'Do not flag missing clinical investigation results - focus only on PMCF plan completeness.',
            'dataPlaceholderSections': False,
            'blockerCondition': 'No PMCF plan described for EU market device',
        },
        'Algorithm Performance and Validation': {
            'required': 'algorithm description with inputs and outputs, training dataset description (size, demographics, sources), independent validation methodology, performance metrics with confidence intervals (sensitivity, specificity, AUC, NPV, PPV), subgroup performance analysis, generalizability assessment, real-world performance monitoring plan per IMDRF SaMD N41.',
            'forbidden': 'Do not flag missing clinical safety data or efficacy results - focus only on algorithm validation and SaMD-specific requirements.',
            'dataPlaceholderSections': True,
            'blockerCondition': 'No independent validation dataset described for SaMD device',
        },
        'Report Appendices': {
            'required': 'all mandatory appendices listed: Final Approved Clinical Investigation Protocol (mandatory), Statistical Analysis Plan SAP (mandatory), Protocol Deviations Listing (mandatory), Adverse Event Listings (mandatory), Informed Consent Form ICF (mandatory per ISO 14155:2020 §4.8.10), Investigator CVs (mandatory per ISO 14155:2020 §6.4), Ethics Committee Approvals (mandatory per ISO 14155:2020 §8.2.7 - NOT optional or recommended). Flag as blocker if any mandatory appendix is listed as not attached.',
            'forbidden': 'Do not flag content quality issues - only flag if mandatory appendices are listed as missing or not attached.',
            'dataPlaceholderSections': False,
        },
    }
    return section_map.get(sectionTitle, {
        'required': f'All content required for a "{sectionTitle}" section of a Clinical Investigation Report.',
        'forbidden': 'Do not flag content that clearly belongs in other report sections.',
        'dataPlaceholderSections': False,
    })


def get_report_section_relevant_protocol(sectionTitle: str, protocolSections: list[Any]) -> str:
    titleMatches: dict[str, list[str]] = {
        'Executive Summary': [],
        'Introduction and Background': [],
        'Objectives and Endpoints': ['Rationale', 'Objectives', 'Overview'],
        'Clinical Investigation Design': ['Study Design', 'Subject Eligibility', 'Procedures'],
        'Statistical Methods': ['Statistical', 'Study Design'],
        'Subject Disposition and Baseline': ['Subject Eligibility', 'Study Design', 'Procedures'],
        'Clinical Performance Results': ['Rationale', 'Objectives', 'Statistical', 'Study Design'],
        'Safety Analysis': ['Safety Monitoring', 'Study Procedures', 'Subject Eligibility'],
        'Report Appendices': [],
    }
    keywords = titleMatches.get(sectionTitle)
    useAll = not keywords or len(keywords) == 0
    if useAll:
        matched = protocolSections
    else:
        matched = [
            s for s in protocolSections
            if any(kw.lower() in str(get_value(s, 'title', '')).lower() for kw in keywords)
        ]
        if len(matched) == 0:
            matched = protocolSections
    charLimit = (600 if sectionTitle == 'Report Appendices' else 1000) if useAll else 4000
    return '\n\n'.join(
        f"[{get_value(s, 'title')}]:\n{str(get_value(s, 'content', '') or '')[:charLimit]}"
        for s in matched
    )
