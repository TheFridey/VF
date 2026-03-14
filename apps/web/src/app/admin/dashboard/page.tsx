'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Shield, Flag, Activity, Clock, Database, Server, Zap, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import Link from 'next/link';

const S = {
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 },
  val: { fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 500, color: '#dce8f5', lineHeight: 1, letterSpacing: -1 },
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8, padding: '20px 22px' },
  section: { marginBottom: 28 },
  h2: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#7a9bb5', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 14 },
};

function MetricCard({ label, value, sub, accent, icon: Icon, href, trend }: any) {
  const inner = (
    <div style={{ ...S.card, position: 'relative', overflow: 'hidden', cursor: href ? 'pointer' : 'default',
      transition: 'border-color 0.15s', borderColor: '#1a2636' }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = '#d4a853')}
      onMouseLeave={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = '#1a2636')}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}40, ${accent}10)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={S.label}>{label}</p>
          <p style={{ ...S.val, color: accent || '#dce8f5' }}>{value ?? '—'}</p>
          {sub && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068', marginTop: 8 }}>{sub}</p>}
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              {trend >= 0 ? <TrendingUp size={10} color="#34d399" /> : <TrendingDown size={10} color="#f87171" />}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: trend >= 0 ? '#34d399' : '#f87171' }}>
                {trend >= 0 ? '+' : ''}{trend}% vs last week
              </span>
            </div>
          )}
        </div>
        <div style={{ width: 36, height: 36, background: `${accent}14`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={accent} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function HealthRow({ label, status, latency }: { label: string; status: 'ok' | 'error' | 'warn'; latency?: number }) {
  const colors = { ok: '#34d399', error: '#f87171', warn: '#fbbf24' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #141f2e' }}>
      <span style={{ fontSize: 13, color: '#7a9bb5' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {latency && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{latency}ms</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status], display: 'inline-block', animation: status === 'ok' ? 'pulse-dot 2.5s ease infinite' : 'none' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: colors[status], letterSpacing: 1 }}>{status.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ label, count, href, urgency }: { label: string; count: number; href: string; urgency: 'high' | 'med' | 'low' }) {
  const colors = { high: '#f87171', med: '#fbbf24', low: '#34d399' };
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid #141f2e', textDecoration: 'none', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,168,83,0.04)'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
      <span style={{ fontSize: 13, color: '#7a9bb5' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: count > 0 ? colors[urgency] : '#2d3f55' }}>{count}</span>
        {count > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[urgency], display: 'inline-block' }} />}
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminApi.getDashboardStats(), refetchInterval: 60000 });
  const { data: health } = useQuery({ queryKey: ['system-health'], queryFn: () => adminApi.getSystemHealth(), refetchInterval: 30000 });
  const { data: modStats } = useQuery({ queryKey: ['moderation-stats'], queryFn: () => adminApi.getModerationStats() });

  const d = stats || {};

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5, marginBottom: 4 }}>
          Command Dashboard
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068', letterSpacing: 1.5 }}>
          PLATFORM OVERVIEW — REAL TIME
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ ...S.card, height: 100, background: 'linear-gradient(90deg, #0d1524 25%, #111c2e 50%, #0d1524 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Primary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <MetricCard label="Total Personnel" value={d.totalUsers?.toLocaleString()} accent="#7ab3d4" icon={Users} href="/admin/users" trend={d.userGrowth} />
            <MetricCard label="Verified Veterans" value={d.verifiedVeterans?.toLocaleString()} accent="#34d399" icon={Shield} href="/admin/verification" />
            <MetricCard label="Open Reports" value={d.openReports} accent={d.openReports > 5 ? '#f87171' : '#fbbf24'} icon={Flag} href="/admin/reports" />
            <MetricCard label="Connections" value={d.totalConnections?.toLocaleString()} accent="#a78bfa" icon={MessageSquare} />
          </div>

          {/* Secondary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            <MetricCard label="New Today" value={d.newUsersToday} accent="#d4a853" icon={TrendingUp} sub="registered users" />
            <MetricCard label="New This Week" value={d.newUsersWeek} accent="#d4a853" icon={Activity} />
            <MetricCard label="Connections Today" value={d.connectionsToday} accent="#7ab3d4" icon={Zap} />
            <MetricCard label="Pending Verification" value={d.pendingVerifications} accent={d.pendingVerifications > 0 ? '#fbbf24' : '#34d399'} icon={Clock} href="/admin/verification" />
          </div>

          {/* Lower panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

            {/* Pending actions */}
            <div>
              <p style={S.h2}>Pending Actions</p>
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <ActionRow label="Verification Requests" count={d.pendingVerifications || 0} href="/admin/verification" urgency="med" />
                <ActionRow label="Open Reports" count={d.openReports || 0} href="/admin/reports" urgency="high" />
                <ActionRow label="Suspended Users" count={d.suspendedUsers || 0} href="/admin/users?status=SUSPENDED" urgency="low" />
                <div style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 13, color: '#7a9bb5' }}>Pending Deletions</span>
                </div>
              </div>
            </div>

            {/* System health */}
            <div>
              <p style={S.h2}>System Health</p>
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <HealthRow label="API Server" status="ok" />
                <HealthRow label="PostgreSQL" status="ok" latency={health?.database?.latency} />
                <HealthRow label="Redis Cache" status="ok" latency={health?.redis?.latency} />
                <HealthRow label="Email (Resend)" status="ok" />
              </div>
            </div>

            {/* Reports by reason */}
            {modStats && Object.keys(modStats.byReason || {}).length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={S.h2}>Reports by Category</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {Object.entries(modStats.byReason || {}).map(([reason, count]) => (
                    <div key={reason} style={{ ...S.card, textAlign: 'center', padding: '16px 14px' }}>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500, color: '#f87171', lineHeight: 1, marginBottom: 8 }}>{count as number}</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 1.5, textTransform: 'uppercase' }}>{reason.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
