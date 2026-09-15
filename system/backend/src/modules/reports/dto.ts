import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { NoNullBytes } from '../../common/no-null-bytes.decorator';

export class UpdateReportSectionsDto {
  @ApiProperty({ type: Object })
  @IsObject()
  @NoNullBytes()
  sections!: Record<string, Record<string, any>>;
}
