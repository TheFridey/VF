import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return raw.replace(/\/api(?:\/v1)?$/, '');
}

export function middleware(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  const apiOrigin = getApiOrigin();
  const scriptSources = [`'self'`, `'unsafe-inline'`];

  if (isDev) {
    scriptSources.push(`'unsafe-eval'`);
  }

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    // The admin UI still relies heavily on inline style props, so style-src stays permissive for now.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https://res.cloudinary.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${apiOrigin}${isDev ? ` ws://localhost:3000 http://localhost:3000 ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', cspDirectives);
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
