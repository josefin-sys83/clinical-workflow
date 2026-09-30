import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it.each(['blocker', 'warning', 'cross_reference', 'recommendation', 'human_decision_required'])(
    'saves the exact protocol issue severity %s', async severity => {
      await service.save('project', {
        sections: [{ id: '1', issues: [{ id: 'finding', severity, description: 'Finding', status: 'open' }] }],
      }, actor, client);

      const writes = client.query.mock.calls.filter(([sql]: [string]) => sql.includes('insert into protocol_section_issue'));
      expect(writes).toHaveLength(1);
      expect(writes[0][1][2]).toBe(severity);
    },
  );

  it.each([undefined, null, '', 'info', 'high', 'Blocker', ' warning ', 'cross-reference', 1, {}, ['warning']])(
    'rejects invalid severity %p before writing any part of the protocol', async severity => {
      await expect(service.save('project', {
        sections: [
          { id: '1', issues: [{ id: 'valid', severity: 'warning' }] },
          { id: '2', issues: [{ id: 'invalid', severity }] },
        ],
      }, actor, client)).rejects.toBeInstanceOf(BadRequestException);
      expect(client.query).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid severity from completed analysis and rolls back the transaction', async () => {
    jest.spyOn(service, 'getByProject').mockResolvedValue({
      sections: [{ id: '1', issues: [], analysisRequestId: 'request', analysisStatus: 'running' }],
    });
    await expect(service.finishSectionAnalysis('project', '1', 'request', {
      issues: [{ id: 'finding', severity: 'info' }],
    }, null, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]: [string]) => sql.includes('insert into protocol_section_issue'))).toBe(false);
    expect(audit.record).not.toHaveBeenCalled();
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

  it('records the signed-in user as comment author, ignoring any name in the request', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('select id, name from users')) return { rows: [{ id: 'writer', name: 'Emanuel Lundberg' }] };
      if (sql.includes('from project_members')) return { rows: [{ role_title: 'Medical Writer' }] };
      if (sql.includes('from protocol_section where')) return { rows: [{ id: 'section-row', title: 'Overview' }] };
      if (sql.includes('insert into protocol (')) return { rows: [{ id: 'protocol' }] };
      return { rows: [] };
    });
    jest.spyOn(service, 'getByProject').mockResolvedValue({ sections: [{ id: '1', comments: [] }] });

    await service.addComment('project', '1', { content: 'Please clarify', author: 'Dr. Elin' } as any, actor);

    const insert = client.query.mock.calls.find(([sql]: [string]) => sql.includes('insert into protocol_section_comment'));
    expect(insert[1]).toEqual(expect.arrayContaining(['writer', 'Emanuel Lundberg', 'Medical Writer', 'Please clarify']));
    expect(insert[1]).not.toContain('Dr. Elin');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'protocol.comment.added', actor }), client);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back a section edit if its audit write fails', async () => {
    jest.spyOn(service, 'updateSectionContent').mockResolvedValue({ title: 'Study Design', content: '<p>Edited</p>', updatedAt: '2026-09-15T00:00:00Z', revision: 2 });
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
        return { rows: [{ title: 'Overview', content: params?.[2], updated_at: '2026-09-24T00:00:00Z', revision: 3 }] };
      }
      return { rows: [{ id: 'project', data: {} }] };
    });
    const response = await service.updateSection('project', '1', {
      content: '<p>First<br>Second</p>', reason: 'Clarification',
    }, actor);

    expect(response).toMatchObject({ ok: true, content: '<p>First<br />Second</p>', revision: 3 });
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
