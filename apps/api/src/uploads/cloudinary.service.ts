import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  /**
   * Upload an image to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'profiles',
    userId?: string,
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        reject(new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP, GIF'));
        return;
      }

      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        reject(new BadRequestException('File too large. Maximum size is 10MB'));
        return;
      }

      const uploadOptions: any = {
        folder: `veteranfinder/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions
          { quality: 'auto:good' }, // Auto quality
          { fetch_format: 'auto' }, // Auto format (WebP if supported)
        ],
      };

      // Add user ID to public ID for organization
      if (userId) {
        uploadOptions.public_id = `${userId}_${Date.now()}`;
      }

      // Upload from buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(new BadRequestException('Failed to upload image'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Upload failed - no result'));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteImages(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;

    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      this.logger.error(`Failed to delete images: ${error.message}`);
    }
  }

  /**
   * Generate a thumbnail URL
   */
  getThumbnailUrl(publicId: string, width: number = 200, height: number = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  /**
   * Generate optimized URL for different sizes
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    const options: any = {
      quality: 'auto',
      fetch_format: 'auto',
    };

    if (width) options.width = width;
    if (height) options.height = height;
    if (width || height) options.crop = 'limit';

    return cloudinary.url(publicId, options);
  }
}
