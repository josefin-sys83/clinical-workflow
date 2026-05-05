import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { AuditModule } from './modules/audit/audit.module';
import { MeModule } from './modules/me/me.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProjectsModule,
    WorkflowModule,
    AuditModule,
    DocumentsModule,
    MeModule,
    AuthModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}