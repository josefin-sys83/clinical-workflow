import { BadRequestException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { DocumentWorkflowService } from './document-workflow.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

describe('DocumentWorkflowService.assertProtocolEditable', () => {
  const query = jest.fn();
  let state: string;
  const service = new DocumentWorkflowService({
    getSnapshot: async () => ({ steps: { 'protocol-pdf': { state } } }),
  } as any);

  beforeEach(() => {
    query.mockReset();
    (getPool as jest.Mock).mockReturnValue({ query });
  });

  it('allows edits before signing without checking amendments', async () => {
    state = 'approved';
    await expect(service.assertProtocolEditable('p', 's1')).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it('blocks edits while out for signature, even under an amendment', async () => {
    state = 'signed';
    await expect(service.assertProtocolEditable('p', 's1')).rejects.toThrow(/out for signature/);
    expect(query).not.toHaveBeenCalled();
  });

  it('allows a finalized section covered by an approved amendment', async () => {
    state = 'final';
    query.mockResolvedValue({ rows: [{}] });
    await expect(service.assertProtocolEditable('p', 's1')).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('s.section_key = $2'), ['p', 's1']);
  });

  it('blocks a finalized section without an open amendment', async () => {
    state = 'final';
    query.mockResolvedValue({ rows: [] });
    const result = service.assertProtocolEditable('p', 's2');
    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.assertProtocolEditable('p', 's2')).rejects.toThrow(/Use an amendment/);
  });

  it('allows whole-protocol saves only while an approved amendment is open', async () => {
    state = 'final';
    query.mockResolvedValueOnce({ rows: [{}] });
    await expect(service.assertProtocolEditable('p')).resolves.toBeUndefined();
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("a.status = 'approved'"), ['p']);
    query.mockResolvedValueOnce({ rows: [] });
    await expect(service.assertProtocolEditable('p')).rejects.toBeInstanceOf(BadRequestException);
  });
});
