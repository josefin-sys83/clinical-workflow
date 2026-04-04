import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditEventDto {
  @ApiProperty({ example: 'user.action' })
  @IsString()
  @MaxLength(120)
  type!: string;

  @ApiProperty({ example: 'User approved protocol review' })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiProperty({ required: false, example: 'protocol-review' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stepId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiProperty({ required: false, description: 'Free-form JSON metadata as string. (If you prefer, change to object + transform)' })
  @IsOptional()
  @IsString()
  metadataJson?: string;
}
