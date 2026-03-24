import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(50)
  excerpt: string;

  @IsString()
  @MinLength(500)
  body: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

export class UpdatePostDto extends CreatePostDto {}

export class TrackPostViewDto {
  @IsString()
  postId: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readTimeMs?: number;
}
