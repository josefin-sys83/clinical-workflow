import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { MilestoneService } from '../milestones/milestone.service';
import { AdminModule } from '../admin/admin.module';
import { ProtocolsService } from '../protocols/protocols.service';
import { ReportsService } from '../reports/reports.service';

import { ProtocolAttachmentsService } from '../protocols/protocol-attachments.service';
import { ProtocolsController } from '../protocols/protocols.controller';
import { ReportsController } from '../reports/reports.controller';
import { DocumentWorkflowService } from './document-workflow.service';

// Compose the project and document domains here so their controllers can share
// project context without circular module dependencies.
@Module({
  imports: [AiModule, AuditModule, WorkflowModule, AdminModule],
  controllers: [ProjectsController, ProtocolsController, ReportsController],
  providers: [ProjectsService, ProtocolsService, ReportsService, MilestoneService, DocumentWorkflowService, ProtocolAttachmentsService],
  exports: [ProjectsService, ProtocolsService, ReportsService],
})
export class ProjectsModule {}
