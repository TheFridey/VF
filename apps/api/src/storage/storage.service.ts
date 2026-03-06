import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Type for multer file
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly useLocalStorage: boolean;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.useLocalStorage = !this.configService.get('AWS_ACCESS_KEY_ID');
    
    // Ensure upload directory exists
    if (this.useLocalStorage && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadProfileImage(userId: string, file: UploadedFile): Promise<string> {
    this.validateImageFile(file);

    const filename = `${crypto.randomUUID()}-${file.originalname}`;
    const key = `profiles/${userId}/${filename}`;

    if (this.useLocalStorage) {
      return this.saveToLocal(key, file.buffer);
    }

    // TODO: Implement S3 upload when configured
    return this.saveToLocal(key, file.buffer);
  }

  async uploadVerificationEvidence(userId: string, file: UploadedFile): Promise<string> {
    this.validateEvidenceFile(file);

    const filename = `${crypto.randomUUID()}-${file.originalname}`;
    const key = `evidence/${userId}/${filename}`;

    if (this.useLocalStorage) {
      return this.saveToLocal(key, file.buffer);
    }

    // TODO: Implement S3 upload when configured
    return this.saveToLocal(key, file.buffer);
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useLocalStorage) {
      const filepath = path.join(this.uploadDir, key);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      return;
    }

    // TODO: Implement S3 delete when configured
    this.logger.warn('S3 delete not implemented');
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useLocalStorage) {
      // For local storage, return a direct path
      return `/uploads/${key}`;
    }

    // TODO: Implement S3 signed URL when configured
    return `/uploads/${key}`;
  }

  private saveToLocal(key: string, buffer: Buffer): string {
    const filepath = path.join(this.uploadDir, key);
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${key}`;
  }

  private validateImageFile(file: UploadedFile): void {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB.');
    }
  }

  private validateEvidenceFile(file: UploadedFile): void {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images and PDFs are allowed.');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }
  }
}
