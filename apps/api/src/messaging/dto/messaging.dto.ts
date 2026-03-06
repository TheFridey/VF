import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the match/conversation' })
  @IsUUID()
  matchId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class GetMessagesDto {
  @ApiPropertyOptional({ description: 'Get messages before this timestamp' })
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiPropertyOptional({ description: 'Get messages after this timestamp' })
  @IsOptional()
  @IsDateString()
  after?: string;

  @ApiPropertyOptional({ description: 'Number of messages to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateMessageDto {
  @ApiProperty({ description: 'Updated message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
