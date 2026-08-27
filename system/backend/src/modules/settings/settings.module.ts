import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [EmailModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
