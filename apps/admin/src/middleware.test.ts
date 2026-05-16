import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('admin middleware CSP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('keeps the documented admin inline script and style exceptions only', () => {
    const request = new NextRequest('https://admin.veteranfinder.co.uk');

    const response = middleware(request);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });
});
