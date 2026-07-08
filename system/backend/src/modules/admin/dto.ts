import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NoNullBytes } from '../../common/no-null-bytes.decorator';

const SUBSCRIPTION_PLANS = ['starter', 'professional', 'enterprise'] as const;
const SYSTEM_ROLES = ['admin', 'author', 'reviewer', 'approver'] as const;

// Trims before @IsNotEmpty() runs, so a whitespace-only value (e.g. "   ") is rejected
// as empty instead of passing through and creating a blank, unidentifiable record.
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Clinical' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @NoNullBytes()
  name!: string;

  @ApiProperty({ required: false, example: 'acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  domain?: string;
}

export class UpdateCompanyDto {
  @ApiProperty({ example: 'Acme Clinical' })
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
  domain?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  contact_name?: string;

  // The edit form always sends this field, using '' to mean "not set" — @IsOptional() alone
  // only skips undefined/null, so an empty string would still fail @IsEmail(). ValidateIf
  // treats a falsy value as absent instead.
  @ApiProperty({ required: false })
  @ValidateIf((o) => !!o.contact_email)
  @IsEmail()
  @MaxLength(200)
  contact_email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @NoNullBytes()
  contact_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  billing_address_line1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNullBytes()
  billing_address_line2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @NoNullBytes()
  billing_city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @NoNullBytes()
  billing_postal_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @NoNullBytes()
  billing_country?: string;

  @ApiProperty({ required: false, enum: SUBSCRIPTION_PLANS })
  @IsOptional()
  @IsIn(SUBSCRIPTION_PLANS)
  subscription_plan?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subscription_start?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subscription_renewal?: string;
}

export class SetCompanyStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
}

export class CreateCompanyUserDto {
  @ApiProperty({ example: 'Jane Smith' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @NoNullBytes()
  name!: string;

  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  @NoNullBytes()
  password!: string;

  @ApiProperty({ required: false, enum: SYSTEM_ROLES })
  @IsOptional()
  @IsIn(SYSTEM_ROLES)
  system_role?: string;
}

export class SetUserActiveDto {
  @ApiProperty()
  @IsBoolean()
  is_active!: boolean;
}

export class SetUserRoleDto {
  @ApiProperty({ enum: SYSTEM_ROLES })
  @IsIn(SYSTEM_ROLES)
  system_role!: string;
}

export class InviteSuperadminDto {
  @ApiProperty({ example: 'Jane Smith' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @NoNullBytes()
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
