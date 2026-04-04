import React from 'react';
import { AISourceReference } from './components/ai-source-reference';
import { RequiredElementsChecker } from './components/required-elements-checker';
import { AISuggestions } from './components/ai-suggestions';
import { InlineIssueMarker } from './components/inline-issue-marker';

// Demo of AI-Assisted Protocol Creation Features
export default function AIAssistedProtocolDemo() {
  // Example AI source references
  const aiSources = [
    {
      type: 'synopsis' as const,
      title: 'Clinical Investigation Synopsis',
      section: 'Study Design & Objectives',
      lastUpdated: '2026-02-05 14:30 CET'
    },
    {
      type: 'intended-use' as const,
      title: 'Device Intended Use Statement',
      section: 'Target Population & Indication',
      lastUpdated: '2026-02-03 09:15 CET'
    },
    {
      type: 'objectives' as const,
      title: 'Primary & Secondary Objectives',
      lastUpdated: '2026-02-04 16:45 CET'
    },
    {
      type: 'regulatory' as const,
      title: 'ISO 14155:2020 Requirements',
      section: '§ 6.6 Subject Selection Criteria',
      lastUpdated: '2020-09-01'
    }
  ];

  // Example required elements for Section 4.5
  const requiredElements = [
    {
      id: '1',
      name: 'Inclusion Criteria - Population Definition',
      description: 'Clear definition of target patient population including age, disease characteristics, and anatomical requirements',
      required: true,
      coverage: 'complete' as const,
      location: 'Inclusion Criteria subsection',
      reference: 'ISO 14155:2020 § 6.6.1'
    },
    {
      id: '2',
      name: 'Inclusion Criteria - Disease Severity',
      description: 'Objective criteria for disease severity (e.g., aortic valve area, mean gradient, symptom classification)',
      required: true,
      coverage: 'complete' as const,
      location: 'Inclusion Criteria subsection',
      reference: 'ISO 14155:2020 § 6.6.1'
    },
    {
      id: '3',
      name: 'Exclusion Criteria - Safety Contraindications',
      description: 'Contraindications from device IFU and known safety risks',
      required: true,
      coverage: 'partial' as const,
      location: 'Exclusion Criteria subsection',
      reference: 'EU MDR Annex XV, ISO 14155:2020 § 6.6.2'
    },
    {
      id: '4',
      name: 'Exclusion Criteria - Confounding Factors',
      description: 'Medical conditions that would confound endpoint assessment or interpretation',
      required: true,
      coverage: 'complete' as const,
      location: 'Exclusion Criteria subsection',
      reference: 'ISO 14155:2020 § 6.6.2'
    },
    {
      id: '5',
      name: 'Justification for Each Criterion',
      description: 'Scientific or safety rationale for each inclusion and exclusion criterion',
      required: true,
      coverage: 'missing' as const,
      reference: 'ISO 14155:2020 § 6.6.3'
    },
    {
      id: '6',
      name: 'Recruitment Feasibility Assessment',
      description: 'Analysis of target population prevalence and enrollment feasibility within study timeline',
      required: true,
      coverage: 'placeholder' as const,
      location: 'Currently: "[To be defined based on epidemiology data]"',
      reference: 'ISO 14155:2020 § 6.6.4'
    },
    {
      id: '7',
      name: 'Vulnerable Population Considerations',
      description: 'Special protections or exclusions for vulnerable subjects (pregnant women, children, decisionally impaired)',
      required: false,
      coverage: 'complete' as const,
      location: 'Exclusion Criteria subsection',
      reference: 'EU MDR Article 62(4)(k)'
    },
    {
      id: '8',
      name: 'Subject Withdrawal Rules',
      description: 'Conditions under which subjects may withdraw or be withdrawn by investigator',
      required: true,
      coverage: 'complete' as const,
      location: 'Withdrawal & Discontinuation subsection',
      reference: 'ISO 14155:2020 § 6.6.5'
    }
  ];

  // Example AI suggestions
  const aiSuggestions = [
    {
      id: 's1',
      type: 'missing-element' as const,
      priority: 'high' as const,
      title: 'Missing: Justification for Each Criterion',
      description: 'ISO 14155:2020 § 6.6.3 requires explicit justification (scientific, safety, or feasibility rationale) for each inclusion and exclusion criterion. Current draft lists criteria but does not explain why each is necessary.',
      location: 'Section 4.5: Subject Eligibility Criteria',
      rationale: 'Regulatory inspectors and ethics committees require clear rationale to assess whether criteria appropriately balance scientific objectives, subject safety, and enrollment feasibility. Missing justifications are a common audit finding.',
      reference: 'ISO 14155:2020 § 6.6.3; EU MDR Article 62(4)(f)',
      suggestedText: 'Age ≥65 years [Rationale: Target population reflects typical aortic stenosis epidemiology and aligns with device intended use for elderly patients at intermediate surgical risk]. Severe aortic stenosis (AVA ≤1.0 cm² or indexed ≤0.6 cm²/m²) [Rationale: Disease severity threshold ensures clinical benefit outweighs intervention risk per current clinical guidelines].'
    },
    {
      id: 's2',
      type: 'consistency' as const,
      priority: 'high' as const,
      title: 'Inconsistency: Sample Size vs. Enrollment Feasibility',
      description: 'Section 4.5 inclusion/exclusion criteria may yield insufficient recruitment pool to meet N=120 target in Section 4.8 within stated 6-month enrollment period.',
      location: 'Inclusion Criteria → Sample Size Calculation cross-reference',
      rationale: 'Current criteria (age ≥65, intermediate risk STS 4-8%, specific anatomical requirements) are restrictive. Based on typical site enrollment rates for TAVR trials, 8 sites would need ~15 subjects each in 6 months. Feasibility assessment placeholder must be replaced with actual epidemiology data or timeline extended.',
      reference: 'Cross-reference: Section 4.8 Sample Size Justification'
    },
    {
      id: 's3',
      type: 'regulatory' as const,
      priority: 'medium' as const,
      title: 'Clarification Needed: LVEF <30% Exclusion vs. IFU',
      description: 'Exclusion criterion "LVEF <30%" should be explicitly cross-referenced to device IFU contraindications to demonstrate regulatory alignment.',
      location: 'Exclusion Criteria subsection',
      rationale: 'EU MDR Article 62 requires protocol eligibility criteria to align with device intended use and contraindications. If LVEF <30% is an IFU contraindication, this should be stated. If it is a study-specific exclusion, rationale must be provided.',
      reference: 'EU MDR Annex XV Section 2.3.1; Device IFU Section 4.2',
      suggestedText: 'LVEF <30% (per device IFU contraindication: insufficient left ventricular function increases risk of hemodynamic compromise during valve deployment)'
    },
    {
      id: 's4',
      type: 'clarification' as const,
      priority: 'low' as const,
      title: 'Consider Adding: Geographic/Ethnic Diversity Statement',
      description: 'While not strictly required, many ethics committees expect a statement on efforts to ensure representative enrollment across ethnic and socioeconomic groups.',
      location: 'End of Section 4.5 or Recruitment Strategy',
      rationale: 'EU MDR encourages equitable access and representative clinical data. A brief statement (e.g., "Sites will make reasonable efforts to ensure diverse enrollment reflective of regional demographics") demonstrates proactive consideration.',
      reference: 'EU MDR Article 62(4)(g) - Patient considerations'
    }
  ];

  const handleAcceptSuggestion = (id: string) => {
    console.log('Accepted suggestion:', id);
    alert(`Suggestion "${id}" accepted. In production, this would:\n1. Log the action to audit trail\n2. Insert suggested text at cursor or marked location\n3. Mark as "user-edited" (AI marker removed)\n4. Create a new version entry`);
  };

  const handleDismissSuggestion = (id: string) => {
    console.log('Dismissed suggestion:', id);
    alert(`Suggestion "${id}" dismissed. In production, this would:\n1. Log dismissal to audit trail\n2. Remove suggestion from active list\n3. Record user decision for future reference`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            AI-Assisted Protocol Creation Demo
          </h1>
          <p className="text-sm text-slate-600">
            Demonstration of AI features for Section 4.5: Subject Eligibility Criteria
          </p>
        </div>

        {/* AI Source Traceability */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            1. AI Source Traceability
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Every AI-generated section shows exactly which approved documents were used as sources. 
            This ensures full traceability and allows users to verify content against upstream inputs.
          </p>
          <AISourceReference 
            sources={aiSources}
            generatedDate="2026-02-07 10:15:42 CET"
            aiVersion="Protocol-AI-v2.3.1"
          />
        </div>

        {/* Required Elements Coverage */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            2. Required Elements Coverage Checker
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            AI continuously analyzes content to identify which regulatory requirements are met, 
            partially addressed, or missing. This ensures completeness before submission.
          </p>
          <RequiredElementsChecker 
            sectionId="4.5"
            sectionTitle="Subject Eligibility Criteria"
            elements={requiredElements}
          />
        </div>

        {/* AI Suggestions */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            3. Continuous AI Suggestions
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            As you work, AI provides non-intrusive suggestions for missing elements, consistency issues, 
            and regulatory improvements. You decide whether to accept, modify, or dismiss each suggestion.
          </p>
          <AISuggestions 
            suggestions={aiSuggestions}
            onAccept={handleAcceptSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        </div>

        {/* Inline Issue Markers */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            4. Inline Issue Markers
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Issues and warnings are anchored to specific text locations. Click or hover for details.
          </p>
          <div className="border border-slate-200 rounded p-4 bg-slate-50">
            <div className="text-xs font-medium text-slate-900 mb-2">EXAMPLE: Inclusion Criteria Text</div>
            <div className="text-sm text-slate-700 leading-relaxed">
              <p className="mb-2">Subjects must meet all of the following criteria:</p>
              <p className="bg-red-50/30 border-l-2 border-red-500 pl-2 py-1">
                Age ≥65 years. Severe aortic stenosis defined as aortic valve area ≤1.0 cm². 
                Symptomatic disease (NYHA class II or III). Intermediate surgical risk (STS-PROM 4-8%).
                <InlineIssueMarker 
                  issue={{
                    id: 'blocker-1',
                    severity: 'blocker',
                    subsection: 'Inclusion Criteria & Sample Size Alignment',
                    description: 'Enrollment feasibility concern: Current criteria may not support N=120 target within 6-month timeline. Epidemiology data required or timeline extension needed.',
                    reference: 'Cross-reference: Section 4.8 Sample Size',
                    raisedBy: 'System Consistency Check',
                    raisedDate: '2026-02-07 14:20',
                    status: 'open'
                  }}
                />
              </p>
            </div>
          </div>
        </div>

        {/* Human Decision Loop */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            5. Human Decision Loop
          </h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="font-medium text-green-900">Humans May:</div>
                <ul className="text-xs text-green-800 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Edit any AI-generated text</li>
                  <li>Accept, modify, or reject AI suggestions</li>
                  <li>Resolve issues after making changes</li>
                  <li>Approve or lock sections</li>
                  <li>Override all AI assessments</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✗
              </div>
              <div>
                <div className="font-medium text-red-900">AI May NOT:</div>
                <ul className="text-xs text-red-800 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Auto-edit protocol content</li>
                  <li>Close or resolve issues</li>
                  <li>Approve sections</li>
                  <li>Mark sections as complete</li>
                  <li>Lock content</li>
                  <li>Override human decisions</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                AI
              </div>
              <div>
                <div className="font-medium text-blue-900">AI May:</div>
                <ul className="text-xs text-blue-800 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Generate initial drafts from approved sources</li>
                  <li>Identify missing required elements</li>
                  <li>Detect cross-section inconsistencies</li>
                  <li>Suggest text improvements</li>
                  <li>Flag regulatory risks</li>
                  <li>Assess completeness (advisory only)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            6. Complete Audit Trail
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            All AI and human actions are fully logged for inspection readiness.
          </p>
          <div className="space-y-2 text-xs font-mono bg-slate-900 text-green-400 p-4 rounded">
            <div>[2026-02-07 10:15:42 CET] AI_SYSTEM: Draft generated for Section 4.5</div>
            <div className="ml-4">└─ Sources: Synopsis v1.2, Intended Use v1.0, ISO 14155:2020</div>
            <div className="ml-4">└─ Model: Protocol-AI-v2.3.1</div>
            <div className="ml-4">└─ Status: Awaiting human review</div>
            <div>[2026-02-07 10:30:18 CET] AI_SYSTEM: Consistency check completed</div>
            <div className="ml-4">└─ Issue raised: Blocker #REF-4.5-001 (Sample size feasibility)</div>
            <div>[2026-02-07 11:15:33 CET] USER: Dr. Marcus Rivera edited content</div>
            <div className="ml-4">└─ Field: Inclusion Criteria</div>
            <div className="ml-4">└─ Change: Added Heart Team consensus requirement</div>
            <div className="ml-4">└─ AI marker removed (human ownership transferred)</div>
            <div>[2026-02-07 11:16:05 CET] AI_SYSTEM: Suggestion generated</div>
            <div className="ml-4">└─ Suggestion #S-4.5-003: Add criterion justifications</div>
            <div>[2026-02-07 11:20:22 CET] USER: Dr. Marcus Rivera accepted suggestion</div>
            <div className="ml-4">└─ Suggestion #S-4.5-003 applied (user-modified)</div>
            <div className="ml-4">└─ Audit: User responsible for final content</div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-700 rounded-lg p-6 text-white">
          <h2 className="text-lg font-semibold mb-4">
            AI-Assisted Protocol Creation: Key Principles
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium mb-2">✓ AI Provides:</div>
              <ul className="space-y-1 text-blue-100 text-xs">
                <li>• Initial drafts from approved sources</li>
                <li>• Continuous completeness checking</li>
                <li>• Cross-section consistency validation</li>
                <li>• Regulatory requirement guidance</li>
                <li>• Non-intrusive suggestions</li>
                <li>• Full source traceability</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">✓ Humans Retain:</div>
              <ul className="space-y-1 text-blue-100 text-xs">
                <li>• Full editing control</li>
                <li>• Decision authority</li>
                <li>• Approval responsibility</li>
                <li>• Issue resolution power</li>
                <li>• Override capability</li>
                <li>• 100% accountability</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/10 rounded border border-white/20">
            <div className="text-sm font-medium mb-1">Regulatory Compliance:</div>
            <div className="text-xs text-blue-100">
              All AI features comply with ISO 14155:2020, EU MDR Article 62, and 21 CFR Part 11 
              requirements for electronic records and signatures. AI is a tool, never a substitute 
              for qualified personnel.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
