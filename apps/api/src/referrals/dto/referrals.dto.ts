import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordReferralShareDto {
  @IsString()
  @MaxLength(32)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  surface?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  connectionId?: string;
}
