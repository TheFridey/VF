'use client';

import { useEffect, useRef } from 'react';

function getSessionId() {
  const key = 'vf-blog-session-id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function PostViewTracker({ postId }: { postId: string }) {
  const sentRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const sessionId = getSessionId();

    const send = () => {
      if (sentRef.current) {
        return;
      }

      sentRef.current = true;
      const payload = JSON.stringify({
        postId,
        sessionId,
        referrer: document.referrer || undefined,
        readTimeMs: Date.now() - startedAt,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/blog/views', blob);
        return;
      }

      void fetch('/api/blog/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    };

    window.addEventListener('pagehide', send);
    return () => {
      window.removeEventListener('pagehide', send);
      send();
    };
  }, [postId]);

  return null;
}
