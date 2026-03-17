import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF protection — double-submit cookie pattern.
 *
 * ── Why double-submit (not synchroniser token) ─────────────────────────────
 * Synchroniser tokens require server-side session state, which breaks
 * horizontal scaling.  The double-submit pattern stores the secret in a cookie
 * and requires every mutating request to echo it in the X-CSRF-Token header.
 * A cross-origin page cannot read the cookie (SameSite=Strict + HttpOnly=false
 * for the CSRF cookie specifically), so it cannot forge the header.
 *
 * ── Flow ───────────────────────────────────────────────────────────────────
 * 1. On any GET to /api, if the csrf-token cookie is absent → issue a new one
 *    (random 32-byte hex, NOT HttpOnly so JS can read it).
 * 2. On mutating requests (POST/PUT/PATCH/DELETE):
 *    a. Read csrf-token cookie.
 *    b. Read X-CSRF-Token header.
 *    c. Compare with timing-safe equals.
 *    d. Reject with 403 if mismatch.
 *
 * ── Exclusions ─────────────────────────────────────────────────────────────
 * - GET, HEAD, OPTIONS — safe methods, no state mutation.
 * - /api/v1/webhooks/stripe — raw body required; Stripe validates its own sig.
 * - /api/v1/auth/verify-email, /api/v1/auth/reset-password — arrive via link,
 *   no browser context to supply a CSRF token.
 * - /api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/forgot-password,
 *   /api/v1/auth/resend-verification — pre-authentication endpoints.
 *   CSRF is only meaningful when an authenticated session cookie exists for an
 *   attacker to hijack.  These endpoints have no session yet, so CSRF does not
 *   apply.  Protecting them would cause "CSRF token missing" on every first
 *   page load before the cookie has been issued by a prior GET.
 *
 * ── SameSite note ──────────────────────────────────────────────────────────
 * SameSite=Lax on the session cookies (access_token, refresh_token) already
 * blocks cross-site POST from ever sending credentials.  This CSRF layer is
 * defence-in-depth for authenticated endpoints where SameSite could be
 * bypassed (e.g. old browsers, subdomain takeover, or API clients that opt
 * into cross-origin credentials).
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CSRF_EXEMPT_PATHS = [
  // Stripe webhook — validates its own signature on raw body
  '/api/v1/subscriptions/webhook',
  '/api/v1/webhooks/stripe',
  // Email-link endpoints — arrive via redirect, no prior GET to issue cookie
  '/api/v1/auth/verify-email',
  '/api/v1/auth/reset-password',
  // Pre-auth endpoints — no authenticated session to exploit; protecting these
  // causes "CSRF token missing" on the very first login/register attempt
  // because the csrf-token cookie has not yet been set by any prior GET.
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/refresh',
  '/api/v1/email/contact',
  '/api/v1/email/partnerships',
];

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_SECONDS = 86400; // 24h — refreshed on each GET

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;

    // Exempt specific paths (exact match or prefix match)
    if (CSRF_EXEMPT_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
      // Still issue a CSRF cookie if absent so the next authenticated request
      // will have it ready without needing a separate GET.
      if (!req.cookies?.[CSRF_COOKIE]) {
        const token = generateToken();
        res.cookie(CSRF_COOKIE, token, {
          httpOnly: false,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          maxAge: CSRF_TTL_SECONDS * 1000,
          path: '/',
        });
      }
      return next();
    }

    // Safe methods — refresh the cookie if missing, then pass through
    if (SAFE_METHODS.has(req.method)) {
      if (!req.cookies?.[CSRF_COOKIE]) {
        const token = generateToken();
        res.cookie(CSRF_COOKIE, token, {
          httpOnly: false,       // JS must be able to read this to include in header
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          maxAge: CSRF_TTL_SECONDS * 1000,
          path: '/',
        });
      }
      return next();
    }

    // Mutating request — validate
    const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (!timingSafeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token invalid');
    }

    // Valid — refresh TTL on the cookie
    res.cookie(CSRF_COOKIE, cookieToken, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF_TTL_SECONDS * 1000,
      path: '/',
    });

    next();
  }
}
