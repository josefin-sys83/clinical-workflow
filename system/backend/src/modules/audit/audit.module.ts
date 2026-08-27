import { Module } from '@nestjs/common';
import { AuditController, GlobalAuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController, GlobalAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
