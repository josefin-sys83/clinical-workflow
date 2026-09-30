import { BadGatewayException } from '@nestjs/common';
import { validateAiResponse } from './ai-response-contract';

const sectionAnalysis = (severity: unknown) => ({
  issues: [{
    id: 'finding', severity, subsection: 'Design', description: 'Finding',
    source: null, targetSection: null, remediation: null,
    raisedBy: 'AI Regulatory Review', raisedDate: '2026-09-29',
    status: 'open', dueDate: '7 days', textQuote: null,
  }],
  requiredElements: [],
});

describe('protocol analysis severity contract', () => {
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
