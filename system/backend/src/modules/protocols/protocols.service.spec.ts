import { NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';
import { ProtocolsService } from './protocols.service';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

describe('protocol write transactions', () => {
  const actor = { userId: 'writer', name: 'Writer' };
  let service: ProtocolsService;
  let client: any;
  let audit: any;

  beforeEach(() => {
    client = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'project', data: {} }] }), release: jest.fn() };
    (getPool as jest.Mock).mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProtocolsService(audit);
  });

  it('reads the current protocol under the project lock and commits its amendment and audit together', async () => {
    const protocol = { amendments: [{ id: 'existing' }] };
    jest.spyOn(service, 'getByProject').mockResolvedValue(protocol);
    const save = jest.spyOn(service, 'save').mockResolvedValue(undefined);
    const mutate = jest.fn(current => ({ ...current, amendments: [...current.amendments, { id: 'new' }] }));
    await service.updateAtomic('project', mutate, actor, () => ({ type: 'amendment.created', message: 'Created amendment' }));
    expect(client.query).toHaveBeenCalledWith('select data from projects where id=$1 for update', ['project']);
    expect(client.query.mock.invocationCallOrder[1]).toBeLessThan(mutate.mock.invocationCallOrder[0]);
    expect(save).toHaveBeenCalledWith('project', { amendments: [{ id: 'existing' }, { id: 'new' }] }, actor, client);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'amendment.created', actor }), client);
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back a section edit if its audit write fails', async () => {
    jest.spyOn(service, 'updateSectionContent').mockResolvedValue({ title: 'Study Design', content: '<p>Edited</p>', updatedAt: '2026-09-15T00:00:00Z' });
    audit.record.mockRejectedValue(new Error('Audit unavailable'));
    await expect(service.updateSection('project', 'section-4', { content: '<p>Edited</p>', reason: 'Correction' }, actor))
      .rejects.toThrow('Audit unavailable');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      type: 'section.content.updated', actor, metadata: expect.objectContaining({ reason: 'Correction', newContent: '<p>Edited</p>' }),
    }), client);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('returns the exact saved content for subsequent analysis', async () => {
    client.query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('update protocol_section set')) {
        return { rows: [{ title: 'Overview', content: params?.[2], updated_at: '2026-09-24T00:00:00Z' }] };
      }
      return { rows: [{ id: 'project', data: {} }] };
    });
    const response = await service.updateSection('project', '1', {
      content: '<p>First<br>Second</p>', reason: 'Clarification',
    }, actor);

    expect(response).toMatchObject({ ok: true, content: '<p>First<br />Second</p>' });
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  });

  it('rejects a missing project before saving section content', async () => {
    client.query.mockResolvedValue({ rows: [] });
    const save = jest.spyOn(service, 'updateSectionContent');
    await expect(service.updateSection('missing', 'section-4', { content: 'Text' }, actor)).rejects.toThrow(NotFoundException);
    expect(save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('keeps existing protocol sections when the development bypass is requested', async () => {
    const existing = { sections: [{ id: '1', content: 'Existing content' }] };
    jest.spyOn(service, 'getByProject').mockResolvedValue(existing);
    const save = jest.spyOn(service, 'save');
    await expect(service.forceDraft('project', ['Protocol Overview'], actor))
      .resolves.toMatchObject({ ...existing, bypassed: false });
    expect(save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
