import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { AuditService } from '../audit/audit.service';

// Public profile reads are cached for 2 minutes.
// Invalidated on profile update via cacheInvalidate().
const PROFILE_CACHE_TTL = 120;
const DISPLAY_NAME_MAX_LENGTH = 50;
const BIO_MAX_LENGTH = 500;
const LOCATION_MAX_LENGTH = 100;
const MAX_INTERESTS = 10;

function hasOwnProperty<T extends object>(value: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function sanitizeNullableString(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
  minLength = 0,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  if (trimmedValue.length > maxLength) {
    throw new BadRequestException(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  if (trimmedValue.length < minLength) {
    throw new BadRequestException(`${fieldName} must be at least ${minLength} characters`);
  }

  return trimmedValue;
}

function sanitizeInterests(interests: string[]): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const interest of interests) {
    const trimmedInterest = interest.trim();
    if (trimmedInterest.length === 0) {
      continue;
    }

    const dedupeKey = trimmedInterest.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    sanitized.push(trimmedInterest);

    if (sanitized.length === MAX_INTERESTS) {
      break;
    }
  }

  return sanitized;
}

function parseDateOfBirth(
  value: string | null | undefined,
  logger: Logger,
  userId: string,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    logger.warn(`Profile update rejected for ${userId}: invalid dateOfBirth`);
    throw new BadRequestException('dateOfBirth must be a valid date');
  }

  return parsedDate;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function areDatesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return left.getTime() === right.getTime();
}

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auditService: AuditService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create default profile if not exists
      return this.prisma.profile.create({
        data: { userId },
      });
    }

    return profile;
  }

  async getProfileById(profileId: string) {
    const cacheKey = `profile:id:${profileId}`;
    const cached = await this.redis.cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    this.redis.cacheSet(cacheKey, profile, PROFILE_CACHE_TTL).catch(() => {});
    return profile;
  }

  async getProfileByUserId(userId: string) {
    const cacheKey = `profile:user:${userId}`;
    const cached = await this.redis.cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    this.redis.cacheSet(`profile:user:${userId}`, profile, PROFILE_CACHE_TTL).catch(() => {});
    return profile;
  }

  async getPublicProfile(userId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        veteranDetails: {
          select: {
            branch: true,
            rank: true,
            mos: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check if profile is visible
    if (!user.profile.isVisible && userId !== viewerId) {
      throw new ForbiddenException('Profile is private');
    }

    // Check if viewer is blocked
    if (viewerId) {
      const blocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: viewerId },
            { blockerId: viewerId, blockedId: userId },
          ],
        },
      });

      if (blocked) {
        throw new ForbiddenException('Profile not available');
      }
    }

    return {
      id: user.id,
      role: user.role,
      displayName: user.profile.displayName,
      bio: user.profile.bio,
      gender: user.profile.gender,
      age: user.profile.dateOfBirth 
        ? Math.floor((Date.now() - user.profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      location: user.profile.location,
      photoUrl: user.profile.profileImageUrl,
      profileImageUrl: user.profile.profileImageUrl,
      interests: user.profile.interests,
      veteranDetails: user.veteranDetails,
      lastActiveAt: user.profile.lastActiveAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Ensure profile exists
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: { userId },
      });
    }

    const data: Prisma.ProfileUpdateInput = {};
    const changedFields: string[] = [];

    if (hasOwnProperty(dto, 'displayName')) {
      const displayName = sanitizeNullableString(
        dto.displayName,
        'displayName',
        DISPLAY_NAME_MAX_LENGTH,
        2,
      );

      data.displayName = displayName;
      if (profile.displayName !== displayName) {
        changedFields.push('displayName');
      }
    }

    if (hasOwnProperty(dto, 'bio')) {
      const bio = sanitizeNullableString(dto.bio, 'bio', BIO_MAX_LENGTH);
      data.bio = bio;
      if (profile.bio !== bio) {
        changedFields.push('bio');
      }
    }

    if (hasOwnProperty(dto, 'gender')) {
      const gender = dto.gender ?? null;
      data.gender = gender;
      if (profile.gender !== gender) {
        changedFields.push('gender');
      }
    }

    if (hasOwnProperty(dto, 'dateOfBirth')) {
      const dateOfBirth = parseDateOfBirth(dto.dateOfBirth, this.logger, userId);
      data.dateOfBirth = dateOfBirth;
      if (!areDatesEqual(profile.dateOfBirth, dateOfBirth ?? null)) {
        changedFields.push('dateOfBirth');
      }
    }

    if (hasOwnProperty(dto, 'location')) {
      const location = sanitizeNullableString(dto.location, 'location', LOCATION_MAX_LENGTH);
      data.location = location;
      if (profile.location !== location) {
        changedFields.push('location');
      }
    }

    if (hasOwnProperty(dto, 'latitude')) {
      const latitude = dto.latitude ?? null;
      data.latitude = latitude;
      if (profile.latitude !== latitude) {
        changedFields.push('latitude');
      }
    }

    if (hasOwnProperty(dto, 'longitude')) {
      const longitude = dto.longitude ?? null;
      data.longitude = longitude;
      if (profile.longitude !== longitude) {
        changedFields.push('longitude');
      }
    }

    if (hasOwnProperty(dto, 'interests') && Array.isArray(dto.interests)) {
      const interests = sanitizeInterests(dto.interests);
      data.interests = interests;
      if (!areStringArraysEqual(profile.interests, interests)) {
        changedFields.push('interests');
      }
    }

    if (hasOwnProperty(dto, 'isVisible')) {
      const isVisible = dto.isVisible ?? profile.isVisible;
      data.isVisible = isVisible;
      if (profile.isVisible !== isVisible) {
        changedFields.push('isVisible');
      }
    }

    if (changedFields.length === 0) {
      return profile;
    }

    try {
      const updatedProfile = await this.prisma.profile.update({
        where: { userId },
        data,
      });

      await Promise.allSettled([
        this.redis.cacheInvalidate(`profile:user:${userId}`),
        this.redis.cacheInvalidate(`profile:id:${updatedProfile.id}`),
        this.redis.cacheInvalidate('brothers:search:*'),
      ]);

      await this.auditService.log({
        userId,
        action: 'profile.updated',
        resource: 'profile',
        resourceId: updatedProfile.id,
        metadata: { changedFields },
      });

      return updatedProfile;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Profile update failed for ${userId}. changedFields=${changedFields.join(',') || 'none'} reason=${reason}`,
      );
      throw error;
    }
  }

  async updateProfileImage(userId: string, imageUrl: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { profileImageUrl: imageUrl },
    });
  }

  async updateLastActive(userId: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { lastActiveAt: new Date() },
    });
  }

  async setVisibility(userId: string, isVisible: boolean) {
    return this.prisma.profile.update({
      where: { userId },
      data: { isVisible },
    });
  }
}
