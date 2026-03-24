import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/blog/posts?limit=20`,
      { next: { revalidate: 3600 } },
    );

    const payload = await res.json();
    const { posts = [] } = unwrapPayload<{ posts?: any[] }>(payload);

    const items = posts
      .map(
        (post: any) => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>https://veteranfinder.co.uk/blog/${post.slug}</link>
        <guid isPermaLink="true">https://veteranfinder.co.uk/blog/${post.slug}</guid>
        <description><![CDATA[${post.excerpt}]]></description>
        <pubDate>${new Date(post.publishedAt || post.publishAt || post.createdAt).toUTCString()}</pubDate>
        ${post.tags?.map((tag: string) => `<category>${tag}</category>`).join('') || ''}
      </item>`,
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>VeteranFinder Blog</title>
    <link>https://veteranfinder.co.uk/blog</link>
    <description>Guides, resources and community information for UK veterans.</description>
    <language>en-gb</language>
    <atom:link href="https://veteranfinder.co.uk/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Feed unavailable', { status: 500 });
  }
}
