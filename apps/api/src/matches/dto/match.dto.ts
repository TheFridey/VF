import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum MatchType {
  BROTHERS = 'brothers',
}

export enum MatchStatus {
  ACTIVE = 'active',
  UNMATCHED = 'unmatched',
  BLOCKED = 'blocked',
}

export class MatchFiltersDto {
  @ApiPropertyOptional({ enum: MatchType })
  @IsOptional()
  @IsEnum(MatchType)
  type?: MatchType;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class MatchDto {
  id: string;
  type: MatchType;
  status: MatchStatus;
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
