'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import {
  LayoutDashboard, Users, Shield, Flag,
  FileText, LogOut, MessageSquare, Settings, Menu, X, BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Command', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Personnel', href: '/users', icon: Users },
      { name: 'Verification', href: '/verification', icon: Shield },
      { name: 'Reports', href: '/reports', icon: Flag },
    ],
  },
  {
    label: 'Community',
    items: [{ name: 'BIA Community', href: '/bia', icon: MessageSquare }],
  },
  {
    label: 'System',
    items: [
      { name: 'Audit Log', href: '/audit', icon: FileText },
      { name: 'System', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // Continue clearing local state if the API request fails.
    } finally {
      logout();
      router.push('/auth/login');
    }
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #141f2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            background: 'linear-gradient(145deg, #d4a853 0%, #b88a2a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}>
            <Shield size={16} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#dce8f5', letterSpacing: 1.5, lineHeight: 1, textTransform: 'uppercase' }}>VeteranFinder</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#d4a853', letterSpacing: 2.5, marginTop: 3 }}>ADMIN PANEL</p>
          </div>
        </div>
      </div>

      {/* Clock */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid #141f2e', background: '#060c17' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: '#d4a853', letterSpacing: 2, fontWeight: 500, lineHeight: 1 }}>
          {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d3f55', letterSpacing: 1.5, marginTop: 4 }}>
          {time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom: 2 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: '#1e2d40', letterSpacing: 3, padding: '10px 8px 5px', textTransform: 'uppercase' }}>
              — {group.label}
            </p>
            {group.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 5, marginBottom: 1, textDecoration: 'none',
                    color: isActive ? '#d4a853' : '#5a7089',
                    background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? '#d4a853' : 'transparent'}`,
                    fontSize: 13, fontWeight: isActive ? 600 : 400, letterSpacing: 0.2,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,168,83,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = '#d4a853'; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#5a7089'; } }}>
                  <Icon size={14} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #141f2e', background: '#060c17' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #1a2744, #2d4070)',
            border: '1px solid #2d3f55',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#d4a853',
          }}>
            {(user?.profile?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#b8ccd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.profile?.displayName || user?.email}
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#d4a853', letterSpacing: 1 }}>
              {user?.role}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', borderRadius: 5, border: '1px solid #1a2332',
            background: 'transparent', color: '#3a4f63', cursor: 'pointer',
            fontSize: 12, fontFamily: "'Barlow', sans-serif", transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#f8717140'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a4f63'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2332'; }}>
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>

      {/* Mobile button */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 60,
          background: '#0d1524', border: '1px solid #1a2636', borderRadius: 6,
          padding: 8, cursor: 'pointer', color: '#d4a853',
        }}
        className="lg-hidden-btn">
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 244, zIndex: 50,
        background: '#09101d', borderRight: '1px solid #141f2e',
        transform: mobileOpen ? 'translateX(0)' : undefined,
        fontFamily: "'Barlow', 'Segoe UI', sans-serif",
      }}>
        <SidebarContent />
      </aside>
    </>
  );
}
