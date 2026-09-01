import { Injectable } from '@nestjs/common';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface MilestoneStatus {
  stepId: string;
  stepName: string;
  responsibleRole: string;
  responsibleName: string;
  deadline: string | null;
  daysUntil: number | null;
  status: 'complete' | 'on_track' | 'soon' | 'urgent' | 'overdue' | 'no_date';
  anchorDate?: string;
  anchorLabel?: string;
}

export interface MilestonesResult {
  complexity: ComplexityLevel;
  complexityLabel: string;
  complexityPoints: number;
  milestones: MilestoneStatus[];
  warnings: MilestoneWarning[];
}

export interface MilestoneWarning {
  code: 'anchor_order' | 'timeline_not_feasible';
  message: string;
  affectedMilestones?: string[];
}

@Injectable()
export class MilestoneService {

  private readonly STEP_META: Record<string, { name: string; role: string }> = {
    'synopsis':        { name: 'Synopsis',        role: 'Project Manager' },
    'scope':           { name: 'Scope',            role: 'Project Manager' },
    'protocol-make':   { name: 'Protocol Make',    role: 'Medical Writer' },
    'protocol-review': { name: 'Protocol Review',  role: 'Protocol Lead' },
    'protocol-pdf':    { name: 'Protocol PDF',     role: 'Principal Investigator' },
    'report-make':     { name: 'Report Make',      role: 'Medical Writer' },
    'report-review':   { name: 'Report Review',    role: 'Protocol Lead' },
    'report-pdf':      { name: 'Report PDF',       role: 'Principal Investigator' },
  };

  private readonly LEAD_TIMES: Record<ComplexityLevel, Record<string, number>> = {
    low: {
      'synopsis': 2, 'scope': 1, 'protocol-make': 6,
      'protocol-review': 1, 'protocol-pdf': 1,
      'ethics-review': 8,
      'report-make': 10, 'report-review': 1, 'report-pdf': 1,
    },
    medium: {
      'synopsis': 3, 'scope': 1, 'protocol-make': 10,
      'protocol-review': 2, 'protocol-pdf': 1,
      'ethics-review': 10,
      'report-make': 16, 'report-review': 2, 'report-pdf': 1,
    },
    high: {
      'synopsis': 4, 'scope': 2, 'protocol-make': 14,
      'protocol-review': 2, 'protocol-pdf': 1,
      'ethics-review': 12,
      'report-make': 20, 'report-review': 2, 'report-pdf': 1,
    },
    very_high: {
      'synopsis': 5, 'scope': 2, 'protocol-make': 20,
      'protocol-review': 3, 'protocol-pdf': 2,
      'ethics-review': 16,
      'report-make': 28, 'report-review': 3, 'report-pdf': 2,
    },
  };

  calculateComplexity(projectData: any, synopsis: any): { level: ComplexityLevel; points: number } {
    let points = 0;

    // Risk Class is ordinal, so its rule-based contribution rises with the
    // regulatory risk classification. Markets intentionally do not contribute.
    const riskPoints: Record<string, number> = {
      I: 0,
      IIa: 1,
      IIb: 2,
      III: 3,
    };
    points += riskPoints[projectData?.risk] ?? 0;

    const category = projectData?.deviceCategory || '';
    if (['SaMD', 'Software', 'samd', 'simd', 'ai-ml'].includes(category)) points += 3;
    else if (['AIMD', 'aimd'].includes(category)) points += 3;
    else if (['IVD', 'ivd'].includes(category)) points += 2;

    const synopsisText = typeof synopsis === 'string' ? synopsis :
      synopsis?.readiness || synopsis?.text || JSON.stringify(synopsis || '');

    const sitesMatch = synopsisText.match(/(\d+)\s*(?:investigational\s*)?sites?/i);
    const sites = sitesMatch ? parseInt(sitesMatch[1]) : 1;
    if (sites >= 6) points += 2;
    else if (sites >= 3) points += 1;

    const durationMatch = synopsisText.match(/(\d+)\s*months?\s*(?:total|enrollment|duration|study)/i);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;
    if (duration > 18) points += 2;
    else if (duration >= 6) points += 1;

    const subjectsMatch = synopsisText.match(/(\d+)\s*subjects?|(\d+)\s*patients?|n\s*=\s*(\d+)/i);
    const subjects = subjectsMatch ? parseInt(subjectsMatch[1] || subjectsMatch[2] || subjectsMatch[3]) : 0;
    if (subjects >= 500) points += 2;
    else if (subjects >= 100) points += 1;

    if (/randomi[sz](?:ed|ation)|RCT|controlled/i.test(synopsisText)) points += 2;
    else if (/single.arm|observational/i.test(synopsisText)) points += 1;

    let level: ComplexityLevel;
    if (points <= 4) level = 'low';
    else if (points <= 8) level = 'medium';
    else if (points <= 13) level = 'high';
    else level = 'very_high';

    return { level, points };
  }

  private weeksToMs(weeks: number): number {
    return weeks * 7 * 24 * 60 * 60 * 1000;
  }

  private subtractWeeks(date: Date, weeks: number): Date {
    return new Date(date.getTime() - this.weeksToMs(weeks));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private daysDiff(target: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getStatus(daysUntil: number, isComplete: boolean): MilestoneStatus['status'] {
    if (isComplete) return 'complete';
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'urgent';
    if (daysUntil <= 30) return 'soon';
    return 'on_track';
  }

  private getRoleName(role: string, roles: any[]): string {
    const found = roles?.find((r: any) =>
      r.role === role || r.title === role
    );
    if (!found) return role;
    if (found.name) return found.name;
    if (found.assignedTo?.length > 0) return found.assignedTo[0].name || role;
    return role;
  }

  computeWarnings(project: any, now = new Date()): MilestoneWarning[] {
    const result = this.computeMilestones(project, {}, now);
    return result.warnings;
  }

  computeMilestones(project: any, workflowStates: Record<string, string>, now = new Date()): MilestonesResult {
    const scope = project.data?.scope || {};
    const projectData = {
      ...(project.data?.projectData || {}),
      targetMarkets: project.targetMarkets || project.data?.projectData?.targetMarkets || [],
      risk: project.risk ?? project.data?.projectData?.risk ?? '',
      deviceCategory: project.deviceCategory || scope.deviceCategory || project.data?.projectData?.deviceCategory || '',
    };
    const synopsis = project.data?.synopsis || {};
    const roles = project.data?.roles || [];

    const { level, points } = this.calculateComplexity(projectData, synopsis);
    const leadTimes = this.LEAD_TIMES[level];

    const complexityLabels: Record<ComplexityLevel, string> = {
      low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High',
    };

    const ethicsDate = projectData.ethicsSubmissionTarget
      ? new Date(projectData.ethicsSubmissionTarget) : null;
    const submissionDate = projectData.regulatorySubmissionTarget
      ? new Date(projectData.regulatorySubmissionTarget) : null;
    const firstPatientInDate = projectData.firstPatientInTarget
      ? new Date(projectData.firstPatientInTarget) : null;

    const deadlines: Record<string, { date: Date; anchor: string; anchorDate: string } | null> = {};

    if (ethicsDate) {
      let d = new Date(ethicsDate);
      d = this.subtractWeeks(d, leadTimes['protocol-pdf']);
      deadlines['protocol-pdf'] = { date: new Date(d), anchor: 'Ethics Submission', anchorDate: this.formatDate(ethicsDate) };
      d = this.subtractWeeks(d, leadTimes['protocol-review']);
      deadlines['protocol-review'] = { date: new Date(d), anchor: 'Ethics Submission', anchorDate: this.formatDate(ethicsDate) };
      d = this.subtractWeeks(d, leadTimes['protocol-make']);
      deadlines['protocol-make'] = { date: new Date(d), anchor: 'Ethics Submission', anchorDate: this.formatDate(ethicsDate) };
      d = this.subtractWeeks(d, leadTimes['scope']);
      deadlines['scope'] = { date: new Date(d), anchor: 'Ethics Submission', anchorDate: this.formatDate(ethicsDate) };
      d = this.subtractWeeks(d, leadTimes['synopsis']);
      deadlines['synopsis'] = { date: new Date(d), anchor: 'Ethics Submission', anchorDate: this.formatDate(ethicsDate) };
    }

    if (submissionDate) {
      const clampToFirstPatientIn = (candidate: Date) => {
        const usesFirstPatientIn = Boolean(
          firstPatientInDate &&
          !Number.isNaN(firstPatientInDate.getTime()) &&
          candidate < firstPatientInDate,
        );
        return {
          date: usesFirstPatientIn ? new Date(firstPatientInDate!) : new Date(candidate),
          anchor: usesFirstPatientIn ? 'First Patient In' : 'Regulatory Submission',
          anchorDate: this.formatDate(usesFirstPatientIn ? firstPatientInDate! : submissionDate),
        };
      };

      let d = new Date(submissionDate);
      d = this.subtractWeeks(d, leadTimes['report-pdf']);
      deadlines['report-pdf'] = clampToFirstPatientIn(d);
      d = this.subtractWeeks(d, leadTimes['report-review']);
      deadlines['report-review'] = clampToFirstPatientIn(d);
      d = this.subtractWeeks(d, leadTimes['report-make']);
      deadlines['report-make'] = clampToFirstPatientIn(d);
    }

    const stepOrder = ['synopsis', 'scope', 'protocol-make', 'protocol-review', 'protocol-pdf', 'report-make', 'report-review', 'report-pdf'];

    const milestones: MilestoneStatus[] = stepOrder.map(stepId => {
      const meta = this.STEP_META[stepId];
      const state = workflowStates[stepId];
      const isComplete = ['approved', 'final', 'signed'].includes(state);
      const deadlineInfo = deadlines[stepId] ?? null;
      const deadline = deadlineInfo ? this.formatDate(deadlineInfo.date) : null;
      const daysUntil = deadlineInfo
        ? Math.round((new Date(deadlineInfo.date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
        : null;

      return {
        stepId,
        stepName: meta.name,
        responsibleRole: meta.role,
        responsibleName: this.getRoleName(meta.role, roles),
        deadline,
        daysUntil,
        status: isComplete ? 'complete' : daysUntil !== null ? this.getStatus(daysUntil, false) : 'no_date',
        anchorLabel: deadlineInfo?.anchor,
        anchorDate: deadlineInfo?.anchorDate,
      };
    });

    const warnings: MilestoneWarning[] = [];
    const validDate = (date: Date | null): date is Date => Boolean(date && !Number.isNaN(date.getTime()));
    const orderInvalid =
      (validDate(ethicsDate) && validDate(firstPatientInDate) && ethicsDate > firstPatientInDate) ||
      (validDate(firstPatientInDate) && validDate(submissionDate) && firstPatientInDate > submissionDate) ||
      (validDate(ethicsDate) && validDate(submissionDate) && ethicsDate > submissionDate);

    if (orderInvalid) {
      warnings.push({
        code: 'anchor_order',
        message: 'Ethics Submission must be less than or equal to First Patient In, and First Patient In must be less than or equal to Regulatory Submission. This order ensures approvals occur before enrollment and the study completes before regulatory submission.',
      });
    }

    const pastIncompleteMilestones = milestones.filter(m =>
      m.deadline !== null && m.daysUntil !== null && m.daysUntil < 0 && m.status !== 'complete',
    );
    if (pastIncompleteMilestones.length > 0) {
      warnings.push({
        code: 'timeline_not_feasible',
        message: `This timeline is not feasible with the current ${complexityLabels[level].toLowerCase()} complexity: ${pastIncompleteMilestones.map(m => `${m.stepName} (${m.deadline})`).join(', ')} ${pastIncompleteMilestones.length === 1 ? 'is' : 'are'} already due. Adjust the anchor dates or proceed with the acknowledged risk.`,
        affectedMilestones: pastIncompleteMilestones.map(m => m.stepId),
      });
    }

    return {
      complexity: level,
      complexityLabel: complexityLabels[level],
      complexityPoints: points,
      milestones,
      warnings,
    };
  }
}
