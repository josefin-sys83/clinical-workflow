import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class DocumentWorkflowService {
  constructor(private readonly workflow: WorkflowService) {}

  // Same "done" set the frontend's shared/workflow/gate.ts uses to decide a step is
  // actually complete, duplicated here because the frontend's WorkflowStepGuard is a
  // client-side redirect only — it stops a user clicking into a page they shouldn't, but
  // does nothing for a direct API call (curl, a modified client, or the QA regression
  // testing that found this). Every route below that can trigger a real, billed AI call
  // or write to a project's data needs its own backend-side check.
  static readonly WORKFLOW_DONE_STATES = new Set(['approved', 'signed', 'final']);

  // Refuses AI generation/analysis once the corresponding PDF step has been signed. A
  // signed protocol/report is a finalized regulatory artifact — regenerating or
  // re-analyzing it is never correct, and QA regression testing found the frontend alone
  // doesn't reliably prevent it: opening report/make or protocol/make on an
  // already-signed project re-runs AI analysis on every page load regardless, burning a
  // real Azure OpenAI call and a DB write each time. This is the permanent backend
  // backstop for that, independent of whatever the frontend does or doesn't skip.
  async assertDocumentNotSigned(projectId: string, pdfStepId: 'protocol-pdf' | 'report-pdf') {
    const snapshot = await this.workflow.getSnapshot(projectId);
    const state = snapshot.steps?.[pdfStepId]?.state;
    if (state === 'signed' || state === 'final') {
      throw new BadRequestException(
        `This ${pdfStepId === 'protocol-pdf' ? 'protocol' : 'report'} has already been finalized and signed and can no longer be regenerated or re-analyzed.`,
      );
    }
  }

  // Backend enforcement of the same prerequisite the frontend's WorkflowStepGuard checks
  // for protocol-make (synopsis and scope must both be done first) — see comment above on
  // why the frontend guard alone isn't sufficient. Returns a fast, explicit 400 instead of
  // letting generateProtocol() run against empty synopsis/scope data, which previously
  // just hung until the AI call itself timed out.
  async assertProtocolPrerequisites(projectId: string) {
    const snapshot = await this.workflow.getSnapshot(projectId);
    const synopsisDone = DocumentWorkflowService.WORKFLOW_DONE_STATES.has(snapshot.steps?.synopsis?.state ?? '');
    const scopeDone = DocumentWorkflowService.WORKFLOW_DONE_STATES.has(snapshot.steps?.scope?.state ?? '');
    if (!synopsisDone || !scopeDone) {
      throw new BadRequestException('Synopsis and scope must both be completed before protocol generation can start.');
    }
  }
}
