import { MilestoneService } from './milestone.service';

describe('MilestoneService advisory warnings', () => {
  const service = new MilestoneService();
  const now = new Date('2026-09-01T12:00:00Z');

  const project = (projectData: Record<string, unknown>, synopsis: Record<string, unknown> = {}) => ({
    data: { projectData, synopsis },
  });

  it('warns about invalid anchor ordering without preventing milestone calculation', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-06-01',
      firstPatientInTarget: '2027-05-01',
      regulatorySubmissionTarget: '2028-06-01',
    }), {}, now);

    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'anchor_order' }),
    ]));
    expect(result.milestones).toHaveLength(8);
  });

  it('warns immediately when calculated intermediate deadlines are in the past', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2026-09-20',
      firstPatientInTarget: '2026-10-01',
      regulatorySubmissionTarget: '2026-10-15',
    }), {}, now);

    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'timeline_not_feasible' }),
    ]));
  });

  it('returns no warnings for a realistic ordered timeline', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-09-01',
      firstPatientInTarget: '2027-10-01',
      regulatorySubmissionTarget: '2029-09-01',
    }), {}, now);

    expect(result.warnings).toEqual([]);
  });

  it('recalculates feasibility when synopsis text raises complexity', () => {
    const projectData = {
      risk: 'IIb',
      deviceCategory: 'samd',
      ethicsSubmissionTarget: '2027-01-01',
      firstPatientInTarget: '2027-02-01',
      regulatorySubmissionTarget: '2028-01-01',
    };
    const initiallyFeasible = service.computeMilestones(project(projectData), {}, now);
    const increasedComplexity = service.computeMilestones(project(projectData, {
      extractedText: 'Randomized controlled study at 8 sites with 600 subjects and 24 months total study duration.',
    }), {}, now);

    expect(initiallyFeasible.warnings).toEqual([]);
    expect(increasedComplexity.complexity).toBe('high');
    expect(increasedComplexity.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'timeline_not_feasible' }),
    ]));
  });

  it('uses Risk Class and device category in the single authoritative score', () => {
    expect(service.calculateComplexity({ risk: 'I', deviceCategory: 'non-implantable' }, {}))
      .toEqual({ level: 'low', points: 0 });
    expect(service.calculateComplexity({ risk: 'III', deviceCategory: 'samd' }, {}))
      .toEqual({ level: 'medium', points: 6 });
  });

  it('does not use target markets in complexity scoring', () => {
    const withoutMarkets = service.calculateComplexity({ risk: 'IIa', deviceCategory: 'ivd' }, {});
    const withMarkets = service.calculateComplexity({
      risk: 'IIa',
      deviceCategory: 'ivd',
      targetMarkets: ['EU', 'US', 'Japan', 'China'],
    }, {});

    expect(withMarkets).toEqual(withoutMarkets);
  });

  it('recognizes both British and American randomisation wording', () => {
    expect(service.calculateComplexity({}, { extractedText: 'The study is randomised.' }).points).toBe(2);
    expect(service.calculateComplexity({}, { extractedText: 'The study is randomized.' }).points).toBe(2);
  });

  it('uses a late First Patient In date as the start of report authoring', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-06-01',
      firstPatientInTarget: '2027-11-01',
      regulatorySubmissionTarget: '2027-12-31',
    }), {}, now);

    expect(result.milestones.find(m => m.stepId === 'report-make')).toEqual(
      expect.objectContaining({ deadline: '2027-11-01', anchorLabel: 'First Patient In' }),
    );
  });

  it('keeps the regulatory backward calculation when First Patient In is earlier', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-06-01',
      firstPatientInTarget: '2027-09-01',
      regulatorySubmissionTarget: '2027-12-31',
    }), {}, now);

    expect(result.milestones.find(m => m.stepId === 'report-make')).toEqual(
      expect.objectContaining({ deadline: '2027-10-08', anchorLabel: 'Regulatory Submission' }),
    );
  });

  it('never places a report milestone before First Patient In', () => {
    const fpi = '2027-12-20';
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-06-01',
      firstPatientInTarget: fpi,
      regulatorySubmissionTarget: '2027-12-31',
    }), {}, now);

    const reportMilestones = result.milestones.filter(m => m.stepId.startsWith('report-'));
    expect(reportMilestones.every(m => m.deadline !== null && m.deadline >= fpi)).toBe(true);
  });

  it('keeps scheduling the report chain when First Patient In is absent', () => {
    const result = service.computeMilestones(project({
      ethicsSubmissionTarget: '2027-06-01',
      regulatorySubmissionTarget: '2027-12-31',
    }), {}, now);

    expect(result.milestones.find(m => m.stepId === 'report-make')).toEqual(
      expect.objectContaining({ deadline: '2027-10-08', anchorLabel: 'Regulatory Submission' }),
    );
  });

  it('does not let First Patient In change the protocol chain', () => {
    const base = {
      ethicsSubmissionTarget: '2027-06-01',
      regulatorySubmissionTarget: '2027-12-31',
    };
    const withoutFpi = service.computeMilestones(project(base), {}, now);
    const withFpi = service.computeMilestones(project({ ...base, firstPatientInTarget: '2027-12-20' }), {}, now);
    const protocolDeadlines = (result: ReturnType<MilestoneService['computeMilestones']>) =>
      result.milestones
        .filter(m => ['synopsis', 'scope', 'protocol-make', 'protocol-review', 'protocol-pdf'].includes(m.stepId))
        .map(m => [m.stepId, m.deadline]);

    expect(protocolDeadlines(withFpi)).toEqual(protocolDeadlines(withoutFpi));
  });
});
