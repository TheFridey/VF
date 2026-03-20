import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  CreateThreadDto, CreatePostDto, CreateBusinessListingDto,
  CreateMentorProfileDto, SendMentorRequestDto,
} from './dto/bia.dto';
import { UK_REGIMENTS } from '../common/constants/regiments';

const BIA_TIERS = ['BIA_BASIC', 'BIA_PLUS'];
const BIA_PLUS_TIERS = ['BIA_PLUS'];
const ADMIN_ROLES = ['ADMIN', 'MODERATOR'];

// Forum categories change infrequently — cache for 10 minutes per tier level
const CATEGORIES_CACHE_TTL = 600;

@Injectable()
export class BiaService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private subscriptions: SubscriptionsService,
  ) {}

  private async isStaffUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return !!user && ADMIN_ROLES.includes(user.role as string);
  }

  private async requireFeature(userId: string, feature: 'privateForums' | 'theBunker' | 'businessDirectory' | 'mentorshipTools' | 'careerResources') {
    if (await this.isStaffUser(userId)) return;
    const hasAccess = await this.subscriptions.checkFeatureAccess(userId, feature as any);
    if (!hasAccess) throw new ForbiddenException('This feature requires a BIA membership. Upgrade your plan to access.');
  }

  private async requireRegimentAccess(userId: string, regimentSlug: string) {
    // Cast to any because 'regiment' is a new column not yet in the generated Prisma client types.
    // Run `prisma generate` after the migration to remove these casts.
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { role: true, veteranDetails: { select: { regiment: true } } },
    });
    if (!user) throw new ForbiddenException('User not found.');
    if (ADMIN_ROLES.includes(user.role as string)) return; // admins bypass
    if (user.veteranDetails?.regiment !== regimentSlug) {
      throw new ForbiddenException('This forum is only available to veterans of this regiment.');
    }
  }

  // ─── Regiment Forums (public listing + member access) ─────────────────────

  async getRegiments() {
    // Count active users per regiment value in veteran_details.
    // Cast to any: 'regiment' is a new column not yet reflected in the generated Prisma client types.
    const rawCounts: Array<{ regiment: string | null; _count: { _all: number } }> =
      await (this.prisma as any).veteranDetails.groupBy({
        by: ['regiment'],
        where: { regiment: { not: null } },
        _count: { _all: true },
      });
    const countMap: Record<string, number> = {};
    for (const row of rawCounts) {
      if (row.regiment) countMap[row.regiment] = row._count._all;
    }
    const regiments = UK_REGIMENTS.map((r) => ({
      ...r,
      userCount: countMap[r.slug] ?? 0,
    }));
    return { regiments };
  }

  async getRegimentForumCategories(userId: string, regimentSlug: string) {
    await this.requireRegimentAccess(userId, regimentSlug);
    const regiment = UK_REGIMENTS.find((r) => r.slug === regimentSlug);
    if (!regiment) throw new NotFoundException('Regiment not found.');

    // Cast to any: 'regiment' and 'icon' are new columns not yet in the generated Prisma client types.
    const categories: any[] = await (this.prisma as any).forumCategory.findMany({
      where: { tier: 'REGIMENT', regiment: regimentSlug, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { threads: true } },
      },
    });

    const enriched = await Promise.all(categories.map(async (cat: any) => {
      const latest = await this.prisma.forumThread.findFirst({
        where: { categoryId: cat.id },
        orderBy: { lastPostAt: 'desc' },
        include: {
          author: { select: { profile: { select: { displayName: true } } } },
        },
      });
      return { ...cat, threadCount: cat._count?.threads ?? 0, latestThread: latest };
    }));

    return { categories: enriched, regiment };
  }

  // ─── Forums ───────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const isStaff = await this.isStaffUser(userId);
    const sub = await this.prisma.membership.findUnique({ where: { userId } });
    const tier = sub?.tier || 'FREE';
    const isBiaPlus = isStaff || BIA_PLUS_TIERS.includes(tier);
    const isBia = isStaff || BIA_TIERS.includes(tier);

    if (!isBia) throw new ForbiddenException('BIA membership required to access forums.');

    // Cache key includes tier so BIA and BIA_PLUS get their own cached results
    const cacheKey = `bia:categories:${isStaff ? 'staff' : isBiaPlus ? 'plus' : 'basic'}`;
    const cached = await this.redis.cacheGet(cacheKey);
    if (cached) return { categories: cached, tier: isStaff ? 'STAFF' : tier };

    const allowedTiers = isBiaPlus ? ['BIA', 'BIA_PLUS'] : ['BIA'];

    const categories = await this.prisma.forumCategory.findMany({
      where: { tier: { in: allowedTiers }, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { threads: true } },
      },
    });

    // Attach latest thread to each category
    const enriched = await Promise.all(categories.map(async (cat) => {
      const latest = await this.prisma.forumThread.findFirst({
        where: { categoryId: cat.id },
        orderBy: { lastPostAt: 'desc' },
        include: {
          author: { select: { profile: { select: { displayName: true, profileImageUrl: true } } } },
        },
      });
      return { ...cat, threadCount: cat._count.threads, latestThread: latest };
    }));

    this.redis.cacheSet(cacheKey, enriched, CATEGORIES_CACHE_TTL).catch(() => {});
    return { categories: enriched, tier: isStaff ? 'STAFF' : tier };
  }

  async getThreads(userId: string, categorySlug: string, page = 1, limit = 20) {
    const category = await this.prisma.forumCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.tier === 'REGIMENT') {
      await this.requireRegimentAccess(userId, (category as any).regiment!);
    } else {
      await this.requireFeature(userId, category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');
    }

    const skip = (page - 1) * limit;
    const [threads, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: { categoryId: category.id },
        orderBy: [{ isPinned: 'desc' }, { lastPostAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.forumThread.count({ where: { categoryId: category.id } }),
    ]);

    return { category, threads, total, page, pages: Math.ceil(total / limit) };
  }

  async getThread(userId: string, threadId: string, page = 1, limit = 20) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { category: true, author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } } },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    if (thread.category.tier === 'REGIMENT') {
      await this.requireRegimentAccess(userId, (thread.category as any).regiment!);
    } else {
      await this.requireFeature(userId, thread.category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');
    }

    // Increment view count
    await this.prisma.forumThread.update({ where: { id: threadId }, data: { viewCount: { increment: 1 } } });

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.forumPost.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, role: true, profile: { select: { displayName: true, profileImageUrl: true } }, veteranDetails: { select: { branch: true, rank: true } } } },
        },
      }),
      this.prisma.forumPost.count({ where: { threadId } }),
    ]);

    return { thread, posts, total, page, pages: Math.ceil(total / limit) };
  }

  async createThread(userId: string, categorySlug: string, dto: CreateThreadDto) {
    const category = await this.prisma.forumCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.tier === 'REGIMENT') {
      await this.requireRegimentAccess(userId, (category as any).regiment!);
    } else {
      await this.requireFeature(userId, category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');
    }

    const thread = await this.prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId: userId,
        title: dto.title,
        postCount: 1,
        posts: {
          create: { authorId: userId, content: dto.content },
        },
      },
      include: { author: { select: { profile: { select: { displayName: true } } } } },
    });

    return thread;
  }

  async createPost(userId: string, threadId: string, dto: CreatePostDto) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { category: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.isLocked) throw new ForbiddenException('This thread is locked.');

    if (thread.category.tier === 'REGIMENT') {
      await this.requireRegimentAccess(userId, (thread.category as any).regiment!);
    } else {
      await this.requireFeature(userId, thread.category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');
    }

    const post = await this.prisma.forumPost.create({
      data: { threadId, authorId: userId, content: dto.content },
      include: { author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } }, veteranDetails: { select: { branch: true, rank: true } } } } },
    });

    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: { postCount: { increment: 1 }, lastPostAt: new Date() },
    });

    return post;
  }

  // ─── Business Directory ───────────────────────────────────────────────────

  async getBusinessListings(category?: string) {
    // Public endpoint — visible to all, only approved listings shown
    const where: any = { isApproved: true };
    if (category) where.category = category;

    const listings = await this.prisma.businessListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { profile: { select: { displayName: true, profileImageUrl: true } } } },
      },
    });

    return { listings };
  }

  async createBusinessListing(userId: string, dto: CreateBusinessListingDto) {
    await this.requireFeature(userId, 'businessDirectory');

    // One listing per user (can update)
    const existing = await this.prisma.businessListing.findFirst({ where: { userId } });
    if (existing) {
      return this.prisma.businessListing.update({
        where: { id: existing.id },
        data: { ...dto, isApproved: false }, // Re-approve on edit
      });
    }

    return this.prisma.businessListing.create({
      data: { ...dto, userId },
    });
  }

  async getMyListing(userId: string) {
    await this.requireFeature(userId, 'businessDirectory');
    return this.prisma.businessListing.findFirst({ where: { userId } });
  }

  // ─── Mentorship ───────────────────────────────────────────────────────────

  async getMentors(userId: string) {
    await this.requireFeature(userId, 'mentorshipTools');
    const mentors = await this.prisma.mentorProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true, location: true } }, veteranDetails: { select: { branch: true, rank: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { mentors };
  }

  async createOrUpdateMentorProfile(userId: string, dto: CreateMentorProfileDto) {
    await this.requireFeature(userId, 'mentorshipTools');

    const existing = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (existing) {
      return this.prisma.mentorProfile.update({ where: { userId }, data: dto });
    }
    return this.prisma.mentorProfile.create({ data: { ...dto, userId } });
  }

  async sendMentorRequest(userId: string, dto: SendMentorRequestDto) {
    await this.requireFeature(userId, 'mentorshipTools');
    if (userId === dto.mentorId) throw new BadRequestException('You cannot request yourself as a mentor.');

    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id: dto.mentorId } });
    if (!mentor) throw new NotFoundException('Mentor not found');

    const existing = await this.prisma.mentorRequest.findFirst({
      where: { mentorId: dto.mentorId, menteeId: userId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('You already have a pending request with this mentor.');

    return this.prisma.mentorRequest.create({
      data: { mentorId: dto.mentorId, menteeId: userId, message: dto.message },
    });
  }

  async respondToMentorRequest(userId: string, requestId: string, accept: boolean) {
    await this.requireFeature(userId, 'mentorshipTools');
    const request = await this.prisma.mentorRequest.findUnique({
      where: { id: requestId },
      include: { mentor: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.mentor.userId !== userId) throw new ForbiddenException('Not your request to respond to.');

    return this.prisma.mentorRequest.update({
      where: { id: requestId },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
    });
  }

  async getMyMentorRequests(userId: string) {
    await this.requireFeature(userId, 'mentorshipTools');
    const profile = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    const incoming = profile
      ? await this.prisma.mentorRequest.findMany({
          where: { mentorId: profile.id },
          include: { mentee: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const outgoing = await this.prisma.mentorRequest.findMany({
      where: { menteeId: userId },
      include: { mentor: { include: { user: { select: { profile: { select: { displayName: true, profileImageUrl: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return { incoming, outgoing, myProfile: profile };
  }

  // ─── Career Resources ─────────────────────────────────────────────────────

  async getCareerResources(userId: string, category?: string) {
    await this.requireFeature(userId, 'careerResources');
    const where: any = { isPublished: true };
    if (category) where.category = category;

    const resources = await this.prisma.careerResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { profile: { select: { displayName: true } } } },
      },
    });

    const categories = [...new Set(resources.map((r) => r.category))];
    return { resources, categories };
  }
}
