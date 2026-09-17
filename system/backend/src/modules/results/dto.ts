import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { NoNullBytes } from '../../common/no-null-bytes.decorator';

export const RESULT_TYPES = ['table', 'figure', 'listing'] as const;
export const PLACEMENTS = ['unplaced', 'main', 'appendix', 'both'] as const;
export type ResultType = (typeof RESULT_TYPES)[number];
export type Placement = (typeof PLACEMENTS)[number];
export type Origin = 'ai' | 'human';

export class ResultFieldsDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  @NoNullBytes()
  title!: string;

  @ApiProperty({
    type: Object,
    description:
      'Structured table, figure or listing data; not executable HTML.',
  })
  @IsObject()
  @NoNullBytes()
  content!: Record<string, unknown>;

  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(20000)
  @NoNullBytes()
  description?: string;

  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  @NoNullBytes()
  sourceFilename!: string;

  @ApiPropertyOptional({ example: 'Sheet 2, rows 4-9' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(2000)
  @NoNullBytes()
  sourceLocation?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Database UUID of a section in this project’s report.',
  })
  @IsOptional()
  @IsUUID()
  reportSectionId?: string | null;

  @ApiPropertyOptional({ enum: PLACEMENTS })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(PLACEMENTS)
  placement?: Placement;

  @ApiPropertyOptional({ enum: ['ai', 'human'] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['ai', 'human'])
  titleOrigin?: Origin;

  @ApiPropertyOptional({ enum: ['ai', 'human'] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['ai', 'human'])
  sectionOrigin?: Origin;

  @ApiPropertyOptional({ enum: ['ai', 'human'] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['ai', 'human'])
  descriptionOrigin?: Origin;

  @ApiPropertyOptional({ nullable: true, example: 'Table 14.2.1' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @NoNullBytes()
  originalReference?: string | null;
}

export class CreateResultDto extends ResultFieldsDto {
  @ApiProperty({ enum: RESULT_TYPES })
  @IsIn(RESULT_TYPES)
  type!: ResultType;
}

// Undefined means unchanged; null only clears explicitly nullable fields.
export class UpdateResultDto extends PartialType(ResultFieldsDto, {
  skipNullProperties: false,
}) {
  @ApiProperty({
    minimum: 1,
    description: 'Version last read; stale writes return 409.',
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ResultDecisionDto {
  @ApiProperty({ enum: ['accept', 'appendix', 'reject'] })
  @IsIn(['accept', 'appendix', 'reject'])
  decision!: 'accept' | 'appendix' | 'reject';

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(10000)
  @NoNullBytes()
  reason?: string;

  @ApiPropertyOptional({
    enum: ['main', 'both'],
    description: 'For accept only; defaults to main when a section is assigned, otherwise unplaced.',
  })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['main', 'both'])
  placement?: 'main' | 'both';
}

export class ListResultsDto {
  @ApiPropertyOptional({ enum: RESULT_TYPES })
  @IsOptional()
  @IsIn(RESULT_TYPES)
  type?: ResultType;

  @ApiPropertyOptional({
    enum: ['draft', 'accepted', 'in-appendix', 'rejected'],
  })
  @IsOptional()
  @IsIn(['draft', 'accepted', 'in-appendix', 'rejected'])
  status?: string;

  @ApiPropertyOptional({
    enum: ['main', 'appendix'],
    description: 'Both views include results placed in both.',
  })
  @IsOptional()
  @IsIn(['main', 'appendix'])
  view?: 'main' | 'appendix';
}
