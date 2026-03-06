import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDeletionDto {
  @ApiProperty({ description: 'Current password for confirmation' })
  @IsString()
  @MinLength(1)
  password: string;
}
