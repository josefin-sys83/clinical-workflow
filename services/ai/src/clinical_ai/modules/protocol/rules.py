from __future__ import annotations

from typing import Any


PROTOCOL_SECTION_TITLES = [
    'Protocol Overview',
    'Study Rationale & Objectives',
    'Device Description & Intended Clinical Use',
    'Study Design',
    'Subject Eligibility Criteria',
    'Study Procedures & Assessments',
    'Safety Monitoring & Reporting',
    'Statistical Considerations',
    'Ethics & Regulatory Considerations',
]

PROTOCOL_HIGH_ISSUE_SECTIONS = [
    'Safety Monitoring & Reporting',
    'Statistical Considerations',
    'Ethics & Regulatory Considerations',
]


def get_section_requirements(sectionTitle: str) -> dict[str, str]:
    requirements_map = {
        'Protocol Overview': {
            'required': 'Study title, sponsor name, brief study objectives, brief study design summary, device name, and cross-references to other protocol sections.',
            'forbidden': 'Do NOT flag missing statistical methods, risk management plans, data protection details, AE definitions, or eligibility criteria — those belong in dedicated sections.',
        },
        'Study Rationale & Objectives': {
            'required': 'Scientific rationale for the study, primary endpoint with measurable definition, secondary endpoints, and the study hypothesis.',
            'forbidden': 'Do not flag missing device specifications, study procedures, or statistical analysis details.',
        },
        'Device Description & Intended Clinical Use': {
            'required': 'Device name and model, regulatory classification per each target market (e.g. EU MDR class, FDA device class), intended use statement, contraindications, and key device specifications.',
            'forbidden': 'Do not flag missing study design details, eligibility criteria, or statistical methods.',
        },
        'Study Design': {
            'required': 'Study type (e.g. prospective, single-arm, observational), total study duration, planned number of subjects, number of investigational sites, follow-up period, and a visit schedule overview.',
            'forbidden': 'Do not flag missing statistical analysis methods, eligibility criteria lists, or device specifications.',
        },
        'Subject Eligibility Criteria': {
            'required': 'Inclusion criteria list, exclusion criteria list, screening procedures, and recruitment feasibility considerations.',
            'forbidden': 'Do not flag missing study procedures, safety monitoring details, or statistical methods.',
        },
        'Study Procedures & Assessments': {
            'required': 'Visit schedule with timepoints, clinical assessments performed at each visit, any laboratory procedures, and how primary and secondary endpoints are measured.',
            'forbidden': 'Do not flag missing eligibility criteria, statistical analysis details, or ethics committee information.',
        },
        'Safety Monitoring & Reporting': {
            'required': 'AE and SAE definitions per ISO 14155, reporting timelines for SAEs, safety monitoring committee or DSMB charter, stopping rules, and integration with risk management per EU MDR Annex XV (for EU markets), UADE (Unanticipated Adverse Device Effect) definition per ISO 14155:2020 §4.10.2, SADE (Serious Adverse Device Effect) definition, EU MDR Article 80 serious incident reporting to competent authority, causality assessment methodology, 24-hour expedited reporting timeline to sponsor.',
            'forbidden': 'Do not flag missing statistical methods, eligibility criteria, or ethics committee details.',
        },
        'Statistical Considerations': {
            'required': 'Sample size calculation with justification, primary statistical method, secondary endpoint analysis methods, normality testing approach, missing data handling strategy, and reference to a Statistical Analysis Plan (SAP), significance level α and power (1-β) explicitly stated, analysis populations defined (ITT, PP, Safety), multiplicity adjustment strategy, one-sided vs two-sided test declaration.',
            'forbidden': 'Do not flag missing eligibility criteria, study procedures, safety monitoring, or ethics details.',
        },
        'Ethics & Regulatory Considerations': {
            'required': 'Ethics committee approval process, informed consent process and documentation, data protection per GDPR Article 32 (for EU markets) including encryption, pseudonymization methods, and breach notification procedures, Declaration of Helsinki reference, ICH-GCP E6(R2) compliance statement, CIV notification (EU) or IDE application (US) regulatory pathway reference, data retention period per EU MDR (15 years minimum).',
            'forbidden': 'Do not flag missing statistical methods, safety monitoring details, or device specifications.',
        },
    }
    return requirements_map.get(sectionTitle, {
        'required': f'All content appropriate for a "{sectionTitle}" section of a clinical investigation protocol.',
        'forbidden': 'Do not flag content that clearly belongs in other sections.',
    })


def get_core_regulatory_context(targetMarkets: list[str], deviceCategory: str) -> str:
    isEU = any(('EU' in m or 'Europe' in m) for m in targetMarkets)
    isUS = any(('US' in m or 'FDA' in m or 'United States' in m) for m in targetMarkets)
    isAIMD = deviceCategory in ['AIMD', 'aimd'] or ('implant' in (deviceCategory or '').lower())
    isIVD = deviceCategory in ['IVD', 'ivd']
    isSaMD = deviceCategory in ['SaMD', 'Software', 'samd', 'simd', 'ai-ml']

    refs = ['ISO 14155:2020 (Good Clinical Practice for medical devices)']
    if isEU:
        refs.append('EU MDR 2017/745 Annex XV (clinical investigations)')
    if isUS:
        refs.append('21 CFR Part 812 (Investigational Device Exemptions)')
    if isAIMD:
        refs.append('ISO 14708 series, EN 45502-1')
    if isIVD:
        refs.append('IVDR 2017/746')
    if isSaMD:
        refs.append('IMDRF SaMD N41, FDA SaMD guidance')
    refs.extend(['Declaration of Helsinki (2013 revision)', 'ICH-GCP E6(R2)'])
    return '; '.join(refs)
