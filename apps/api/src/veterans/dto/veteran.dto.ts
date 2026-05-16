import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilitaryBranch } from '@prisma/client';

export class UpdateVeteranDetailsDto {
  @ApiPropertyOptional({ enum: MilitaryBranch })
  @IsOptional()
  @IsEnum(MilitaryBranch)
  branch?: MilitaryBranch;

  @ApiPropertyOptional({ example: '101st Airborne Division' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  regiment?: string;

  @ApiPropertyOptional({ example: 'Sergeant' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rank?: string;

  @ApiPropertyOptional({ example: 'Royal Signals' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trade?: string;

  @ApiPropertyOptional({ example: ['Op HERRICK', 'Op TELIC'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deployments?: string[];

  @ApiPropertyOptional({ example: ['Catterick', 'Cyprus'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dutyStations?: string[];

  @ApiPropertyOptional({ example: '2010-01-01' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2014-01-01' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsDateString()
  endDate?: string;
}

export class CreateServicePeriodDto {
  @ApiProperty({ enum: MilitaryBranch })
  @IsEnum(MilitaryBranch)
  branch: MilitaryBranch;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number;

  @ApiProperty({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear?: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @ApiProperty({ example: 2014 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear?: number;

  @ApiPropertyOptional({ example: '2010-03-01' })
  @ValidateIf((dto: CreateServicePeriodDto) => dto.startYear == null)
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2014-06-01' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Afghanistan' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '2nd Battalion' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  unit?: string;

  @ApiPropertyOptional({ example: 'Combat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deploymentType?: string;
}

export class UpdateServicePeriodDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear?: number;

  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @ApiPropertyOptional({ example: 2014 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear?: number;

  @ApiPropertyOptional({ example: '2010-03-01' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2014-06-01' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Afghanistan' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '2nd Battalion' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  unit?: string;

  @ApiPropertyOptional({ example: 'Combat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deploymentType?: string;
}
