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

function toOrigin(value?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function toWebSocketOrigin(value?: string): string | null {
  const origin = toOrigin(value);
  if (!origin) {
    return null;
  }

  if (origin.startsWith('https://')) {
    return origin.replace('https://', 'wss://');
  }

  if (origin.startsWith('http://')) {
    return origin.replace('http://', 'ws://');
  }

  return origin;
}

/**
 * Next.js Edge Middleware with a static Content Security Policy.
 */
export function middleware(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  const currentOrigin = request.nextUrl.origin;
  const apiOrigin = toOrigin(process.env.NEXT_PUBLIC_API_URL?.trim());
  const wsOrigin = toWebSocketOrigin(process.env.NEXT_PUBLIC_WS_URL?.trim());
  const connectSources = new Set<string>([
    "'self'",
    currentOrigin,
    toWebSocketOrigin(currentOrigin) || currentOrigin,
    'https://api.veteranfinder.co.uk',
    'wss://api.veteranfinder.co.uk',
  ]);

  if (apiOrigin && (isDev || !apiOrigin.includes('localhost'))) {
    connectSources.add(apiOrigin);
    connectSources.add(toWebSocketOrigin(apiOrigin) || apiOrigin);
  }

  if (wsOrigin && (isDev || !wsOrigin.includes('localhost'))) {
    connectSources.add(wsOrigin);
  }

  if (isDev) {
    connectSources.add('http://localhost:3000');
    connectSources.add('ws://localhost:3000');
    connectSources.add('ws://localhost:3001');
  }

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com",
    "font-src 'self'",
    `connect-src ${Array.from(connectSources).join(' ')}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
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
      source: '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|icons/|.*\\.(?:jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
