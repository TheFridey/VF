import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export enum BulkVerificationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class GetVerificationRequestsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}

export class BulkReviewVerificationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  requestIds: string[];

  @ApiProperty({ enum: BulkVerificationDecision })
  @IsEnum(BulkVerificationDecision)
  decision: BulkVerificationDecision;

  @ApiPropertyOptional({ description: 'Optional approval notes or required rejection reason' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
