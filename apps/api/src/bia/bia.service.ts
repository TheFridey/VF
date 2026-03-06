import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  CreateThreadDto, CreatePostDto, CreateBusinessListingDto,
  CreateMentorProfileDto, SendMentorRequestDto,
} from './dto/bia.dto';

const BIA_TIERS = ['BIA_BASIC', 'BIA_PLUS', 'BUNDLE_PREMIUM_BIA'];
const BIA_PLUS_TIERS = ['BIA_PLUS', 'BUNDLE_PREMIUM_BIA'];

@Injectable()
export class BiaService {
  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
  ) {}

  private async requireFeature(userId: string, feature: 'privateForums' | 'theBunker' | 'businessDirectory' | 'mentorshipTools' | 'careerResources') {
    const hasAccess = await this.subscriptions.checkFeatureAccess(userId, feature as any);
    if (!hasAccess) throw new ForbiddenException('This feature requires a BIA membership. Upgrade your plan to access.');
  }

  // ─── Forums ───────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const sub = await (this.prisma as any).subscription.findUnique({ where: { userId } });
    const tier = sub?.tier || 'FREE';
    const isBiaPlus = BIA_PLUS_TIERS.includes(tier);
    const isBia = BIA_TIERS.includes(tier);

    if (!isBia) throw new ForbiddenException('BIA membership required to access forums.');

    const allowedTiers = isBiaPlus ? ['BIA', 'BIA_PLUS'] : ['BIA'];

    const categories = await (this.prisma as any).forumCategory.findMany({
      where: { tier: { in: allowedTiers }, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { threads: true } },
      },
    });

    // Attach latest thread to each category
    const enriched = await Promise.all(categories.map(async (cat: any) => {
      const latest = await (this.prisma as any).forumThread.findFirst({
        where: { categoryId: cat.id },
        orderBy: { lastPostAt: 'desc' },
        include: {
          author: { select: { profile: { select: { displayName: true, profileImageUrl: true } } } },
        },
      });
      return { ...cat, threadCount: cat._count.threads, latestThread: latest };
    }));

    return { categories: enriched, tier };
  }

  async getThreads(userId: string, categorySlug: string, page = 1, limit = 20) {
    const category = await (this.prisma as any).forumCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new NotFoundException('Category not found');

    await this.requireFeature(userId, category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');

    const skip = (page - 1) * limit;
    const [threads, total] = await Promise.all([
      (this.prisma as any).forumThread.findMany({
        where: { categoryId: category.id },
        orderBy: [{ isPinned: 'desc' }, { lastPostAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } },
          _count: { select: { posts: true } },
        },
      }),
      (this.prisma as any).forumThread.count({ where: { categoryId: category.id } }),
    ]);

    return { category, threads, total, page, pages: Math.ceil(total / limit) };
  }

  async getThread(userId: string, threadId: string, page = 1, limit = 20) {
    const thread = await (this.prisma as any).forumThread.findUnique({
      where: { id: threadId },
      include: { category: true, author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } } },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    await this.requireFeature(userId, thread.category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');

    // Increment view count
    await (this.prisma as any).forumThread.update({ where: { id: threadId }, data: { viewCount: { increment: 1 } } });

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      (this.prisma as any).forumPost.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, role: true, profile: { select: { displayName: true, profileImageUrl: true } }, veteranDetails: { select: { branch: true, rank: true } } } },
        },
      }),
      (this.prisma as any).forumPost.count({ where: { threadId } }),
    ]);

    return { thread, posts, total, page, pages: Math.ceil(total / limit) };
  }

  async createThread(userId: string, categorySlug: string, dto: CreateThreadDto) {
    const category = await (this.prisma as any).forumCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new NotFoundException('Category not found');

    await this.requireFeature(userId, category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');

    const thread = await (this.prisma as any).forumThread.create({
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
    const thread = await (this.prisma as any).forumThread.findUnique({
      where: { id: threadId },
      include: { category: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.isLocked) throw new ForbiddenException('This thread is locked.');

    await this.requireFeature(userId, thread.category.tier === 'BIA_PLUS' ? 'theBunker' : 'privateForums');

    const post = await (this.prisma as any).forumPost.create({
      data: { threadId, authorId: userId, content: dto.content },
      include: { author: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } }, veteranDetails: { select: { branch: true, rank: true } } } } },
    });

    await (this.prisma as any).forumThread.update({
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

    const listings = await (this.prisma as any).businessListing.findMany({
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
    const existing = await (this.prisma as any).businessListing.findFirst({ where: { userId } });
    if (existing) {
      return (this.prisma as any).businessListing.update({
        where: { id: existing.id },
        data: { ...dto, isApproved: false }, // Re-approve on edit
      });
    }

    return (this.prisma as any).businessListing.create({
      data: { ...dto, userId },
    });
  }

  async getMyListing(userId: string) {
    return (this.prisma as any).businessListing.findFirst({ where: { userId } });
  }

  // ─── Mentorship ───────────────────────────────────────────────────────────

  async getMentors() {
    const mentors = await (this.prisma as any).mentorProfile.findMany({
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

    const existing = await (this.prisma as any).mentorProfile.findUnique({ where: { userId } });
    if (existing) {
      return (this.prisma as any).mentorProfile.update({ where: { userId }, data: dto });
    }
    return (this.prisma as any).mentorProfile.create({ data: { ...dto, userId } });
  }

  async sendMentorRequest(userId: string, dto: SendMentorRequestDto) {
    await this.requireFeature(userId, 'mentorshipTools');
    if (userId === dto.mentorId) throw new BadRequestException('You cannot request yourself as a mentor.');

    const mentor = await (this.prisma as any).mentorProfile.findUnique({ where: { id: dto.mentorId } });
    if (!mentor) throw new NotFoundException('Mentor not found');

    const existing = await (this.prisma as any).mentorRequest.findFirst({
      where: { mentorId: dto.mentorId, menteeId: userId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('You already have a pending request with this mentor.');

    return (this.prisma as any).mentorRequest.create({
      data: { mentorId: dto.mentorId, menteeId: userId, message: dto.message },
    });
  }

  async respondToMentorRequest(userId: string, requestId: string, accept: boolean) {
    const request = await (this.prisma as any).mentorRequest.findUnique({
      where: { id: requestId },
      include: { mentor: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.mentor.userId !== userId) throw new ForbiddenException('Not your request to respond to.');

    return (this.prisma as any).mentorRequest.update({
      where: { id: requestId },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
    });
  }

  async getMyMentorRequests(userId: string) {
    const profile = await (this.prisma as any).mentorProfile.findUnique({ where: { userId } });
    const incoming = profile
      ? await (this.prisma as any).mentorRequest.findMany({
          where: { mentorId: profile.id },
          include: { mentee: { select: { id: true, profile: { select: { displayName: true, profileImageUrl: true } } } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const outgoing = await (this.prisma as any).mentorRequest.findMany({
      where: { menteeId: userId },
      include: { mentor: { include: { user: { select: { profile: { select: { displayName: true, profileImageUrl: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return { incoming, outgoing, myProfile: profile };
  }

  // ─── Career Resources ─────────────────────────────────────────────────────

  async getCareerResources(category?: string) {
    const where: any = { isPublished: true };
    if (category) where.category = category;

    const resources = await (this.prisma as any).careerResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { profile: { select: { displayName: true } } } },
      },
    });

    const categories = [...new Set(resources.map((r: any) => r.category))];
    return { resources, categories };
  }
}
