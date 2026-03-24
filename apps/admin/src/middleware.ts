import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function getApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return raw.replace(/\/api(?:\/v1)?$/, '');
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === 'development';
  const apiOrigin = getApiOrigin();
  const scriptSources = [`'self'`, `'nonce-${nonce}'`];

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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspDirectives);
  response.headers.set('x-nonce', nonce);
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
