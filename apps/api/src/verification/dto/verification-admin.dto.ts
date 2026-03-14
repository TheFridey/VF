import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum BulkVerificationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class GetVerificationRequestsDto {
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
