'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RefreshCw, Database, Server, Activity } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

const S = {
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  h2: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#7a9bb5', letterSpacing: 2.5, textTransform: 'uppercase' as const, marginBottom: 12 },
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8, overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #141f2e' },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '7px 14px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }),
};

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const c = { ok: '#34d399', warn: '#fbbf24', error: '#f87171' }[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block', animation: status === 'ok' ? 'pulse-dot 2.5s ease infinite' : 'none' }} />
      <span style={{ ...S.mono, fontSize: 9, color: c, letterSpacing: 1 }}>{status.toUpperCase()}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try { const h = await adminApi.getHealth(); setHealth(h); }
    catch { /* health endpoint may not exist yet */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={S.h1}>System</h1>
          <p style={{ ...S.label, marginTop: 5 }}>Platform health and runtime info</p>
        </div>
        <button onClick={fetch} style={S.btn('#7a9bb5')}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <p style={S.h2}>Infrastructure</p>
          <div style={S.card}>
            {[
              { label: 'API Server (NestJS)', icon: Server, status: 'ok', detail: undefined },
              { label: 'PostgreSQL', icon: Database, status: health?.database?.status === 'ok' ? 'ok' : 'warn', detail: health?.database?.latency ? `${health.database.latency}ms` : undefined },
              { label: 'Redis Cache', icon: Activity, status: health?.redis?.status === 'ok' ? 'ok' : 'warn', detail: health?.redis?.latency ? `${health.redis.latency}ms` : undefined },
              { label: 'Email (Resend)', icon: Activity, status: 'ok', detail: undefined },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ ...S.row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #141f2e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <item.icon size={13} color="#3a5068" />
                  <span style={{ fontSize: 13, color: '#7a9bb5' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.detail && <span style={{ ...S.mono, fontSize: 10, color: '#3a5068' }}>{item.detail}</span>}
                  <StatusDot status={item.status as any} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={S.h2}>Runtime</p>
          <div style={S.card}>
            {[
              { label: 'Platform', value: 'VeteranFinder v5' },
              { label: 'Environment', value: 'production' },
              { label: 'ORM', value: 'Prisma 5.22' },
              { label: 'Framework', value: 'NestJS 10 / Next.js 14' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ ...S.row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #141f2e' }}>
                <span style={{ fontSize: 13, color: '#7a9bb5' }}>{item.label}</span>
                <span style={{ ...S.mono, fontSize: 11, color: '#d4a853' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={S.h2}>Session</p>
          <div style={S.card}>
            {[
              { label: 'Signed in as', value: user?.profile?.displayName || user?.email || '—' },
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

        <div>
          <p style={S.h2}>Developer</p>
          <div style={S.card}>
            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 13, color: '#7a9bb5', lineHeight: 1.7, marginBottom: 14 }}>
                Swagger API docs available in development at <span style={{ ...S.mono, color: '#d4a853', fontSize: 12 }}>/api/docs</span>.
              </p>
              <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/docs`}
                target="_blank" rel="noopener noreferrer"
                style={{ ...S.btn('#7ab3d4'), textDecoration: 'none', display: 'inline-flex' }}>
                API Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
