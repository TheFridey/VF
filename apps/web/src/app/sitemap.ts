import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veteranfinder.co.uk';
  const baseUrlApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const now = new Date();

  const existingEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/partner-with-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/cookies`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/dpia`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/status`, lastModified: now, changeFrequency: 'weekly', priority: 0.3 },
    { url: `${baseUrl}/auth/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/auth/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const res = await fetch(`${baseUrlApi}/api/v1/blog/posts?limit=50`);
    if (res.ok) {
      const payload = await res.json();
      const data =
        payload !== null &&
        typeof payload === 'object' &&
        'data' in payload &&
        'timestamp' in payload
          ? payload.data
          : payload;
      const { posts = [] } = data as { posts?: any[] };
      const blogEntries = posts.map((post: any) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

      return [
        ...existingEntries,
        {
          url: `${baseUrl}/blog`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        },
        ...blogEntries,
      ];
    }
  } catch {}

  return existingEntries;
}
