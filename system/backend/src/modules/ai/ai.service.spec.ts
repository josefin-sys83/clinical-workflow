import { BadGatewayException } from '@nestjs/common';
import { AiService } from './ai.service';

describe('AiService synopsis analysis', () => {
  let service: AiService;

  beforeEach(() => {
    service = new AiService();
  });

  it('throws HTTP 502 when the AI response cannot be parsed', async () => {
    jest.spyOn(service as any, 'callAI').mockResolvedValue('This is not JSON');

    await expect(service.analyzeSynopsis('synopsis')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('preserves a successful analysis with no findings', async () => {
    jest.spyOn(service as any, 'callAI').mockResolvedValue('[]');

    await expect(service.analyzeSynopsis('synopsis')).resolves.toEqual([]);
  });

  it('throws HTTP 502 when scope requirements cannot be parsed', async () => {
    jest.spyOn(service as any, 'callAI').mockResolvedValue('{not-an-array:true}');

    await expect(service.analyzeScope('scope')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws HTTP 502 when protocol section findings cannot be parsed', async () => {
    jest.spyOn(service as any, 'callAI').mockResolvedValue('not JSON');

    await expect(service.analyzeSection('Study Design', 'substantial section content', ['EU'], 'active', 'monitoring')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
