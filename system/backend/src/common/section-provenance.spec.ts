import { generationInputs, loadSectionProvenance } from './section-provenance';

describe('section origin and generation input snapshots', () => {
  it('captures submitted metadata and source versions before the saved project changes', () => {
    const project = { projectName: 'Original study', targetMarkets: ['EU'], risk: 'IIa' };
    const scope = { intendedUse: 'other-custom', customIntendedUse: 'Original use', requirements: [
      { id: 'accepted', title: 'ISO 14155', status: 'accepted' }, { id: 'rejected', title: 'Excluded', status: 'not-applicable' },
    ] };
    const snapshot = generationInputs(project, scope, [], 'Original synopsis', [{ id: '1', title: 'Overview', revision: 4, content: 'Original' }]);
    project.projectName = 'New study'; scope.customIntendedUse = 'New use'; scope.requirements[0].title = 'New requirement';
    expect(snapshot).toContainEqual({ label: 'Project', value: 'Original study' });
    expect(snapshot).toContainEqual({ label: 'Intended use', value: 'Original use' });
    expect(snapshot.find(input => input.label === 'Accepted requirements')?.value).toBe('ISO 14155');
    expect(snapshot.find(input => input.label === 'Protocol: Overview')?.value).toBe('Revision 4');
    expect(snapshot.find(input => input.label === 'Synopsis')?.fingerprint).toHaveLength(64);
    expect(JSON.stringify(snapshot)).not.toContain('Original synopsis');
  });

  it('keeps origin and inputs after editing and resets edit attribution on regeneration', async () => {
    const inputs = [{ label: 'Target markets', value: 'EU' }];
    const rows = [
      { type: 'report.section.ai.generated', entity_id: 'one', inputs, created_at: '2026-10-10T10:00:00Z' },
      { type: 'report.sections.updated', edited_ids: ['one'], actor_name: 'Alice', created_at: '2026-10-10T11:00:00Z' },
      { type: 'report.sections.updated', edited_ids: [], actor_name: 'Approver', created_at: '2026-10-10T12:00:00Z' },
    ];
    const db = { query: jest.fn().mockResolvedValue({ rows }) };
    const read = await loadSectionProvenance('project', 'report', db as any);
    expect(read('one')).toMatchObject({ aiGenerated: true, editedBy: 'Alice', inputs, editedAt: '2026-10-10T11:00:00Z' });
    expect(read('manual').aiGenerated).toBe(false);
    rows.push({ type: 'report.section.ai.generated', entity_id: 'one', inputs: [{ label: 'Target markets', value: 'US' }], created_at: '2026-10-10T13:00:00Z' });
    const regenerated = await loadSectionProvenance('project', 'report', db as any);
    expect(regenerated('one')).toMatchObject({ editedBy: null, editedAt: null, inputs: [{ label: 'Target markets', value: 'US' }] });
  });

  it('does not guess input sources or mark unrelated report sections AI-generated from legacy bulk events', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [
      { type: 'report.ai.generated', created_at: new Date('2026-10-10T10:00:00Z') },
      { type: 'report.section.ai.generated', entity_id: 'known', created_at: new Date('2026-10-10T11:00:00Z') },
    ] }) };
    const read = await loadSectionProvenance('project', 'report', db as any);
    expect(read('known')).toMatchObject({ aiGenerated: true, inputs: null });
    expect(read('manual').aiGenerated).toBe(false);
    expect(db.query.mock.calls[0][0]).not.toMatch(/select \*/i);
  });
});
