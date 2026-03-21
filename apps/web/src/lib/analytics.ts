'use client';

import { useAuthStore } from '@/stores/auth-store';

export type CookiePreferences = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const ANALYTICS_CONSENT_KEY = 'vf_cookie_consent';
export const ANALYTICS_SESSION_KEY = 'vf_analytics_session_id';
export const ANALYTICS_CONSENT_EVENT = 'vf-cookie-consent-changed';

type AnalyticsPayload = Record<string, unknown>;

function readJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `vf-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getCsrfToken() {
  if (typeof document === 'undefined') {
    return '';
  }

  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrf-token='))
    ?.split('=')[1] ?? '';
}

async function postAnalytics(path: string, payload: AnalyticsPayload) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    await fetch(`/api/analytics/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never interrupt the user journey.
  }
}

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return readJson<CookiePreferences>(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
}

export function isAnalyticsEnabled() {
  const preferences = getCookiePreferences();
  return preferences?.analytics === true;
}

export function dispatchAnalyticsConsentChanged(preferences: CookiePreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_EVENT, {
      detail: preferences,
    }),
  );
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const nextId = createSessionId();
  window.localStorage.setItem(ANALYTICS_SESSION_KEY, nextId);
  return nextId;
}

export function inferDeviceType(width: number) {
  if (width < 768) {
    return 'mobile';
  }

  if (width < 1024) {
    return 'tablet';
  }

  return 'desktop';
}

export async function trackAnalyticsPageView(payload: {
  path: string;
  referrer?: string;
  loadTimeMs?: number | null;
  domContentLoadedMs?: number | null;
  firstPaintMs?: number | null;
  firstContentfulPaintMs?: number | null;
  largestContentfulPaintMs?: number | null;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceType?: string;
}) {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) {
    return;
  }

  await postAnalytics('page-view', {
    sessionId: getAnalyticsSessionId(),
    userId: useAuthStore.getState().user?.id,
    ...payload,
  });
}

export async function trackAnalyticsEvent(
  event: string,
  options?: {
    path?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) {
    return;
  }

  await postAnalytics('event', {
    sessionId: getAnalyticsSessionId(),
    userId: useAuthStore.getState().user?.id,
    event,
    path: options?.path,
    metadata: options?.metadata,
  });
}
