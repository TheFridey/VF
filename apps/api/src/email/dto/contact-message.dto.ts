import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const CONTACT_SUBJECTS = [
  'general',
  'support',
  'verification',
  'privacy',
  'feedback',
  'business',
  'other',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export class ContactMessageDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'john.doe@veteranfinder.co.uk' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: CONTACT_SUBJECTS, example: 'support' })
  @IsIn(CONTACT_SUBJECTS)
  subject!: ContactSubject;

  @ApiProperty({ example: 'I need help accessing my account.' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}
