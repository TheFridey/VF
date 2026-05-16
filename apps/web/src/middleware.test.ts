import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('web middleware CSP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('keeps the documented inline script and style exceptions only', () => {
    const request = new NextRequest('https://veteranfinder.co.uk/app/profile');

    const response = middleware(request);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });
});
