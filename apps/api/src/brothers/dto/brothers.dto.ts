import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilitaryBranch } from '@prisma/client';

function trimToUndefined({ value }: { value: unknown }): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normaliseConfidenceInput({ value }: { value: unknown }): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return Number.NaN;
  }

  if (numeric >= 0 && numeric <= 1) {
    return Number((numeric * 100).toFixed(2));
  }

  return numeric;
}

export class BrothersSearchFiltersDto {
  @ApiPropertyOptional({ enum: MilitaryBranch, description: 'Exact branch filter' })
  @IsOptional()
  @IsEnum(MilitaryBranch)
  branch?: MilitaryBranch;

  @ApiPropertyOptional({ description: 'Regiment or battalion/unit name to match' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(200)
  regiment?: string;

  @ApiPropertyOptional({ description: 'Deployment theatre, operation, or location to match' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(120)
  deployment?: string;

  @ApiPropertyOptional({ description: 'Duty station or garrison to match' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(120)
  station?: string;

  @ApiPropertyOptional({ description: 'Minimum service start year to overlap' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear?: number;

  @ApiPropertyOptional({ description: 'Maximum service end year to overlap' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear?: number;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold as 0-100 or 0-1' })
  @IsOptional()
  @Transform(normaliseConfidenceInput)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Free-text match across service details and profile labels' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(120)
  query?: string;
}

export class ConnectionRequestDto {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ConnectionResponseDto {
  @ApiProperty()
  @IsUUID()
  requestId: string;

  @ApiProperty({ enum: ['accept', 'reject'] })
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';
}
