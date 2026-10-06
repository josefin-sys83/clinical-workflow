import { getPool } from '../../db/pg';
import { WorkflowService } from './workflow.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

describe('WorkflowService request changes during signing', () => {
  const actor = { userId: 'signer', name: 'Signer' };
  let client: any;
  let audit: any;
  let service: WorkflowService;

  const mockState = (state: string, invalidated: any[]) => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('from workflow_steps')) return { rows: [{}] };
      if (sql.includes('from workflow_step_state')) return { rows: [{ state }] };
      if (sql.includes('from document_artifact')) return { rows: [] };
      if (sql.includes('update protocol_signature')) return { rows: invalidated };
      return { rows: [] };
    });
  };

  beforeEach(() => {
    client = { query: jest.fn(), release: jest.fn() };
    (getPool as jest.Mock).mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new WorkflowService(audit);
  });

  it('sends a protocol out for signature back for changes and invalidates its signatures', async () => {
    mockState('signed', [{ role_title: 'Principal Investigator', signed_by_name: 'Dr. A' }]);

    const result = await service.transition('project', 'protocol-pdf', { to: 'blocked', note: 'Fix section 5' } as any, actor);

    expect(result).toMatchObject({ from: 'signed', to: 'blocked' });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('update protocol_signature'), ['project', 'Fix section 5']);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'signatures.invalidated' }), client);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('still refuses to send back a finalized protocol', async () => {
    mockState('final', []);
    await expect(service.transition('project', 'protocol-pdf', { to: 'blocked' } as any, actor)).rejects.toThrow('Invalid transition');
    expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('update protocol_signature'), expect.anything());
  });
});
