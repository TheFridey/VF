import { IsString, IsOptional, IsUrl, IsArray, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  content: string; // First post content
}

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  content: string;
}

export class CreateBusinessListingDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

export class CreateMentorProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  headline: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  expertise: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  availability?: string;
}

export class SendMentorRequestDto {
  @ApiProperty()
  @IsString()
  mentorId: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  message: string;
}

export class RespondMentorRequestDto {
  @ApiProperty()
  @IsBoolean()
  accept: boolean;
}

export class CreateBusinessJobListingDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  employmentType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  summary?: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  description: string;
}

export class UpdateBusinessJobStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class ApplyBusinessJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
