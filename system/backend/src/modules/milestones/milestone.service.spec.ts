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
      targetMarkets: ['EU'],
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
});
