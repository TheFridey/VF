'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  getCookiePreferences,
  inferDeviceType,
  trackAnalyticsPageView,
} from '@/lib/analytics';

function roundMetric(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function getNavigationMetrics() {
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paintEntries = performance.getEntriesByType('paint');
  const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
  const firstContentfulPaint = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

  return {
    loadTimeMs: roundMetric(navigationEntry?.loadEventEnd || navigationEntry?.duration),
    domContentLoadedMs: roundMetric(navigationEntry?.domContentLoadedEventEnd),
    firstPaintMs: roundMetric(firstPaint?.startTime),
    firstContentfulPaintMs: roundMetric(firstContentfulPaint?.startTime),
  };
}

function getLargestContentfulPaint() {
  return new Promise<number | null>((resolve) => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      resolve(null);
      return;
    }

    let largestPaint: number | null = null;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          largestPaint = roundMetric(entry.startTime);
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);

      const finish = () => {
        observer.disconnect();
        resolve(largestPaint);
      };

      if (document.readyState === 'complete') {
        window.setTimeout(finish, 0);
      } else {
        window.addEventListener('load', () => window.setTimeout(finish, 0), { once: true });
      }
    } catch {
      resolve(null);
    }
  });
}

export function PageAnalyticsTracker() {
  const pathname = usePathname();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getCookiePreferences()?.analytics === true);
  const initialMetricsCapturedRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const syncConsent = () => {
      setAnalyticsEnabled(getCookiePreferences()?.analytics === true);
    };

    const handleConsentChange = () => syncConsent();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ANALYTICS_CONSENT_KEY) {
        syncConsent();
      }
    };

    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!pathname || !analyticsEnabled) {
      return;
    }

    if (lastTrackedPathRef.current === pathname) {
      return;
    }

    lastTrackedPathRef.current = pathname;

    const track = async () => {
      const basePayload = {
        path: pathname,
        referrer: document.referrer || undefined,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        deviceType: inferDeviceType(window.innerWidth),
      };

      if (!initialMetricsCapturedRef.current) {
        initialMetricsCapturedRef.current = true;
        const metrics = getNavigationMetrics();
        const largestContentfulPaintMs = await getLargestContentfulPaint();

        await trackAnalyticsPageView({
          ...basePayload,
          ...metrics,
          largestContentfulPaintMs,
        });
        return;
      }

      await trackAnalyticsPageView(basePayload);
    };

    void track();
  }, [analyticsEnabled, pathname]);

  return null;
}
