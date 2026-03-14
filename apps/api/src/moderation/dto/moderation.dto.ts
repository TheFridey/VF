import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportReason {
  FAKE_PROFILE = 'FAKE_PROFILE',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  SPAM = 'SPAM',
  SCAM = 'SCAM',
  IMPERSONATION = 'IMPERSONATION',
  UNDERAGE = 'UNDERAGE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  DISMISSED = 'DISMISSED',
  ACTION_TAKEN = 'ACTION_TAKEN',
}

export enum UserAction {
  WARNING = 'WARNING',
  SUSPEND_7_DAYS = 'SUSPEND_7_DAYS',
  SUSPEND_30_DAYS = 'SUSPEND_30_DAYS',
  PERMANENT_BAN = 'PERMANENT_BAN',
}

export class CreateReportDto {
  @ApiProperty({ description: 'ID of the user being reported' })
  @IsUUID()
  reportedUserId: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ description: 'Detailed description of the issue' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'URLs to evidence screenshots' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  @MaxLength(1000)
  resolution: string;

  @ApiPropertyOptional({ enum: UserAction, description: 'Action to take against reported user' })
  @IsOptional()
  @IsEnum(UserAction)
  userAction?: UserAction;
}

export class BulkResolveReportsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  reportIds: string[];

  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  @MaxLength(1000)
  resolution: string;

  @ApiPropertyOptional({ enum: UserAction, description: 'Action to take against reported users' })
  @IsOptional()
  @IsEnum(UserAction)
  userAction?: UserAction;
}

export class CreateBlockDto {
  @ApiProperty({ description: 'ID of the user to block' })
  @IsUUID()
  blockedUserId: string;

  @ApiPropertyOptional({ description: 'Reason for blocking (for your records)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class GetReportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportReason })
  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;
}
