import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { acceptedRequirementsText } from '../projects/project-generation-context';
import { acceptedFindingRequirements, findingRequirementsText } from '../projects/finding-requirements';
import { validateAiResponse } from './ai-response-contract';
import type { ResultSuggestion, SuggestResultDto } from '../results/dto';
import { logGenerateProtocolRequest } from '../../common/analysis-request-logger';

export const PROTOCOL_SECTION_TITLES = [
  'Protocol Overview',
  'Study Rationale & Objectives',
  'Device Description & Intended Clinical Use',
  'Study Design',
  'Subject Eligibility Criteria',
  'Study Procedures & Assessments',
  'Safety Monitoring & Reporting',
  'Statistical Considerations',
  'Ethics & Regulatory Considerations',
];

@Injectable()
export class AiService {
  private readonly baseUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
  private readonly token = process.env.AI_SERVICE_TOKEN || '';

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private throwRemoteError(status: number, payload: any): never {
    const message = payload?.message || payload?.detail || `AI service returned HTTP ${status}`;
    if (status === 503) throw new ServiceUnavailableException(message);
    if (status === 504) throw new GatewayTimeoutException(message);
    if (status === 500) throw new InternalServerErrorException(message);
    throw new HttpException(message, status);
  }

  private async fetchAiService(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, init);
    } catch {
      throw new ServiceUnavailableException(
        'The AI service is unavailable. Please try again in a moment.',
      );
    }
  }

  // Synopsis/scope/protocol opt in; report operations retain their current contract.
  private async post<T>(path: string, body: unknown, validateResponse = false): Promise<T> {
    const response = await this.fetchAiService(path, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload: any = null;
    if (text) {
      try { payload = JSON.parse(text); } catch {
        if (response.ok && validateResponse) throw new BadGatewayException('AI service returned malformed JSON.');
        payload = text;
      }
    }

    if (!response.ok) this.throwRemoteError(response.status, payload);
    return validateResponse ? validateAiResponse<T>(path, payload) : payload as T;
  }

  async analyzeSynopsis(text: string, targetMarkets: string[] = []): Promise<any[]> {
    return this.post('/v1/ai/analyze-synopsis', { text, targetMarkets }, true);
  }

  async suggestResult(input: SuggestResultDto, sections: { key: string; title: string }[]): Promise<ResultSuggestion> {
    return this.post('/v1/ai/suggest-result', { ...input, sections }, true);
  }

  async deriveScopeFromSynopsis(text: string): Promise<{ deviceCategory: string; intendedUse: string; confidence: 'high' | 'medium' | 'low' }> {
    return this.post('/v1/ai/derive-scope-from-synopsis', { text }, true);
  }

  async analyzeScope(clientPrompt: string): Promise<any[]> {
    return this.post('/v1/ai/analyze-scope', { clientPrompt }, true);
  }

  async generateProtocolSection(
    sectionTitle: string,
    projectData: any,
    synopsis: string,
    scope: any,
    additionalFixes?: string,
  ): Promise<string> {
    return this.post('/v1/ai/generate-protocol-section', {
      sectionTitle,
      projectData,
      synopsis,
      scope: { ...scope, requirements: acceptedRequirementsText(scope?.requirements) },
      additionalFixes,
    }, true);
  }

  async mapInBatches<T, R>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<R>,
    onItemDone?: (item: T) => void,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      results.push(...await Promise.all(batch.map(async item => {
        const result = await fn(item);
        onItemDone?.(item);
        return result;
      })));
    }
    return results;
  }

  async generateProtocol(
    projectData: any,
    roles: any[],
    synopsis: string,
    scope: any,
    onSectionDone?: (title: string) => void,
  ): Promise<any> {
    const requirements = acceptedFindingRequirements(scope?.requirements);
    scope = {
      ...scope,
      requirements,
      findingRequirements: findingRequirementsText(scope?.requirements),//"[{\"id\":\"REQ-1\",\"title\":\"ISO 14155\",\"accepted\":true}]"
    };
    const request = { projectData, roles, synopsis, scope };
    const endpoint = onSectionDone ? '/v1/ai/generate-protocol/stream' : '/v1/ai/generate-protocol';
    await logGenerateProtocolRequest({ endpoint, request });
    if (!onSectionDone) {
      return this.post(endpoint, request, true);
    }

    const response = await this.fetchAiService(endpoint, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      let payload: any = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
      this.throwRemoteError(response.status, payload);
    }
    if (!response.body) throw new BadGatewayException('AI service returned an empty stream.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = undefined;

    const processLine = (line: string) => {
      if (!line.trim()) return;
      let event: any;
      try { event = JSON.parse(line); } catch {
        throw new BadGatewayException('AI service returned an invalid protocol stream.');
      }
      if (!event || typeof event !== 'object') throw new BadGatewayException('AI service returned an invalid protocol stream.');
      if (event.type === 'sectionDone') {
        if (typeof event.title !== 'string') throw new BadGatewayException('AI service returned an invalid section title.');
        onSectionDone(event.title);
        return;
      }
      if (event.type === 'result') {
        finalResult = validateAiResponse('/v1/ai/generate-protocol', event.data);
        return;
      }
      if (event.type === 'error') {
        this.throwRemoteError(event.statusCode || 500, event);
      }
      throw new BadGatewayException('AI service returned an unknown protocol stream event.');
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          processLine(line);
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) processLine(buffer);
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }

    if (finalResult === undefined) {
      throw new BadGatewayException('AI service stream ended without a final protocol result.');
    }
    return finalResult;
  }

  async generateRequiredElements(sectionTitle: string, targetMarkets: string[], deviceCategory: string, intendedUse: string): Promise<any[]> {
    return this.post('/v1/ai/generate-required-elements', {
      sectionTitle,
      targetMarkets,
      deviceCategory,
      intendedUse,
    }, true);
  }

  async analyzeSection(
    sectionTitle: string,
    sectionContent: string,
    targetMarkets: string[],
    deviceCategory: string,
    intendedUse: string,
    requiredElements?: any[],
    amendmentContext?: { number: number; title: string; reason: string; description: string } | null,
    crossSectionContext?: { title: string; content: string }[],
    acceptedRequirements?: { name: string; description: string }[],
    protocolAttachments: { name: string; content: string; requirement: string }[] = [],
  ): Promise<any> {
    return this.post('/v1/ai/analyze-section', {
      sectionTitle,
      sectionContent,
      targetMarkets,
      deviceCategory,
      intendedUse,
      requiredElements,
      amendmentContext,
      crossSectionContext,
      acceptedRequirements,
      protocolAttachments,
    }, true);
  }

  async checkFindingDocument(body: { issue: any; requirement: any; section: any; document: any }): Promise<{ status: 'satisfied' | 'warning' | 'blocker'; reason: string }> {
    const result = await this.post<{
      outcome: 'resolves' | 'partially_resolves' | 'does_not_resolve'; explanation: string;
    }>('/v1/ai/check-protocol-attachments', {
      issue: body.issue.description,
      requirement: body.requirement.title,
      attachments: [{ name: body.document.label, content: body.document.extractedText }],
    }, true);
    const statuses = { resolves: 'satisfied', partially_resolves: 'warning', does_not_resolve: 'blocker' } as const;
    return { status: statuses[result.outcome], reason: result.explanation };
  }

  async generateReportSection(
    sectionTitle: any,
    sectionNumber: any,
    protocolSections: any[],
    synopsis: any,
    scope: any,
    projectData: any,
    roles: any[],
    existingReportSections: any[],
  ): Promise<string> {
    return this.post('/v1/ai/generate-report-section', {
      sectionTitle,
      sectionNumber,
      protocolSections,
      synopsis,
      scope,
      projectData,
      roles,
      existingReportSections,
    });
  }

  async analyzeReportSection(
    sectionTitle: string,
    sectionContent: string,
    targetMarkets: string[],
    deviceCategory: string,
    intendedUse: string,
    appendicesList?: string[],
    amendmentContext?: { number: number; title: string; reason: string; description: string } | null,
    acceptedRequirements?: string,
  ): Promise<any> {
    return this.post('/v1/ai/analyze-report-section', {
      sectionTitle,
      sectionContent,
      targetMarkets,
      deviceCategory,
      intendedUse,
      appendicesList,
      amendmentContext,
      acceptedRequirements,
    });
  }

  // Kept synchronous to preserve the original NestJS caller contract.
  // The identical implementation also exists in the AI service and is exposed over REST,
  // but making this adapter method remote would force existing callers to add await.
  validateStatisticalValues(sectionContent: string, sectionTitle: string): { issues: { description: string; severity: 'blocker' | 'warning'; location: string }[] } {
    const issues: { description: string; severity: 'blocker' | 'warning'; location: string }[] = [];

    if (!sectionContent || typeof sectionContent !== 'string') return { issues };

    const text = sectionContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

    const pValueMatches = [...text.matchAll(/p\s*[=<>]\s*([\d.]+)/gi)];
    pValueMatches.forEach(match => {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) {
        if (val < 0 || val > 1) {
          issues.push({
            severity: 'blocker',
            description: `Invalid p-value: ${match[0]} — p-values must be between 0 and 1.`,
            location: match[0],
          });
        }
        if (val > 0.5 && text.toLowerCase().includes('significant')) {
          issues.push({
            severity: 'warning',
            description: `Possible inconsistency: p=${val} but section claims statistical significance (typically p<0.05).`,
            location: match[0],
          });
        }
      }
    });

    const percentMatches = [...text.matchAll(/([\d.]+)\s*%/g)];
    percentMatches.forEach(match => {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && (val < 0 || val > 100)) {
        issues.push({
          severity: 'blocker',
          description: `Invalid percentage: ${match[0]} — percentages must be between 0 and 100.`,
          location: match[0],
        });
      }
    });

    const ciMatches = [...text.matchAll(/\(?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)?(?:\s*(?:95%|90%|99%)?\s*(?:CI|confidence interval))?/gi)];
    ciMatches.forEach(match => {
      const lower = parseFloat(match[1]);
      const upper = parseFloat(match[2]);
      if (!isNaN(lower) && !isNaN(upper) && lower > upper) {
        issues.push({
          severity: 'blocker',
          description: `Invalid confidence interval: lower bound (${lower}) exceeds upper bound (${upper}).`,
          location: match[0],
        });
      }
    });

    const totalMatch = text.match(/(?:total|n\s*=\s*|enrolled|randomized)\s*[:\s]?\s*(\d+)\s*(?:subjects|patients|participants)/i);
    if (totalMatch) {
      const total = parseInt(totalMatch[1]);
      const groupMatches = [...text.matchAll(/(?:group|arm|treatment|control)[^.]*?n\s*=\s*(\d+)/gi)];
      if (groupMatches.length >= 2) {
        const groupSum = groupMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
        if (Math.abs(groupSum - total) > 2 && groupSum > 0) {
          issues.push({
            severity: 'warning',
            description: `Sample size arithmetic inconsistency: group sizes sum to ${groupSum} but total stated as ${total}.`,
            location: totalMatch[0],
          });
        }
      }
    }

    const powerMatch = text.match(/(?:power|1\s*-\s*β)\s*(?:of|=|:)?\s*([\d.]+)%?/i);
    if (powerMatch) {
      const power = parseFloat(powerMatch[1]) / (parseFloat(powerMatch[1]) > 1 ? 100 : 1);
      if (power < 0.7 || power > 0.99) {
        issues.push({
          severity: 'warning',
          description: `Unusual statistical power: ${powerMatch[0]} — typical range is 80-90% per ISO 14155:2020.`,
          location: powerMatch[0],
        });
      }
    }

    return { issues };
  }

  async checkStatisticalConsistency(
    statisticalMethodsContent: string,
    resultsContent: string,
    targetMarkets: string[],
  ): Promise<{ issues: { description: string; severity: 'blocker' | 'warning' }[] }> {
    return this.post('/v1/ai/check-statistical-consistency', {
      statisticalMethodsContent,
      resultsContent,
      targetMarkets,
    });
  }

  async checkCrossConsistency(
    protocolSections: { title: string; content: string }[],
    reportSections: { title: string; content: string }[],
    targetMarkets: string[],
    deviceCategory: string,
  ): Promise<{ issues: { section1: string; section2: string; description: string; severity: 'blocker' | 'warning' }[] }> {
    return this.post('/v1/ai/check-cross-consistency', {
      protocolSections,
      reportSections,
      targetMarkets,
      deviceCategory,
    });
  }

  async checkSynopsisConsistency(
    synopsisText: string,
    protocolSections: { title: string; content: string }[],
  ): Promise<{ issues: { description: string; severity: 'blocker' | 'warning' }[] }> {
    return this.post('/v1/ai/check-synopsis-consistency', { synopsisText, protocolSections }, true);
  }
}
