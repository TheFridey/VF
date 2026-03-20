import { BadRequestException } from '@nestjs/common';

export const PHOTO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_UPLOAD_FILE_TYPE = /^image\/(jpeg|png|webp|gif)$/;
export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_FILE_TYPE = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

export const VERIFICATION_MAX_FILES = 5;

export const ACCEPTED_VERIFICATION_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
] as const;

export const ACCEPTED_VERIFICATION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

export const ACCEPTED_VERIFICATION_DOCUMENT_TYPES = [
  'application/pdf',
] as const;

export const ACCEPTED_VERIFICATION_TYPES = [
  ...ACCEPTED_VERIFICATION_VIDEO_TYPES,
  ...ACCEPTED_VERIFICATION_IMAGE_TYPES,
  ...ACCEPTED_VERIFICATION_DOCUMENT_TYPES,
] as const;

export function isVerificationVideoType(mimetype: string) {
  return ACCEPTED_VERIFICATION_VIDEO_TYPES.includes(
    mimetype as (typeof ACCEPTED_VERIFICATION_VIDEO_TYPES)[number],
  );
}

export function getVerificationResourceType(mimetype: string): 'image' | 'video' | 'raw' {
  if (isVerificationVideoType(mimetype)) {
    return 'video';
  }

  if (
    ACCEPTED_VERIFICATION_DOCUMENT_TYPES.includes(
      mimetype as (typeof ACCEPTED_VERIFICATION_DOCUMENT_TYPES)[number],
    )
  ) {
    return 'raw';
  }

  return 'image';
}

export function getVerificationMaxSizeBytes(mimetype: string) {
  return isVerificationVideoType(mimetype) ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
}

export function validateVerificationEvidenceFile(file: { mimetype: string; size: number }) {
  if (
    !ACCEPTED_VERIFICATION_TYPES.includes(
      file.mimetype as (typeof ACCEPTED_VERIFICATION_TYPES)[number],
    )
  ) {
    throw new BadRequestException(
      `Invalid file type (${file.mimetype}). Upload a video, photo, or PDF of your HM Armed Forces Veteran Card.`,
    );
  }

  const maxSize = getVerificationMaxSizeBytes(file.mimetype);
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
    );
  }
}
