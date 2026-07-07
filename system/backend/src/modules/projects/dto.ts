import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NoNullBytes } from '../../common/no-null-bytes.decorator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Acme Study 2026-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @NoNullBytes()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  deviceName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @NoNullBytes()
  description?: string;
}

// Mirrors CreateProjectDto's validation for name/description so PATCH can't be used to bypass
// the length/content limits enforced at creation. `data` is an intentionally open-ended nested
// blob (protocol/report sections, synopsis, scope, roles, etc.) that isn't practical to model
// as a strict nested DTO here, but it still gets the null-byte check recursively — that's the
// specific failure mode that previously reached Postgres as an unhandled 500.
export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @NoNullBytes()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @NoNullBytes()
  data?: any;
}

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
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userName?: string;

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
