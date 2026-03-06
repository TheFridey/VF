import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Army veteran, love hiking and fishing' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: '1985-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ type: [String], enum: Gender })
  @IsOptional()
  @IsArray()
  @IsEnum(Gender, { each: true })
  interestedIn?: Gender[];

  @ApiPropertyOptional({ example: 'San Diego, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 32.7157 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -117.1611 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ type: [String], enum: Gender, description: 'Genders user is looking for' })
  @IsOptional()
  @IsArray()
  @IsEnum(Gender, { each: true })
  lookingFor?: Gender[];

  @ApiPropertyOptional({ example: ['hiking', 'fishing', 'photography'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showVeteranStatus?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  showServiceDetails?: boolean;
}
