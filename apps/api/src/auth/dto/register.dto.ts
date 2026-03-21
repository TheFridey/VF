import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ enum: ['veteran'], default: 'veteran' })
  @IsEnum(['veteran'])
  userType: 'veteran';

  @ApiPropertyOptional({ example: 'VFABC1234', description: 'Optional invite code from a verified veteran' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  referralCode?: string;
}
