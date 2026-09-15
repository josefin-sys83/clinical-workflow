import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NoNullBytes } from '../../common/no-null-bytes.decorator';

// Generous but bounded — real protocol/report sections can legitimately run to tens of
// thousands of characters; this only guards against pathological/DoS-scale payloads.
const MAX_SECTION_CONTENT_LENGTH = 500_000;

export class UpdateSectionContentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(MAX_SECTION_CONTENT_LENGTH)
  @NoNullBytes()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SECTION_CONTENT_LENGTH)
  @NoNullBytes()
  previousContent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class UploadProtocolAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
