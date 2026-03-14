'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Database, Server, Activity, Cpu, HardDrive } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { useAuthStore } from '@/stores/auth-store';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  sectionHead: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#7a9bb5', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #141f2e' },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }),
};

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const colors = { ok: '#34d399', warn: '#fbbf24', error: '#f87171' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status], display: 'inline-block', animation: status === 'ok' ? 'pulse-dot 2.5s ease infinite' : 'none' }} />
      <span style={{ ...S.mono, fontSize: 10, color: colors[status], letterSpacing: 1 }}>{status.toUpperCase()}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 30000,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={S.h1}>System</h1>
          <p style={{ ...S.label, marginTop: 4 }}>Platform health and configuration</p>
        </div>
        <button onClick={() => refetch()} style={S.btn('#7a9bb5')}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* System health */}
        <div>
          <p style={S.sectionHead}>Infrastructure</p>
          <div style={S.card}>
            <div style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Server size={14} color="#3a5068" />
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>API Server (NestJS)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {health?.api?.uptime && <span style={{ ...S.mono, fontSize: 10, color: '#3a5068' }}>up {Math.floor(health.api.uptime / 3600)}h</span>}
                <StatusDot status="ok" />
              </div>
            </div>
            <div style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={14} color="#3a5068" />
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>PostgreSQL</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {health?.database?.latency && <span style={{ ...S.mono, fontSize: 10, color: '#3a5068' }}>{health.database.latency}ms</span>}
                <StatusDot status={health?.database?.status === 'ok' ? 'ok' : 'error'} />
              </div>
            </div>
            <div style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={14} color="#3a5068" />
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>Redis Cache</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {health?.redis?.latency && <span style={{ ...S.mono, fontSize: 10, color: '#3a5068' }}>{health.redis.latency}ms</span>}
                <StatusDot status={health?.redis?.status === 'ok' ? 'ok' : 'error'} />
              </div>
            </div>
            <div style={{ ...S.row, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={14} color="#3a5068" />
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>Email (Resend)</span>
              </div>
              <StatusDot status="ok" />
            </div>
          </div>
        </div>

        {/* Runtime info */}
        <div>
          <p style={S.sectionHead}>Runtime</p>
          <div style={S.card}>
            {[
              { label: 'Node.js Version', value: health?.nodeVersion || process.versions?.node || '—' },
              { label: 'Environment', value: process.env.NODE_ENV || 'production' },
              { label: 'Platform', value: 'VeteranFinder v4' },
              { label: 'DB Schema', value: 'Prisma 5.22' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ ...S.row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #141f2e' }}>
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>{item.label}</span>
                <span style={{ ...S.mono, fontSize: 11, color: '#d4a853' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session info */}
        <div>
          <p style={S.sectionHead}>Current Session</p>
          <div style={S.card}>
            {[
              { label: 'Logged in as', value: user?.profile?.displayName || user?.email || '—' },
              { label: 'Role', value: user?.role || '—' },
              { label: 'Session started', value: new Date().toLocaleTimeString('en-GB') },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ ...S.row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #141f2e' }}>
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>{item.label}</span>
                <span style={{ ...S.mono, fontSize: 11, color: '#b8ccd8' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API docs link */}
        <div>
          <p style={S.sectionHead}>Developer</p>
          <div style={S.card}>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: '#7a9bb5', marginBottom: 14, lineHeight: 1.6 }}>
                Swagger API documentation is available in development mode.
              </p>
              <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/docs`} target="_blank" rel="noopener noreferrer"
                style={{ ...S.btn('#7ab3d4'), textDecoration: 'none', display: 'inline-flex' }}>
                API Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
