import { IsOptional, IsEnum, IsInt, Min, Max, IsArray, IsUUID, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OverlapIndicator {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class BrothersFiltersDto {
  @ApiPropertyOptional({ enum: ['army', 'navy', 'air_force', 'marines', 'coast_guard', 'space_force'], isArray: true })
  @IsOptional()
  @IsArray()
  branches?: string[];

  @ApiPropertyOptional({ description: 'Minimum year of service' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  minYear?: number;

  @ApiPropertyOptional({ description: 'Maximum year of service' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  maxYear?: number;

  @ApiPropertyOptional({ description: 'Minimum overlap indicator to show' })
  @IsOptional()
  @IsEnum(OverlapIndicator)
  minOverlap?: OverlapIndicator;

  @ApiPropertyOptional({ description: 'Location filter' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class ConnectionRequestDto {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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

// Response DTOs
export class BrotherCandidateDto {
  id: string;
  displayName: string;
  profileImage?: string;
  isVerified: boolean;
  
  // Overlap indicator (always visible for verified veterans)
  overlapIndicator: OverlapIndicator;
  
  // Basic service info (visible to verified veterans)
  branches?: string[];
  
  // Detailed service info (only for paid veterans)
  servicePeriods?: ServicePeriodSummaryDto[];
  potentialOverlaps?: OverlapDetailDto[];
}

export class ServicePeriodSummaryDto {
  branch: string;
  startYear: number;
  startMonth: number;
  endYear?: number;
  endMonth?: number;
  location?: string;
  unit?: string;
}

export class OverlapDetailDto {
  branch: string;
  location?: string;
  timeframe: string; // e.g., "Jan 2010 - Mar 2012"
  overlapMonths: number;
}

export class ConnectionRequestResponseDto {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  overlapIndicator: OverlapIndicator;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
