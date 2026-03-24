import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/home/site-header';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog | VeteranFinder',
  description:
    'Guides, resources and practical information for UK veterans - finding former colleagues, accessing records, support services and more.',
};

type BlogListResponse = {
  posts: any[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

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

async function getPosts(tag?: string, page = 1): Promise<BlogListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (tag) params.set('tag', tag);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/blog/posts?${params.toString()}`,
      { next: { revalidate: 300 } },
    );

    if (!res.ok) {
      return { posts: [], total: 0, page, pages: 0, limit: 12 };
    }

    const payload = await res.json();
    return unwrapPayload<BlogListResponse>(payload);
  } catch {
    return { posts: [], total: 0, page, pages: 0, limit: 12 };
  }
}

function formatReadTime(minutes: number): string {
  if (minutes <= 4) return `Quick read · ${minutes} min`;
  if (minutes <= 8) return `${minutes} min read`;
  return `Longer read · ${minutes} min`;
}

type PageProps = {
  searchParams: Promise<{ tag?: string; page?: string }>;
};

export default async function BlogListPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { posts } = await getPosts(
    resolvedSearchParams.tag,
    Number(resolvedSearchParams.page) || 1,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            VeteranFinder
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Guides and resources for UK veterans
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Practical information on finding former colleagues, accessing service records,
            support services, and life after the military.
          </p>
          <a
            href="/blog/rss.xml"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>RSS feed</span>
          </a>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No articles published yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: any) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                {post.tags?.length > 0 && (
                  <span className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    {post.tags[0]}
                  </span>
                )}
                <h2 className="text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                  <span>·</span>
                  <span>{formatReadTime(post.readTimeMinutes)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
