'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px 8px 34px', color: '#c8d6e5', fontSize: 13, outline: 'none', width: '100%' },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '11px 16px', borderBottom: '1px solid #0d1524', fontSize: 12, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }),
};

const actionColor = (a: string) => {
  if (a?.includes('DELETED') || a?.includes('BANNED') || a?.includes('REJECTED')) return '#f87171';
  if (a?.includes('CREATED') || a?.includes('APPROVED')) return '#34d399';
  if (a?.includes('LOGIN') || a?.includes('LOGOUT')) return '#7ab3d4';
  if (a?.includes('WARN') || a?.includes('SUSPEND')) return '#fbbf24';
  return '#7a9bb5';
};

const actionOptions = [
  { value: '', label: 'All Events' },
  { value: 'USER_CREATED', label: 'User Created' }, { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'USER_LOGIN', label: 'Login' }, { value: 'ROLE_CHANGED', label: 'Role Changed' },
  { value: 'STATUS_CHANGED', label: 'Status Changed' }, { value: 'VERIFICATION_APPROVED', label: 'Verification Approved' },
  { value: 'VERIFICATION_REJECTED', label: 'Verification Rejected' }, { value: 'REPORT_CREATED', label: 'Report Created' },
  { value: 'DATA_EXPORT', label: 'Data Export' },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({ page, limit: 30, userId: search || undefined, action: actionFilter || undefined });
      setLogs(data.logs || data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || data.totalPages || 1);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, search, actionFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, actionFilter]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>Audit Log</h1>
        <p style={{ ...S.label, marginTop: 5 }}>Immutable event trail — {total.toLocaleString()} records</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} color="#3a5068" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by user ID..."
            style={S.input} />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={S.select}>
          {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Timestamp', 'Event', 'User', 'Resource', 'IP'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? [...Array(12)].map((_, i) => <tr key={i}>{[110,130,120,100,80].map((w,j)=><td key={j} style={S.td}><div style={{height:12,background:'#111c2e',borderRadius:3,width:w}}/></td>)}</tr>)
            : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO EVENTS FOUND</p>
              </td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                style={{ transition: 'background 0.1s' }}>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', whiteSpace: 'nowrap' }}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                </td>
                <td style={S.td}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: actionColor(log.action), letterSpacing: 0.5 }}>{log.action}</span>
                </td>
                <td style={S.td}>
                  <p style={{ fontSize: 12, color: '#b8ccd8' }}>{log.user?.profile?.displayName || log.performedBy?.profile?.displayName || '—'}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068' }}>{(log.userId || log.performedById)?.slice(0, 8)}…</p>
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {log.resource}{log.resourceId ? ` / ${log.resourceId.slice(0, 8)}…` : ''}
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>PAGE {page} OF {pages} — {total.toLocaleString()} EVENTS</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ ...S.btn('#7a9bb5'), opacity: page===1 ? 0.4 : 1 }}><ChevronLeft size={12} /></button>
            <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages} style={{ ...S.btn('#7a9bb5'), opacity: page===pages ? 0.4 : 1 }}><ChevronRight size={12} /></button>
          </div>
        </div>
      )}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
