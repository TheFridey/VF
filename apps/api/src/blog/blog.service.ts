import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { CreatePostDto, TrackPostViewDto, UpdatePostDto } from './dto/blog.dto';
import { calculateReadTime, generateSlug } from './utils';

type PostListFilters = {
  status?: PostStatus;
  tag?: string;
  page?: number;
  limit?: number;
  publishedOnly?: boolean;
};

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadCoverImage(file: Express.Multer.File, userId: string) {
    const upload = await this.cloudinaryService.uploadImage(file, 'blog-covers', userId);

    return {
      url: upload.secureUrl,
      publicId: upload.publicId,
      width: upload.width,
      height: upload.height,
      format: upload.format,
      bytes: upload.bytes,
    };
  }

  async createPost(dto: CreatePostDto, authorId: string) {
    const slug = dto.slug?.trim() || generateSlug(dto.title);
    const { wordCount, readTimeMinutes } = calculateReadTime(dto.body);
    const normalizedStatus = dto.status ?? PostStatus.DRAFT;
    const publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
    const publishedAt =
      normalizedStatus === PostStatus.PUBLISHED ? publishAt ?? new Date() : null;

    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        body: dto.body,
        coverImageUrl: dto.coverImageUrl ?? null,
        status: normalizedStatus,
        publishAt,
        publishedAt,
        authorId,
        tags: dto.tags ?? [],
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        wordCount,
        readTimeMinutes,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    const body = dto.body ?? existing.body;
    const { wordCount, readTimeMinutes } = calculateReadTime(body);
    const nextStatus = dto.status ?? existing.status;
    const publishAt = dto.publishAt
      ? new Date(dto.publishAt)
      : dto.publishAt === undefined
        ? existing.publishAt
        : null;

    let publishedAt = existing.publishedAt;
    if (nextStatus === PostStatus.PUBLISHED && !publishedAt) {
      publishedAt = publishAt ?? new Date();
    }
    if (nextStatus !== PostStatus.PUBLISHED && dto.status) {
      publishedAt = existing.publishedAt;
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug || generateSlug(dto.title ?? existing.title) } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle || null } : {}),
        ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription || null } : {}),
        ...(dto.publishAt !== undefined ? { publishAt } : {}),
        publishedAt,
        wordCount,
        readTimeMinutes,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
  }

  async deletePost(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  async getPost(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async getPostBySlug(slug: string) {
    const now = new Date();
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (
      !post ||
      post.status !== PostStatus.PUBLISHED ||
      (post.publishAt && post.publishAt > now)
    ) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async listPosts(filters: PostListFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(filters.limit || 12, 50);
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.PostWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.publishedOnly) {
      where.status = PostStatus.PUBLISHED;
      where.OR = [{ publishAt: null }, { publishAt: { lte: now } }];
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: [
          { publishedAt: 'desc' },
          { publishAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async listPublishedPosts(tag?: string, page = 1, limit = 12) {
    return this.listPosts({
      status: PostStatus.PUBLISHED,
      tag,
      page,
      limit,
      publishedOnly: true,
    });
  }

  async trackView(dto: TrackPostViewDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      select: { id: true, status: true, publishAt: true },
    });

    if (
      !post ||
      post.status !== PostStatus.PUBLISHED ||
      (post.publishAt && post.publishAt > new Date())
    ) {
      throw new NotFoundException('Post not found');
    }

    if (!dto.sessionId.trim()) {
      throw new BadRequestException('Session ID is required');
    }

    return this.prisma.postView.create({
      data: {
        postId: dto.postId,
        sessionId: dto.sessionId,
        referrer: dto.referrer || null,
        readTimeMs: dto.readTimeMs || null,
      },
    });
  }

  async getPostAnalytics(postId: string, days = 30) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const since = new Date(Date.now() - days * 86400000);
    const views = await this.prisma.postView.findMany({
      where: { postId, createdAt: { gte: since } },
    });

    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map((view) => view.sessionId)).size;
    const viewsWithReadTime = views.filter((view) => view.readTimeMs);
    const avgReadTimeMs =
      viewsWithReadTime.reduce((sum, view) => sum + (view.readTimeMs || 0), 0) /
      (viewsWithReadTime.length || 1);

    const referrers: Record<string, number> = {};
    for (const view of views) {
      const referrer = view.referrer || 'direct';
      referrers[referrer] = (referrers[referrer] || 0) + 1;
    }

    return {
      totalViews,
      uniqueVisitors,
      avgReadTimeMs: Math.round(avgReadTimeMs),
      referrers,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPosts() {
    const due = await this.prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        publishAt: { lte: new Date() },
      },
      select: { id: true, slug: true, publishAt: true },
    });

    for (const post of due) {
      await this.prisma.post.update({
        where: { id: post.id },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: post.publishAt ?? new Date(),
        },
      });
      this.logger.log(`Auto-published post: ${post.slug}`);
    }
  }
}
