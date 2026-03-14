import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { UpdateProfileDto } from './dto/profile.dto';

// Public profile reads are cached for 2 minutes.
// Invalidated on profile update via cacheInvalidate().
const PROFILE_CACHE_TTL = 120;

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
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

    return this.prisma.profile.update({
      where: { userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        location: dto.location,
        latitude: dto.latitude,
        longitude: dto.longitude,
        interests: dto.interests,
        isVisible: dto.isVisible,
      },
    }).then((updated) => {
      // Invalidate cached profiles for this user
      this.redis.cacheInvalidate(`profile:user:${userId}`).catch(() => {});
      this.redis.cacheInvalidate(`brothers:search:*`).catch(() => {});
      return updated;
    });
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
