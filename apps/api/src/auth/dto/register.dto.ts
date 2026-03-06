import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
