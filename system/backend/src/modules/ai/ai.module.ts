import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerationProgressService } from './generation-progress.service';

@Module({
  providers: [AiService, GenerationProgressService],
  exports: [AiService, GenerationProgressService],
})
export class AiModule {}