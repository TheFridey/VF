import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/home/site-header';
import { PostViewTracker } from '@/components/blog/post-view-tracker';
import { ShareActions } from '@/components/blog/share-actions';

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
  const canonicalUrl = `https://veteranfinder.co.uk/blog/${post.slug}`;

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
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-4xl">
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

          <h1 className="text-3xl font-semibold leading-snug tracking-tight text-foreground sm:text-5xl">
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

          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p>
        </div>

        {post.coverImageUrl ? (
          <div className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-3xl border border-border bg-muted/40">
            <img
              src={post.coverImageUrl}
              alt=""
              className="h-[240px] w-full object-cover sm:h-[360px] lg:h-[440px]"
            />
          </div>
        ) : null}

        <div className="mx-auto my-10 h-px max-w-4xl bg-border" />

        <article
          className="mx-auto max-w-4xl text-[1.04rem] leading-8 text-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_li]:ml-6 [&_li]:mt-3 [&_li]:pl-2 [&_li]:marker:text-primary [&_ol]:mt-6 [&_ol]:list-decimal [&_p]:mt-6 [&_p]:leading-8 [&_strong]:font-semibold [&_ul]:mt-6 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        <div className="mx-auto my-10 h-px max-w-4xl bg-border" />

        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-muted/40 p-6 text-center">
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

        <ShareActions title={post.title} excerpt={post.excerpt} url={canonicalUrl} />
      </main>
    </div>
  );
}
