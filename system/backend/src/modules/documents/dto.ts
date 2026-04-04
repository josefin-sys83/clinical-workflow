import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FinalizeDocumentDto {
  @IsIn(['protocol', 'report'])
  docType!: 'protocol' | 'report';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}


export class CreateAddendumDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @MaxLength(500)
  changeReason!: string;
}

export class UpdateAddendumDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
