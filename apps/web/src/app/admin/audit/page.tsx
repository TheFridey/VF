'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { useDebounce } from '@/hooks';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 13, fontFamily: "'Barlow', sans-serif", outline: 'none', width: '100%' },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '11px 16px', borderBottom: '1px solid #0d1524', fontSize: 12, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500 }),
};

const actionColor = (action: string) => {
  if (action.includes('DELETED') || action.includes('BANNED') || action.includes('REJECTED')) return '#f87171';
  if (action.includes('CREATED') || action.includes('APPROVED') || action.includes('VERIFIED')) return '#34d399';
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return '#7ab3d4';
  if (action.includes('WARN') || action.includes('SUSPEND')) return '#fbbf24';
  return '#7a9bb5';
};

const actionOptions = [
  { value: '', label: 'All Events' },
  { value: 'USER_CREATED', label: 'User Created' }, { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'USER_LOGIN', label: 'Login' }, { value: 'USER_LOGOUT', label: 'Logout' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' }, { value: 'ROLE_CHANGED', label: 'Role Changed' },
  { value: 'STATUS_CHANGED', label: 'Status Changed' }, { value: 'VERIFICATION_APPROVED', label: 'Verification Approved' },
  { value: 'VERIFICATION_REJECTED', label: 'Verification Rejected' }, { value: 'REPORT_CREATED', label: 'Report Created' },
  { value: 'DATA_EXPORT', label: 'Data Export' },
];

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, debouncedSearch, actionFilter],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 30, userId: debouncedSearch || undefined, action: actionFilter || undefined }),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>Audit Log</h1>
        <p style={{ ...S.label, marginTop: 4 }}>Immutable event trail — {total.toLocaleString()} records</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} color="#3a5068" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input placeholder="Filter by user ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...S.input, paddingLeft: 32 }} />
        </div>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} style={S.select}>
          {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Timestamp', 'Event', 'User', 'Resource', 'IP Address'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} style={S.td}><div style={{ height: 12, background: '#111c2e', borderRadius: 3, width: j === 1 ? 120 : 80 }} /></td>)}</tr>)
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 40 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO EVENTS FOUND</p>
              </td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068', whiteSpace: 'nowrap' }}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                </td>
                <td style={S.td}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: actionColor(log.action || ''), letterSpacing: 0.5 }}>
                    {log.action}
                  </span>
                </td>
                <td style={S.td}>
                  <p style={{ fontSize: 12, color: '#b8ccd8' }}>{log.user?.profile?.displayName || '—'}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068' }}>{log.userId?.slice(0, 8)}...</p>
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {log.resource}{log.resourceId ? ` / ${log.resourceId.slice(0, 8)}...` : ''}
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>
                  {log.ipAddress || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>PAGE {page} OF {pages} — {total.toLocaleString()} EVENTS</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={12} /> Prev</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === pages ? 0.4 : 1 }}>Next <ChevronRight size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
