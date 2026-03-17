'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import Sidebar from './Sidebar';
import { ChevronRight } from 'lucide-react';

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Command',
  '/users': 'Personnel',
  '/verification': 'Verification',
  '/reports': 'Reports',
  '/bia': 'BIA Community',
  '/audit': 'Audit Log',
  '/settings': 'System',
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, _hasHydrated, setHasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || _hasHydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setHasHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [_hasHydrated, mounted, setHasHydrated]);

  useEffect(() => {
    if (!mounted || !_hasHydrated) {
      return;
    }

    if (user) {
      if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
        router.push('/auth/login');
      }
      return;
    }

    adminApi.getMe()
      .then((fetchedUser) => {
        if (!['ADMIN', 'MODERATOR'].includes(fetchedUser.role)) {
          router.push('/auth/login');
          return;
        }

        setUser(fetchedUser);
      })
      .catch(() => {
        router.push('/auth/login');
      });
  }, [_hasHydrated, mounted, router, setUser, user]);

  if (!mounted || !_hasHydrated || !user) {
    return (
      <div style={{ background: '#060a12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid #d4a853', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#d4a853', letterSpacing: 3 }}>AUTHENTICATING</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    );
  }

  const section = Object.keys(breadcrumbs).find((key) => pathname.startsWith(key)) || '/dashboard';
  const pageLabel = breadcrumbs[section] || 'Dashboard';

  return (
    <div style={{ background: '#060a12', minHeight: '100vh', display: 'flex', fontFamily: "'Barlow', 'Segoe UI', sans-serif" }}>
      <Sidebar />

      <div style={{ marginLeft: 244, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, height: 50,
          background: 'rgba(6,10,18,0.96)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #141f2e',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#d4a853' }}>VF</span>
            <ChevronRight size={10} color="#1e2d40" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#7a9bb5', letterSpacing: 0.5 }}>
              {pageLabel.toUpperCase()}
            </span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse-dot 2.5s ease infinite' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#34d399', letterSpacing: 1.5 }}>ONLINE</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '26px 28px', overflowX: 'hidden' }} className="vf-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
