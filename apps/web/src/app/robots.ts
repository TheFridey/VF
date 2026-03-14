import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veteranfinder.co.uk';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/contact', '/privacy', '/terms', '/cookies', '/auth/'],
        disallow: ['/app/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
