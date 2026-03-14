'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import {
  Users, Shield, Flag, Activity, Clock,
  Database, Server, TrendingUp, TrendingDown,
  MessageSquare, Zap, CheckCircle
} from 'lucide-react';

const S = {
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 },
  val: { fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 500, color: '#dce8f5', lineHeight: 1, letterSpacing: -1 },
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8, padding: '20px 22px', position: 'relative' as const, overflow: 'hidden' },
  h2: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#7a9bb5', letterSpacing: 2.5, textTransform: 'uppercase' as const, marginBottom: 14 },
};

function Skeleton() {
  return <div style={{ height: 14, borderRadius: 3, background: 'linear-gradient(90deg, #111c2e 25%, #172030 50%, #111c2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

function MetricCard({ label, value, accent, icon: Icon, href, trend, sub }: any) {
  const inner = (
    <div style={{ ...S.card, cursor: href ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = '#d4a853')}
      onMouseLeave={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = '#1a2636')}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}50, ${accent}10)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={S.label}>{label}</p>
          <p style={{ ...S.val, color: accent || '#dce8f5' }}>{value ?? <Skeleton />}</p>
          {sub && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068', marginTop: 8 }}>{sub}</p>}
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              {trend >= 0 ? <TrendingUp size={10} color="#34d399" /> : <TrendingDown size={10} color="#f87171" />}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: trend >= 0 ? '#34d399' : '#f87171' }}>
                {trend >= 0 ? '+' : ''}{trend}% this week
              </span>
            </div>
          )}
        </div>
        <div style={{ width: 38, height: 38, background: `${accent}14`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={accent} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function ActionRow({ label, count, href, urgency }: { label: string; count: number; href: string; urgency: 'high' | 'med' | 'low' }) {
  const colors = { high: '#f87171', med: '#fbbf24', low: '#34d399' };
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderBottom: '1px solid #141f2e', textDecoration: 'none',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,168,83,0.04)'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
      <span style={{ fontSize: 13, color: '#7a9bb5' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: count > 0 ? colors[urgency] : '#2d3f55' }}>{count}</span>
        {count > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[urgency], display: 'inline-block' }} />}
      </div>
    </Link>
  );
}

function HealthRow({ label, status, detail }: { label: string; status: 'ok' | 'error' | 'warn'; detail?: string }) {
  const colors = { ok: '#34d399', error: '#f87171', warn: '#fbbf24' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #141f2e' }}>
      <span style={{ fontSize: 13, color: '#7a9bb5' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {detail && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{detail}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status], display: 'inline-block', animation: status === 'ok' ? 'pulse-dot 2.5s ease infinite' : 'none' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: colors[status], letterSpacing: 1 }}>{status.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getDashboard(), adminApi.getHealth()])
      .then(([s, h]) => { setStats(s); setHealth(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      adminApi.getDashboard().then(setStats).catch(console.error);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const d = stats || {};

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5, lineHeight: 1 }}>
          Command Dashboard
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, marginTop: 6 }}>
          PLATFORM OVERVIEW — REAL TIME
        </p>
      </div>

      {/* Primary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <MetricCard label="Total Personnel" value={loading ? undefined : d.totalUsers?.toLocaleString() ?? '0'} accent="#7ab3d4" icon={Users} href="/users" trend={d.userGrowth} />
        <MetricCard label="Verified Veterans" value={loading ? undefined : d.verifiedVeterans?.toLocaleString() ?? '0'} accent="#34d399" icon={Shield} href="/verification" />
        <MetricCard label="Open Reports" value={loading ? undefined : d.pendingReports ?? '0'} accent={d.pendingReports > 5 ? '#f87171' : '#fbbf24'} icon={Flag} href="/reports" />
        <MetricCard label="Active Users" value={loading ? undefined : d.activeUsers?.toLocaleString() ?? '0'} accent="#a78bfa" icon={Activity} />
      </div>

      {/* Secondary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <MetricCard label="New Today" value={loading ? undefined : d.newUsersToday ?? '0'} accent="#d4a853" icon={TrendingUp} sub="new registrations" />
        <MetricCard label="Pending Verification" value={loading ? undefined : d.pendingVerifications ?? '0'} accent={d.pendingVerifications > 0 ? '#fbbf24' : '#34d399'} icon={Clock} href="/verification" />
        <MetricCard label="Connections Today" value={loading ? undefined : d.matchesToday ?? '0'} accent="#7ab3d4" icon={Zap} />
        <MetricCard label="Total Connections" value={loading ? undefined : d.totalConnections?.toLocaleString() ?? '0'} accent="#60a5fa" icon={MessageSquare} />
      </div>

      {/* Lower panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <p style={S.h2}>Pending Actions</p>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8, overflow: 'hidden' }}>
            <ActionRow label="Verification Requests" count={d.pendingVerifications || 0} href="/verification" urgency="med" />
            <ActionRow label="Open Reports" count={d.pendingReports || 0} href="/reports" urgency="high" />
            <ActionRow label="Suspended Users" count={d.suspendedUsers || 0} href="/users" urgency="low" />
            <div style={{ padding: '12px 16px' }}>
              <span style={{ fontSize: 13, color: '#2d4055' }}>Pending Deletions — 0</span>
            </div>
          </div>
        </div>

        <div>
          <p style={S.h2}>System Health</p>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8, overflow: 'hidden' }}>
            <HealthRow label="API Server" status="ok" />
            <HealthRow label="PostgreSQL" status={health?.database?.status === 'ok' ? 'ok' : 'warn'} detail={health?.database?.latency ? `${health.database.latency}ms` : undefined} />
            <HealthRow label="Redis Cache" status={health?.redis?.status === 'ok' ? 'ok' : 'warn'} detail={health?.redis?.latency ? `${health.redis.latency}ms` : undefined} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <span style={{ fontSize: 13, color: '#7a9bb5' }}>Email (Resend)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse-dot 2.5s ease infinite' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#34d399', letterSpacing: 1 }}>OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
