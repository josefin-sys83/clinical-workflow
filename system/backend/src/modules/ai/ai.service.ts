import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  private readonly deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  private readonly apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  private readonly apiKey = process.env.AZURE_OPENAI_API_KEY;

  private async callAI(prompt: string, maxTokens = 2000): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey || '',
    };
    const response = await fetch(
      `${this.endpoint}openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      }
    );
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async analyzeSynopsis(text: string): Promise<any[]> {
    const prompt = `You are a MedTech regulatory expert. Analyze this clinical study synopsis and check each of the 14 criteria below.

Synopsis text:
${text.slice(0, 8000)}

Check these 14 criteria and return ONLY a JSON array. Each object MUST include the "id" field exactly as shown:
{"id":"2","criterion":"Study rationale defined","status":"complete"|"missing","reason":"..."}
{"id":"3","criterion":"Study objectives stated","status":"complete"|"missing","reason":"..."}
{"id":"4","criterion":"Target population described","status":"complete"|"missing","reason":"..."}
{"id":"5","criterion":"Study design identified","status":"complete"|"missing","reason":"..."}
{"id":"6","criterion":"Primary endpoint(s) defined","status":"complete"|"missing","reason":"..."}
{"id":"7","criterion":"High-level methodology described","status":"complete"|"missing","reason":"..."}
{"id":"8","criterion":"Study scope defined","status":"complete"|"missing","reason":"..."}
{"id":"9","criterion":"Key assumptions documented","status":"complete"|"missing","reason":"..."}
{"id":"10","criterion":"Regulatory context stated","status":"complete"|"missing","reason":"..."}
{"id":"11","criterion":"Intended use context aligned","status":"complete"|"missing","reason":"..."}
{"id":"12","criterion":"High-level feasibility considerations present","status":"complete"|"missing","reason":"..."}
{"id":"13","criterion":"No obvious feasibility blockers identified","status":"complete"|"missing","reason":"..."}
{"id":"14","criterion":"Internal consistency verified","status":"complete"|"missing","reason":"..."}
{"id":"15","criterion":"Key sections identifiable for downstream use","status":"complete"|"missing","reason":"..."}

Return ONLY the JSON array. No markdown, no explanation.`;

    const result = await this.callAI(prompt, 3000);
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return [];
    }
  }

  async analyzeScope(prompt: string): Promise<any[]> {
    const result = await this.callAI(prompt, 2000);
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return [];
    }
  }

  async generateProtocolSection(sectionTitle: string, projectData: any, synopsis: string, scope: any): Promise<string> {
    const targetMarkets = (projectData?.targetMarkets || []).join(', ');
    const deviceCategory = scope?.deviceCategory || '';
    const intendedUse = scope?.intendedUse || '';

    const prompt = `You are a MedTech regulatory expert writing a clinical investigation protocol for regulatory submission.

Project: ${projectData?.projectName || ''}
Device: ${projectData?.deviceName || ''}
Sponsor: ${projectData?.sponsor || ''}
Indication: ${projectData?.indication || ''}
Target Markets: ${targetMarkets}
Device Category: ${deviceCategory}
Intended Use: ${intendedUse}
Synopsis: ${synopsis.slice(0, 1500)}

Write the complete "${sectionTitle}" section for this clinical investigation protocol.

Requirements:
- Write 300-500 words of detailed, specific content
- Use professional regulatory language suitable for EU MDR submission
- Include specific details relevant to the device, indication and markets
- Reference applicable standards and regulations where appropriate (ISO 14155, EU MDR, etc.)
- Be specific to this device and indication - avoid generic placeholder text
- Write in paragraph format with subsections where appropriate

Return ONLY the section text content, no JSON, no markdown headers, no preamble.`;

    return await this.callAI(prompt, 2000);
  }

  async generateProtocol(projectData: any, roles: any[], synopsis: string, scope: any): Promise<any> {
    const sectionTitles = [
      'Protocol Overview',
      'Study Rationale & Objectives',
      'Device Description & Intended Clinical Use',
      'Study Design',
      'Subject Eligibility Criteria',
      'Study Procedures & Assessments',
      'Safety Monitoring & Reporting',
      'Statistical Considerations',
      'Ethics & Regulatory Considerations'
    ];

    const contents = await Promise.all(
      sectionTitles.map(title => this.generateProtocolSection(title, projectData, synopsis, scope))
    );

    const sections = sectionTitles.map((title, i) => ({
      id: String(i + 1),
      title,
      content: contents[i].trim(),
      status: 'draft'
    }));

    return {
      protocolId: `CIP-${new Date().getFullYear()}-MED-${Math.floor(Math.random()*9000)+1000}`,
      sections
    };
  }

  private getSectionRequirements(sectionTitle: string): { required: string; forbidden: string } {
    const map: Record<string, { required: string; forbidden: string }> = {
      'Protocol Overview': {
        required: 'Study title, sponsor name, brief study objectives, brief study design summary, device name, and cross-references to other protocol sections.',
        forbidden: 'Do NOT flag missing statistical methods, risk management plans, data protection details, AE definitions, or eligibility criteria — those belong in dedicated sections.',
      },
      'Study Rationale & Objectives': {
        required: 'Scientific rationale for the study, primary endpoint with measurable definition, secondary endpoints, and the study hypothesis.',
        forbidden: 'Do not flag missing device specifications, study procedures, or statistical analysis details.',
      },
      'Device Description & Intended Clinical Use': {
        required: 'Device name and model, regulatory classification per each target market (e.g. EU MDR class, FDA device class), intended use statement, contraindications, and key device specifications.',
        forbidden: 'Do not flag missing study design details, eligibility criteria, or statistical methods.',
      },
      'Study Design': {
        required: 'Study type (e.g. prospective, single-arm, observational), total study duration, planned number of subjects, number of investigational sites, follow-up period, and a visit schedule overview.',
        forbidden: 'Do not flag missing statistical analysis methods, eligibility criteria lists, or device specifications.',
      },
      'Subject Eligibility Criteria': {
        required: 'Inclusion criteria list, exclusion criteria list, screening procedures, and recruitment feasibility considerations.',
        forbidden: 'Do not flag missing study procedures, safety monitoring details, or statistical methods.',
      },
      'Study Procedures & Assessments': {
        required: 'Visit schedule with timepoints, clinical assessments performed at each visit, any laboratory procedures, and how primary and secondary endpoints are measured.',
        forbidden: 'Do not flag missing eligibility criteria, statistical analysis details, or ethics committee information.',
      },
      'Safety Monitoring & Reporting': {
        required: 'AE and SAE definitions per ISO 14155, reporting timelines for SAEs, safety monitoring committee or DSMB charter, stopping rules, and integration with risk management per EU MDR Annex XV (for EU markets).',
        forbidden: 'Do not flag missing statistical methods, eligibility criteria, or ethics committee details.',
      },
      'Statistical Considerations': {
        required: 'Sample size calculation with justification, primary statistical method, secondary endpoint analysis methods, normality testing approach, missing data handling strategy, and reference to a Statistical Analysis Plan (SAP).',
        forbidden: 'Do not flag missing eligibility criteria, study procedures, safety monitoring, or ethics details.',
      },
      'Ethics & Regulatory Considerations': {
        required: 'Ethics committee approval process, informed consent process and documentation, data protection per GDPR Article 32 (for EU markets) including encryption, pseudonymization methods, and breach notification procedures.',
        forbidden: 'Do not flag missing statistical methods, safety monitoring details, or device specifications.',
      },
    };
    return map[sectionTitle] ?? {
      required: `All content appropriate for a "${sectionTitle}" section of a clinical investigation protocol.`,
      forbidden: 'Do not flag content that clearly belongs in other sections.',
    };
  }

  async generateRequiredElements(sectionTitle: string, targetMarkets: string[], deviceCategory: string, intendedUse: string): Promise<any[]> {
    const markets = targetMarkets.join(', ');
    const { required } = this.getSectionRequirements(sectionTitle);
    const isEU = targetMarkets.includes('EU');
    const isUS = targetMarkets.includes('US');
    const regulatoryNote = [
      isEU && 'EU MDR 2017/745 and ISO 14155:2020 apply',
      isUS && 'FDA 21 CFR Part 812 (IDE) applies',
    ].filter(Boolean).join('; ');

    const prompt = `You are a MedTech regulatory expert. Generate required compliance elements for this specific protocol section.

Section: ${sectionTitle}
Target Markets: ${markets}${regulatoryNote ? `\nApplicable Regulations: ${regulatoryNote}` : ''}
Device Category: ${deviceCategory}
Intended Use: ${intendedUse}

This section must contain: ${required}

Return ONLY a JSON array of 4-6 required elements that are specific to this section, these markets, and this device type. Each element should map directly to something that must appear in this section.
[
  {"id":"re-1","name":"element name","reference":"ISO 14155:2020 § X.X or EU MDR Annex XV etc.","status":"missing"}
]

No markdown, no explanation, just the JSON array.`;

    const result = await this.callAI(prompt, 800);
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return [];
    }
  }

  async analyzeSection(sectionTitle: string, sectionContent: string, targetMarkets: string[], deviceCategory: string, intendedUse: string, requiredElements?: any[]): Promise<any> {
    const markets = targetMarkets.join(', ') || 'EU';
    const { required, forbidden } = this.getSectionRequirements(sectionTitle);
    const isEU = targetMarkets.includes('EU');
    const isUS = targetMarkets.includes('US');
    const regulatoryNote = [
      isEU && 'EU MDR 2017/745, ISO 14155:2020, and GDPR apply',
      isUS && 'FDA 21 CFR Part 812 (IDE) applies',
    ].filter(Boolean).join('; ');

    const elementsText = requiredElements && requiredElements.length > 0
      ? `\nRequired elements to verify:\n${requiredElements.map((e: any) => `- ${e.name} (${e.reference})`).join('\n')}`
      : '';

    const prompt = `You are a MedTech regulatory expert reviewing a clinical investigation protocol section.

Section being reviewed: "${sectionTitle}"
Target Markets: ${markets}${regulatoryNote ? `\nApplicable Regulations: ${regulatoryNote}` : ''}
Device Category: ${deviceCategory}
Intended Use: ${intendedUse}

What this section MUST contain: ${required}
${forbidden}
${elementsText}

Content to review:
${sectionContent.slice(0, 4000)}

IMPORTANT RULES:
- Only flag issues genuinely missing or incorrect in THIS specific section type.
- Apply market-specific requirements: EU MDR/ISO 14155 for EU, FDA 21 CFR 812 for US, GDPR for EU data protection.
- Do not flag content that belongs in other sections.
- Do not invent requirements not listed above for this section.

Return ONLY this JSON:
{
  "issues": [
    {
      "id": "i-1",
      "severity": "blocker|warning",
      "subsection": "part of the section with the issue",
      "description": "what specifically is missing or incorrect",
      "reference": "ISO 14155:2020 § X or EU MDR Annex XV etc.",
      "raisedBy": "AI Regulatory Review",
      "raisedDate": "${new Date().toISOString().slice(0, 10)}",
      "status": "open",
      "dueDate": "7 days",
      "textQuote": "exact phrase from the content that is problematic, or null if issue is about missing content"
    }
  ],
  "requiredElements": [
    {"id": "re-1", "name": "element name", "reference": "reference", "status": "complete|partial|missing"}
  ]
}

Max 3 issues. For problems that exist in the text set textQuote to the exact phrase. For missing content set textQuote to null.
No markdown, just the JSON.`;

    const result = await this.callAI(prompt, 1500);
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return { issues: [], requiredElements: [] };
    }
  }
}