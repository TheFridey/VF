import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  CIVILIAN = 'CIVILIAN',
  VETERAN_UNVERIFIED = 'VETERAN_UNVERIFIED',
  VETERAN_VERIFIED = 'VETERAN_VERIFIED',
  VETERAN_PAID = 'VETERAN_PAID',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_DELETION = 'PENDING_DELETION',
  DELETED = 'DELETED',
}

export class GetUsersDto {
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

  @ApiPropertyOptional({ description: 'Search by email or display name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Days to suspend (for SUSPENDED status)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  suspensionDays?: number;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class GetAuditLogsDto {
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

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by action type' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by resource type' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
