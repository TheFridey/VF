'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Shield, Flag, FileText,
  Settings, LogOut, Menu, ChevronRight, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

const navItems = [
  { href: '/admin/dashboard', label: 'Command', icon: LayoutDashboard, group: 'overview' },
  { href: '/admin/users', label: 'Personnel', icon: Users, group: 'operations' },
  { href: '/admin/verification', label: 'Verification', icon: Shield, group: 'operations' },
  { href: '/admin/reports', label: 'Reports', icon: Flag, group: 'operations' },
  { href: '/admin/bia', label: 'BIA Community', icon: MessageSquare, group: 'community' },
  { href: '/admin/audit', label: 'Audit Log', icon: FileText, group: 'system' },
  { href: '/admin/settings', label: 'System', icon: Settings, group: 'system' },
];

const groups: Record<string, string> = {
  overview: 'Overview',
  operations: 'Operations',
  community: 'Community',
  system: 'System',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, logout, _hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    if (user) {
      if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
        router.push('/app/brothers');
        return;
      }

      setIsLoading(false);
      return;
    }

    api.getMe()
      .then((fetchedUser) => {
        setUser(fetchedUser);

        if (!['ADMIN', 'MODERATOR'].includes(fetchedUser.role)) {
          router.push('/app/brothers');
          return;
        }

        setIsLoading(false);
      })
      .catch(() => {
        router.push('/auth/login');
      });
  }, [_hasHydrated, router, setUser, user]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Continue clearing local state even if the API request fails.
    } finally {
      logout();
      router.push('/auth/login');
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ background: '#060a12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid #d4a853', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#d4a853', fontFamily: 'monospace', fontSize: 12, letterSpacing: 3 }}>AUTHENTICATING</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const grouped = Object.entries(groups).map(([key, label]) => ({
    key,
    label,
    items: navItems.filter((item) => item.group === key),
  })).filter((group) => group.items.length > 0);

  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div style={{ background: '#060a12', minHeight: '100vh', display: 'flex', fontFamily: "'Barlow', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .vf-nav-item { transition: all 0.15s ease; }
        .vf-nav-item:hover { background: rgba(212,168,83,0.08) !important; color: #d4a853 !important; border-left-color: rgba(212,168,83,0.4) !important; }
        .vf-btn-ghost:hover { background: rgba(212,168,83,0.08) !important; color: #d4a853 !important; }
        .vf-scrollbar::-webkit-scrollbar { width: 3px; }
        .vf-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .vf-scrollbar::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 2px; }
        .vf-table-row:hover { background: rgba(212,168,83,0.04) !important; }
        .vf-card { animation: fadeIn 0.3s ease; }
        @media (max-width: 1024px) { .vf-sidebar { transform: translateX(-100%); } .vf-sidebar.open { transform: translateX(0); } .vf-main { margin-left: 0 !important; } }
      `}</style>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }}
        />
      )}

      <aside
        className={`vf-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 244,
          background: '#09101d',
          borderRight: '1px solid #141f2e',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.2s ease',
        }}
      >
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #141f2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                background: 'linear-gradient(145deg, #d4a853 0%, #b88a2a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                flexShrink: 0,
              }}
            >
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#dce8f5', letterSpacing: 1.5, lineHeight: 1, textTransform: 'uppercase' }}>VeteranFinder</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#d4a853', letterSpacing: 2.5, marginTop: 3 }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 18px 10px', borderBottom: '1px solid #141f2e', background: '#060c17' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: '#d4a853', letterSpacing: 2, fontWeight: 500, lineHeight: 1 }}>
            {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d3f55', letterSpacing: 1.5, marginTop: 4 }}>
            {time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </p>
        </div>

        <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }} className="vf-scrollbar">
          {grouped.map((group) => (
            <div key={group.key} style={{ marginBottom: 2 }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: '#1e2d40', letterSpacing: 3, padding: '10px 8px 5px', textTransform: 'uppercase' }}>
                - {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="vf-nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 5,
                      marginBottom: 1,
                      textDecoration: 'none',
                      color: isActive ? '#d4a853' : '#5a7089',
                      background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                      borderLeft: `2px solid ${isActive ? '#d4a853' : 'transparent'}`,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: 0.2,
                    }}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid #141f2e', background: '#060c17' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #1a2744, #2d4070)',
                border: '1px solid #2d3f55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#d4a853',
              }}
            >
              {(user.profile?.displayName || user.email).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#b8ccd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.profile?.displayName || user.email}
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#d4a853', letterSpacing: 1 }}>
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="vf-btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '7px 10px',
              borderRadius: 5,
              border: '1px solid #1a2332',
              background: 'transparent',
              color: '#3a4f63',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'Barlow', sans-serif",
            }}
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="vf-main" style={{ marginLeft: 244, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: 50,
            background: 'rgba(6,10,18,0.96)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #141f2e',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#5a7089', cursor: 'pointer', padding: 4, display: 'none' }}
            className="max-lg:block"
          >
            <Menu size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#d4a853' }}>VF</span>
            <ChevronRight size={10} color="#1e2d40" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#7a9bb5', letterSpacing: 0.5 }}>
              {activeItem?.label?.toUpperCase() || 'DASHBOARD'}
            </span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse-dot 2.5s ease infinite' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#34d399', letterSpacing: 1.5 }}>SYSTEMS ONLINE</span>
            </div>
            <Link
              href="/app/brothers"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d3f55', textDecoration: 'none', letterSpacing: 1.5 }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = '#d4a853';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = '#2d3f55';
              }}
            >
              {'<- MAIN APP'}
            </Link>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 28px', overflowX: 'hidden' }} className="vf-card">
          {children}
        </main>
      </div>
    </div>
  );
}
