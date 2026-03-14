'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Briefcase, Lock, Unlock, Trash2, Check, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin-api';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  tab: (active: boolean) => ({ padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', border: active ? '1px solid #d4a85340' : '1px solid transparent', background: active ? '#d4a85314' : 'transparent', color: active ? '#d4a853' : '#5a7089', fontFamily: "'Barlow', sans-serif", transition: 'all 0.15s' }),
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '12px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }),
  badge: (color: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}30` }),
};

function ForumsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-forum-threads', page],
    queryFn: () => adminApi.getForumThreads?.({ page, limit: 20 }) || Promise.resolve({ threads: [], total: 0, pages: 1 }),
  });
  const threads = data?.threads || [];

  const lockMutation = useMutation({
    mutationFn: ({ id, locked }: any) => adminApi.setThreadLocked?.(id, locked) || Promise.resolve(),
    onSuccess: () => { toast.success('Thread updated'); qc.invalidateQueries({ queryKey: ['admin-forum-threads'] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteThread?.(id) || Promise.resolve(),
    onSuccess: () => { toast.success('Thread deleted'); qc.invalidateQueries({ queryKey: ['admin-forum-threads'] }); },
  });

  return (
    <div style={S.card}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Thread', 'Category', 'Author', 'Posts', 'Status', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {isLoading ? (
            [...Array(6)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} style={S.td}><div style={{ height: 13, background: '#111c2e', borderRadius: 3, width: j === 0 ? 180 : 70 }} /></td>)}</tr>)
          ) : threads.length === 0 ? (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
              <MessageSquare size={28} color="#1a2636" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO THREADS</p>
            </td></tr>
          ) : threads.map((t: any) => (
            <tr key={t.id} style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
              <td style={S.td}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#b8ccd8', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
              </td>
              <td style={S.td}><span style={S.badge('#7ab3d4')}>{t.category?.name || '—'}</span></td>
              <td style={{ ...S.td, fontSize: 12 }}>{t.author?.profile?.displayName || '—'}</td>
              <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{t.postCount}</td>
              <td style={S.td}>
                <span style={S.badge(t.isLocked ? '#f87171' : '#34d399')}>{t.isLocked ? 'LOCKED' : 'OPEN'}</span>
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => lockMutation.mutate({ id: t.id, locked: !t.isLocked })}
                    style={S.btn(t.isLocked ? '#34d399' : '#fbbf24')}>
                    {t.isLocked ? <Unlock size={11} /> : <Lock size={11} />}
                    {t.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                  <button onClick={() => { if (confirm('Delete this thread?')) deleteMutation.mutate(t.id); }}
                    style={S.btn('#f87171')}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BusinessTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-business-listings', page],
    queryFn: () => adminApi.getBusinessListings?.({ page, limit: 20 }) || Promise.resolve({ listings: [], total: 0, pages: 1 }),
  });
  const listings = data?.listings || [];

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: any) => adminApi.setListingApproved?.(id, approved) || Promise.resolve(),
    onSuccess: () => { toast.success('Listing updated'); qc.invalidateQueries({ queryKey: ['admin-business-listings'] }); },
  });

  return (
    <div style={S.card}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Business', 'Category', 'Owner', 'Status', 'Submitted', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {isLoading ? (
            [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} style={S.td}><div style={{ height: 13, background: '#111c2e', borderRadius: 3, width: 90 }} /></td>)}</tr>)
          ) : listings.length === 0 ? (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
              <Briefcase size={28} color="#1a2636" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO LISTINGS</p>
            </td></tr>
          ) : listings.map((l: any) => (
            <tr key={l.id} style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
              <td style={S.td}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#b8ccd8' }}>{l.name}</p>
                {l.website && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{l.website}</p>}
              </td>
              <td style={S.td}><span style={S.badge('#a78bfa')}>{l.category}</span></td>
              <td style={{ ...S.td, fontSize: 12 }}>{l.user?.profile?.displayName || '—'}</td>
              <td style={S.td}><span style={S.badge(l.isApproved ? '#34d399' : '#fbbf24')}>{l.isApproved ? 'APPROVED' : 'PENDING'}</span></td>
              <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!l.isApproved ? (
                    <button onClick={() => approveMutation.mutate({ id: l.id, approved: true })}
                      style={S.btn('#34d399')}>
                      <Check size={11} /> Approve
                    </button>
                  ) : (
                    <button onClick={() => approveMutation.mutate({ id: l.id, approved: false })}
                      style={S.btn('#f87171')}>
                      <X size={11} /> Revoke
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminBiaPage() {
  const [tab, setTab] = useState<'forums' | 'business'>('forums');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>BIA Community</h1>
        <p style={{ ...S.label, marginTop: 4 }}>Moderate forums and business directory</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('forums')} style={S.tab(tab === 'forums')}>
          <MessageSquare size={13} style={{ display: 'inline', marginRight: 6 }} />Forums
        </button>
        <button onClick={() => setTab('business')} style={S.tab(tab === 'business')}>
          <Briefcase size={13} style={{ display: 'inline', marginRight: 6 }} />Business Directory
        </button>
      </div>

      {tab === 'forums' ? <ForumsTab /> : <BusinessTab />}
    </div>
  );
}
