import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
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
}

export class CreateServicePeriodDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth: number;

  @ApiProperty({ example: 2010 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth: number;

  @ApiProperty({ example: 2014 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear: number;

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
