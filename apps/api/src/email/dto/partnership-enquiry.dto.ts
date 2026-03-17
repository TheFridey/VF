import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimStringArray = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : value;

export const PARTNERSHIP_ORGANISATION_TYPES = [
  'charity',
  'veteran_support',
  'mental_health',
  'training_employment',
  'housing_support',
  'business',
  'public_sector',
  'other',
] as const;

export const PARTNERSHIP_BUDGET_RANGES = [
  'under_500',
  '500_1500',
  '1500_3000',
  '3000_plus',
  'unsure',
] as const;

export const PARTNERSHIP_TYPES = [
  'dashboard_placement',
  'resource_listing',
  'forum_visibility',
  'email_spotlight',
  'support_hub_feature',
  'other',
] as const;

export type PartnershipOrganisationType = (typeof PARTNERSHIP_ORGANISATION_TYPES)[number];
export type PartnershipBudgetRange = (typeof PARTNERSHIP_BUDGET_RANGES)[number];
export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number];

export class PartnershipEnquiryDto {
  @ApiProperty({ example: 'Royal Signals Association' })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organisationName!: string;

  @ApiProperty({ example: 'Jane Smith' })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  contactName!: string;

  @ApiProperty({ example: 'jane.smith@example.org' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiProperty({ enum: PARTNERSHIP_ORGANISATION_TYPES, example: 'charity' })
  @Transform(trimString)
  @IsIn(PARTNERSHIP_ORGANISATION_TYPES)
  organisationType!: PartnershipOrganisationType;

  @ApiProperty({ example: 'https://example.org' })
  @Transform(trimString)
  @IsUrl({ require_protocol: true })
  @MaxLength(240)
  websiteUrl!: string;

  @ApiProperty({ example: 'We provide employment transition support for former service personnel across the UK.' })
  @Transform(trimString)
  @IsString()
  @MinLength(20)
  @MaxLength(1500)
  organisationDescription!: string;

  @ApiProperty({ example: 'We would like to explore a curated placement that helps veterans discover our support offer.' })
  @Transform(trimString)
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  partnershipReason!: string;

  @ApiPropertyOptional({ example: '+44 7700 900123' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+()\-\s]{7,32}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: PARTNERSHIP_BUDGET_RANGES, example: '500_1500' })
  @Transform(trimString)
  @IsOptional()
  @IsIn(PARTNERSHIP_BUDGET_RANGES)
  budgetRange?: PartnershipBudgetRange;

  @ApiPropertyOptional({
    enum: PARTNERSHIP_TYPES,
    isArray: true,
    example: ['dashboard_placement', 'email_spotlight'],
  })
  @Transform(trimStringArray)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsIn(PARTNERSHIP_TYPES, { each: true })
  partnershipTypes?: PartnershipType[];

  @ApiPropertyOptional({ example: 'UK-wide, with in-person delivery across the South West and remote support nationally.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  audienceServiceArea?: string;

  @ApiPropertyOptional({ example: 'We are open to a quarterly spotlight or a support hub inclusion.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Honeypot field. Legitimate submissions must leave this empty.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(0)
  officeLocation?: string;
}
