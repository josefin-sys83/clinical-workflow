import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditModule } from '../audit/audit.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [AuditModule, WorkflowModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
