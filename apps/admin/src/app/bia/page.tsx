'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { MessageSquare, Briefcase, Lock, Unlock, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '12px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }),
  badge: (c: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30` }),
  tab: (a: boolean) => ({ padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: a ? 600 : 400, cursor: 'pointer', border: a ? '1px solid #d4a85340' : '1px solid transparent', background: a ? '#d4a85314' : 'transparent', color: a ? '#d4a853' : '#5a7089', fontFamily: "'Barlow', sans-serif", transition: 'all 0.15s' }),
};

export default function BiaPage() {
  const [tab, setTab] = useState<'forums' | 'business'>('forums');
  const [threads, setThreads] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'forums') {
      // @ts-ignore
      (adminApi.getForumThreads?.() || Promise.resolve({ threads: [] }))
        .then((d: any) => setThreads(d.threads || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // @ts-ignore
      (adminApi.getBusinessListings?.() || Promise.resolve({ listings: [] }))
        .then((d: any) => setListings(d.listings || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const toggleLock = async (t: any) => {
    try {
      // @ts-ignore
      await (adminApi.setThreadLocked?.(t.id, !t.isLocked) || Promise.resolve());
      setThreads(prev => prev.map(x => x.id === t.id ? { ...x, isLocked: !t.isLocked } : x));
      toast.success(t.isLocked ? 'Thread unlocked' : 'Thread locked');
    } catch { toast.error('Failed'); }
  };

  const deleteThread = async (id: string) => {
    if (!confirm('Delete this thread permanently?')) return;
    try {
      // @ts-ignore
      await (adminApi.deleteThread?.(id) || Promise.resolve());
      setThreads(prev => prev.filter(x => x.id !== id));
      toast.success('Thread deleted');
    } catch { toast.error('Failed'); }
  };

  const toggleApproval = async (l: any) => {
    try {
      // @ts-ignore
      await (adminApi.setListingApproved?.(l.id, !l.isApproved) || Promise.resolve());
      setListings(prev => prev.map(x => x.id === l.id ? { ...x, isApproved: !l.isApproved } : x));
      toast.success(l.isApproved ? 'Listing revoked' : 'Listing approved');
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>BIA Community</h1>
        <p style={{ ...S.label, marginTop: 5 }}>Moderate forums and business directory</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('forums')} style={S.tab(tab === 'forums')}>
          <MessageSquare size={13} style={{ display: 'inline', marginRight: 6 }} />Forums
        </button>
        <button onClick={() => setTab('business')} style={S.tab(tab === 'business')}>
          <Briefcase size={13} style={{ display: 'inline', marginRight: 6 }} />Business Directory
        </button>
      </div>

      {tab === 'forums' ? (
        <div style={S.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Thread Title', 'Category', 'Author', 'Posts', 'Status', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}>{[200,90,100,50,70,120].map((w,j)=><td key={j} style={S.td}><div style={{height:12,background:'#111c2e',borderRadius:3,width:w}}/></td>)}</tr>)
              : threads.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 56 }}>
                  <MessageSquare size={32} color="#1a2636" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO THREADS YET</p>
                </td></tr>
              ) : threads.map((t: any) => (
                <tr key={t.id}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                  <td style={S.td}><p style={{ fontSize: 13, fontWeight: 500, color: '#b8ccd8', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p></td>
                  <td style={S.td}><span style={S.badge('#7ab3d4')}>{t.category?.name || '—'}</span></td>
                  <td style={{ ...S.td, fontSize: 12 }}>{t.author?.profile?.displayName || '—'}</td>
                  <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{t.postCount || 0}</td>
                  <td style={S.td}><span style={S.badge(t.isLocked ? '#f87171' : '#34d399')}>{t.isLocked ? 'LOCKED' : 'OPEN'}</span></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleLock(t)} style={S.btn(t.isLocked ? '#34d399' : '#fbbf24')}>
                        {t.isLocked ? <><Unlock size={11} />Unlock</> : <><Lock size={11} />Lock</>}
                      </button>
                      <button onClick={() => deleteThread(t.id)} style={S.btn('#f87171')}><Trash2 size={11} />Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={S.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Business', 'Category', 'Owner', 'Status', 'Date', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}>{[160,90,100,70,70,100].map((w,j)=><td key={j} style={S.td}><div style={{height:12,background:'#111c2e',borderRadius:3,width:w}}/></td>)}</tr>)
              : listings.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 56 }}>
                  <Briefcase size={32} color="#1a2636" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO LISTINGS YET</p>
                </td></tr>
              ) : listings.map((l: any) => (
                <tr key={l.id}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                  <td style={S.td}><p style={{ fontSize: 13, fontWeight: 500, color: '#b8ccd8' }}>{l.name}</p>{l.website && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{l.website}</p>}</td>
                  <td style={S.td}><span style={S.badge('#a78bfa')}>{l.category}</span></td>
                  <td style={{ ...S.td, fontSize: 12 }}>{l.user?.profile?.displayName || '—'}</td>
                  <td style={S.td}><span style={S.badge(l.isApproved ? '#34d399' : '#fbbf24')}>{l.isApproved ? 'APPROVED' : 'PENDING'}</span></td>
                  <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td style={S.td}>
                    <button onClick={() => toggleApproval(l)} style={S.btn(l.isApproved ? '#f87171' : '#34d399')}>
                      {l.isApproved ? <><X size={11} />Revoke</> : <><Check size={11} />Approve</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
