import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { MilestoneService } from '../milestones/milestone.service';
import { AdminModule } from '../admin/admin.module';
import { ProtocolsService } from './protocols.service';

@Module({
  imports: [AiModule, AuditModule, WorkflowModule, AdminModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProtocolsService, MilestoneService],
  exports: [ProjectsService, ProtocolsService],
})
export class ProjectsModule {}
