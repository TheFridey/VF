import { BadRequestException } from '@nestjs/common';
import {
  getVerificationResourceType,
  validateVerificationEvidenceFile,
} from './upload-validation';

describe('upload validation helpers', () => {
  it('accepts allowed verification image uploads', () => {
    expect(() =>
      validateVerificationEvidenceFile({
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024,
      }),
    ).not.toThrow();
  });

  it('rejects unsupported verification evidence types', () => {
    expect(() =>
      validateVerificationEvidenceFile({
        mimetype: 'application/zip',
        size: 1024,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects oversized verification files', () => {
    expect(() =>
      validateVerificationEvidenceFile({
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024,
      }),
    ).toThrow(BadRequestException);
  });

  it('maps document uploads to the raw Cloudinary resource type', () => {
    expect(getVerificationResourceType('application/pdf')).toBe('raw');
    expect(getVerificationResourceType('video/mp4')).toBe('video');
    expect(getVerificationResourceType('image/webp')).toBe('image');
  });
});
