import { BadGatewayException } from '@nestjs/common';
import { validateAiResponse } from './ai-response-contract';

const sectionAnalysis = (severity: unknown) => ({
  issues: [{
    id: 'finding', severity, subsection: 'Design', description: 'Finding',
    requirement: 'Follow-up', source: null, targetSection: null, remediation: null, requirementId: null,
    raisedBy: 'AI Regulatory Review', raisedDate: '2026-09-29',
    status: 'open', dueDate: '7 days', textQuote: null,
  }],
  requiredElements: [],
  satisfiedRequirements: [],
});

describe('protocol analysis severity contract', () => {
  it('accepts the documented response without an internal requirement ID', () => {
    const response: any = sectionAnalysis('warning');
    delete response.issues[0].requirementId;
    expect(validateAiResponse('/v1/ai/analyze-section', response)).toEqual(response);
  });
  it('accepts a non-requirement finding with an explicit null requirement', () => {
    const response: any = sectionAnalysis('warning');
    response.issues[0].requirement = null;
    expect(validateAiResponse('/v1/ai/analyze-section', response)).toEqual(response);
  });
  it.each([undefined, '', ' ', 1, {}, ['Follow-up']])('rejects an invalid requirement field %p', requirement => {
    const response: any = sectionAnalysis('warning');
    response.issues[0].requirement = requirement;
    expect(() => validateAiResponse('/v1/ai/analyze-section', response)).toThrow(BadGatewayException);
  });
  it('accepts satisfied requirements and preserves attachment evidence', () => {
    const response = { ...sectionAnalysis('warning'), satisfiedRequirements: [{
      name: 'Follow-up schedule', status: 'satisfied', source: 'attachment',
      sourceName: 'PMCF Plan', evidence: 'Visits are scheduled at 30 days.',
    }] };
    expect(validateAiResponse('/v1/ai/analyze-section', response)).toEqual(response);
  });
  it.each(['unknown', null, 1])('rejects an invalid satisfied requirement source %p', source => {
    const response = { ...sectionAnalysis('warning'), satisfiedRequirements: [{
      name: 'Follow-up', status: 'satisfied', source, sourceName: null, evidence: 'Schedule',
    }] };
    expect(() => validateAiResponse('/v1/ai/analyze-section', response)).toThrow(BadGatewayException);
  });
  it.each(['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required'])(
    'accepts %s without conversion', severity => {
      const response = sectionAnalysis(severity);
      expect(validateAiResponse('/v1/ai/analyze-section', response)).toEqual(response);
    },
  );

  it.each([undefined, null, '', 'info', 'high', 'Blocker', ' warning ', 'cross-reference', 1, {}, ['warning']])(
    'rejects invalid AI severity %p', severity => {
      expect(() => validateAiResponse('/v1/ai/analyze-section', sectionAnalysis(severity)))
        .toThrow(BadGatewayException);
    },
  );
});
