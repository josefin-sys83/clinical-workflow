import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { AuditModule } from './modules/audit/audit.module';
import { MeModule } from './modules/me/me.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Default throttler tier used by AiThrottlerGuard on AI generation/analysis routes.
    // Not registered as a global APP_GUARD — only applied where explicitly opted in via
    // @UseGuards(AiThrottlerGuard), so it never affects unrelated CRUD endpoints.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 10 }],
    }),
    ProjectsModule,
    WorkflowModule,
    AuditModule,
    DocumentsModule,
    MeModule,
    AuthModule,
    AiModule,
    AdminModule,
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}