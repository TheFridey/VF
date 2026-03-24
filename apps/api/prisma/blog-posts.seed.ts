import { PostStatus, PrismaClient } from '@prisma/client';
import { calculateReadTime } from '../src/blog/utils/read-time';
import { BLOG_POST_SEEDS_PART_1 } from './blog-posts.seed.part1';
import { BLOG_POST_SEEDS_PART_2 } from './blog-posts.seed.part2';
import { BLOG_POST_SEEDS_PART_3 } from './blog-posts.seed.part3';
import { BLOG_POST_SEEDS_PART_4 } from './blog-posts.seed.part4';
import { BLOG_POST_SEEDS_PART_5 } from './blog-posts.seed.part5';
import { BLOG_POST_SEEDS_PART_6 } from './blog-posts.seed.part6';
import { BLOG_POST_SEEDS_PART_7 } from './blog-posts.seed.part7';
import { BLOG_POST_SEEDS_PART_8 } from './blog-posts.seed.part8';
import { renderArticleBody } from './blog-posts.seed.shared';

const BLOG_POST_SEEDS = [
  ...BLOG_POST_SEEDS_PART_1,
  ...BLOG_POST_SEEDS_PART_2,
  ...BLOG_POST_SEEDS_PART_3,
  ...BLOG_POST_SEEDS_PART_4,
  ...BLOG_POST_SEEDS_PART_5,
  ...BLOG_POST_SEEDS_PART_6,
  ...BLOG_POST_SEEDS_PART_7,
  ...BLOG_POST_SEEDS_PART_8,
];

export async function seedBlogPosts(prisma: PrismaClient, authorId: string) {
  let createdOrUpdated = 0;

  for (const post of BLOG_POST_SEEDS) {
    const body = renderArticleBody(post);
    const { wordCount, readTimeMinutes } = calculateReadTime(body);

    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body,
        tags: post.tags,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        coverImageUrl: post.coverImageUrl ?? null,
        status: PostStatus.SCHEDULED,
        publishAt: new Date(post.publishAt),
        publishedAt: null,
        authorId,
        wordCount,
        readTimeMinutes,
      },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body,
        tags: post.tags,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        coverImageUrl: post.coverImageUrl ?? null,
        status: PostStatus.SCHEDULED,
        publishAt: new Date(post.publishAt),
        publishedAt: null,
        authorId,
        wordCount,
        readTimeMinutes,
      },
    });

    createdOrUpdated++;
  }

  console.log(`📰 ${createdOrUpdated} scheduled blog posts ready for release`);
}
