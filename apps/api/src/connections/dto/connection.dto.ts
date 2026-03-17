import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ConnectionTypeFilter {
  BROTHERS = 'brothers',
}

export enum ConnectionStatusFilter {
  ACTIVE = 'active',
  UNMATCHED = 'unmatched',
  BLOCKED = 'blocked',
}

export class MatchFiltersDto {
  @ApiPropertyOptional({ enum: ConnectionTypeFilter })
  @IsOptional()
  @IsEnum(ConnectionTypeFilter)
  type?: ConnectionTypeFilter;

  @ApiPropertyOptional({ enum: ConnectionStatusFilter })
  @IsOptional()
  @IsEnum(ConnectionStatusFilter)
  status?: ConnectionStatusFilter;
}

export class ConnectionDto {
  id: string;
  type: ConnectionTypeFilter;
  status: ConnectionStatusFilter;
  matchedUser: {
    id: string;
    displayName: string;
    profileImage?: string;
    isVerified: boolean;
    lastActive?: Date;
  };
  lastMessage?: {
    content: string;
    sentAt: Date;
    isFromMe: boolean;
  };
  unreadCount: number;
  createdAt: Date;
}
