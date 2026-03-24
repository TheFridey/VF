import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/home/site-header';
import { PostViewTracker } from '@/components/blog/post-view-tracker';

export const revalidate = 300;

function unwrapPayload<T>(payload: unknown): T {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload &&
    'timestamp' in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function getPost(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/blog/posts/${slug}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;

    const payload = await res.json();
    return unwrapPayload<any>(payload);
  } catch {
    return null;
  }
}

type MetadataProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Not found' };

  const imageUrl = post.coverImageUrl || 'https://veteranfinder.co.uk/og-image.png';

  return {
    title: post.metaTitle || `${post.title} | VeteranFinder`,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://veteranfinder.co.uk/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      tags: post.tags,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metaTitle || `${post.title} | VeteranFinder`,
      description: post.metaDescription || post.excerpt,
      images: [imageUrl],
    },
  };
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const readTimeLabel =
    post.readTimeMinutes <= 4
      ? `Quick read · ${post.readTimeMinutes} min`
      : post.readTimeMinutes <= 8
        ? `${post.readTimeMinutes} min read`
        : `Longer read · ${post.readTimeMinutes} min`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: 'VeteranFinder',
      url: 'https://veteranfinder.co.uk',
    },
    wordCount: post.wordCount,
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PostViewTracker postId={post.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>

        {post.tags?.length > 0 && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {post.tags[0]}
          </p>
        )}

        <h1 className="text-3xl font-semibold leading-snug tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          {post.publishedAt && (
            <span>
              {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
          <span>·</span>
          <span>{readTimeLabel}</span>
        </div>

        <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>

        <div className="my-8 h-px bg-border" />

        <div
          className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        <div className="my-10 h-px bg-border" />

        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <p className="font-semibold text-foreground">
            Looking for someone you served with?
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            VeteranFinder is built specifically for this. Search by regiment, years served, and deployment.
          </p>
          <Link
            href="/auth/register"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Create your profile
          </Link>
        </div>
      </main>
    </div>
  );
}
