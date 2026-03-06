import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

const MAX_PHOTOS_PER_USER = 6;

@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Get all photos for a user's profile
   */
  async getPhotos(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.photos;
  }

  /**
   * Upload a new photo
   */
  async uploadPhoto(userId: string, file: Express.Multer.File) {
    // Get user's profile
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found. Please create a profile first.');
    }

    // Check photo limit
    if (profile.photos.length >= MAX_PHOTOS_PER_USER) {
      throw new BadRequestException(`Maximum ${MAX_PHOTOS_PER_USER} photos allowed`);
    }

    // Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file, 'profiles', userId);

    // Determine if this should be the primary photo
    const isPrimary = profile.photos.length === 0;
    const order = profile.photos.length;

    // Create photo record
    const photo = await this.prisma.photo.create({
      data: {
        profileId: profile.id,
        url: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
        width: uploadResult.width,
        height: uploadResult.height,
        isPrimary,
        order,
      },
    });

    // If this is the first photo, update the profile's profileImageUrl
    if (isPrimary) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { profileImageUrl: uploadResult.secureUrl },
      });
    }

    return photo;
  }

  /**
   * Delete a photo
   */
  async deletePhoto(userId: string, photoId: string) {
    // Get the photo with profile
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        profile: true,
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Verify ownership
    if (photo.profile.userId !== userId) {
      throw new ForbiddenException('You can only delete your own photos');
    }

    // Delete from Cloudinary
    await this.cloudinaryService.deleteImage(photo.publicId);

    // Delete from database
    await this.prisma.photo.delete({
      where: { id: photoId },
    });

    // If this was the primary photo, set a new primary
    if (photo.isPrimary) {
      const nextPhoto = await this.prisma.photo.findFirst({
        where: { profileId: photo.profileId },
        orderBy: { order: 'asc' },
      });

      if (nextPhoto) {
        await this.prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true },
        });
        await this.prisma.profile.update({
          where: { id: photo.profileId },
          data: { profileImageUrl: nextPhoto.url },
        });
      } else {
        // No more photos, clear profileImageUrl
        await this.prisma.profile.update({
          where: { id: photo.profileId },
          data: { profileImageUrl: null },
        });
      }
    }

    // Reorder remaining photos
    const remainingPhotos = await this.prisma.photo.findMany({
      where: { profileId: photo.profileId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingPhotos.length; i++) {
      if (remainingPhotos[i].order !== i) {
        await this.prisma.photo.update({
          where: { id: remainingPhotos[i].id },
          data: { order: i },
        });
      }
    }

    return { success: true };
  }

  /**
   * Set a photo as primary
   */
  async setPrimaryPhoto(userId: string, photoId: string) {
    // Get the photo with profile
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        profile: true,
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Verify ownership
    if (photo.profile.userId !== userId) {
      throw new ForbiddenException('You can only modify your own photos');
    }

    // Unset current primary
    await this.prisma.photo.updateMany({
      where: { profileId: photo.profileId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary
    await this.prisma.photo.update({
      where: { id: photoId },
      data: { isPrimary: true },
    });

    // Update profile's profileImageUrl
    await this.prisma.profile.update({
      where: { id: photo.profileId },
      data: { profileImageUrl: photo.url },
    });

    return { success: true };
  }

  /**
   * Reorder photos
   */
  async reorderPhotos(userId: string, photoIds: string[]) {
    // Get user's profile
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Verify all photo IDs belong to this user
    const userPhotoIds = profile.photos.map(p => p.id);
    for (const photoId of photoIds) {
      if (!userPhotoIds.includes(photoId)) {
        throw new ForbiddenException('Invalid photo ID');
      }
    }

    // Update order for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await this.prisma.photo.update({
        where: { id: photoIds[i] },
        data: { order: i },
      });
    }

    // The first photo in the order should be primary
    if (photoIds.length > 0) {
      // Unset all primary
      await this.prisma.photo.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });

      // Set first as primary
      const firstPhoto = await this.prisma.photo.update({
        where: { id: photoIds[0] },
        data: { isPrimary: true },
      });

      // Update profile
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { profileImageUrl: firstPhoto.url },
      });
    }

    return { success: true };
  }

  /**
   * Delete all photos for a user (used in account deletion)
   */
  async deleteAllPhotosForUser(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: true,
      },
    });

    if (!profile || profile.photos.length === 0) {
      return;
    }

    // Delete from Cloudinary
    const publicIds = profile.photos.map(p => p.publicId);
    await this.cloudinaryService.deleteImages(publicIds);

    // Delete from database
    await this.prisma.photo.deleteMany({
      where: { profileId: profile.id },
    });
  }
}
