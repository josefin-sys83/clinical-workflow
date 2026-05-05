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
    const prompt = `You are a MedTech regulatory expert. Analyze this clinical study synopsis and check each of the 15 criteria below.

Synopsis text:
${text.slice(0, 8000)}

Check these 15 criteria and return ONLY a JSON array:
1. Study rationale defined
2. Study objectives stated
3. Target population defined
4. Study design described
5. Primary endpoints defined
6. High-level methodology described
7. Study scope defined
8. Key assumptions documented
9. Regulatory context identified
10. Intended use stated
11. Feasibility considerations addressed
12. Internal consistency verified
13. No feasibility blockers identified
14. Sample size justified
15. Statistical analysis plan mentioned

Return ONLY a JSON array like: [{"criterion": "Study rationale defined", "status": "complete"|"missing", "reason": "..."}]
No markdown, no explanation.`;

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

  async generateRequiredElements(sectionTitle: string, targetMarkets: string[], deviceCategory: string, intendedUse: string): Promise<any[]> {
    const markets = targetMarkets.join(', ');
    const prompt = `You are a MedTech regulatory expert. Generate required elements for this protocol section.

Section: ${sectionTitle}
Target Markets: ${markets}
Device Category: ${deviceCategory}
Intended Use: ${intendedUse}

Return ONLY a JSON array of 4-6 required elements specific to these markets and device type:
[
  {"id":"re-1","name":"element name","reference":"ISO 14155:2020 § X.X","status":"missing"}
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

  async analyzeSection(sectionTitle: string, sectionContent: string, targetMarkets: string[], requiredElements?: any[]): Promise<any> {
    const markets = targetMarkets.join(', ') || 'EU';
    const elementsText = requiredElements && requiredElements.length > 0
      ? `\nRequired elements to check:\n${requiredElements.map((e: any) => `- ${e.name} (${e.reference})`).join('\n')}`
      : '';

    const prompt = `You are a MedTech regulatory expert reviewing a clinical investigation protocol section.

Section: ${sectionTitle}
Target Markets: ${markets}
${elementsText}

Content:
${sectionContent.slice(0, 4000)}

Return ONLY this JSON:
{
  "issues": [
    {
      "id": "i-1",
      "severity": "blocker|warning",
      "subsection": "part with issue",
      "description": "what needs fixing",
      "reference": "ISO 14155:2020 § X",
      "raisedBy": "AI Regulatory Review",
      "raisedDate": "${new Date().toISOString().slice(0,10)}",
      "status": "open",
      "dueDate": "7 days",
      "textQuote": "exact phrase from the content that is problematic, or null if issue is about missing content"
    }
  ],
  "requiredElements": [
    {"id": "re-1", "name": "element name", "reference": "reference", "status": "complete|partial|missing"}
  ]
}

Max 3 issues. For issues where the problem EXISTS in the text, set textQuote to the exact phrase. For missing content issues set textQuote to null.
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