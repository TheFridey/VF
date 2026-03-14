'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { Search, Shield, Ban, Eye, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px 8px 34px', color: '#c8d6e5', fontSize: 13, outline: 'none', width: '100%' },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '11px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '13px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, whiteSpace: 'nowrap' as const }),
  badge: (c: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30` }),
};

const roleColor: Record<string, string> = { ADMIN: '#d4a853', MODERATOR: '#a78bfa', VETERAN_VERIFIED: '#34d399', VETERAN_MEMBER: '#60a5fa', VETERAN_UNVERIFIED: '#6b7f96' };
const statusColor: Record<string, string> = { ACTIVE: '#34d399', PENDING: '#fbbf24', SUSPENDED: '#f97316', BANNED: '#f87171', DELETED: '#6b7280' };

function Shimmer({ w = 80 }: { w?: number }) {
  return <div style={{ height: 13, borderRadius: 3, width: w, background: 'linear-gradient(90deg,#111c2e 25%,#172030 50%,#111c2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: 'status' | 'role'; user: any } | null>(null);
  const [newVal, setNewVal] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({ page, limit: 25, search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined });
      setUsers(data.users || data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || data.totalPages || 1);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const handleStatusUpdate = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await adminApi.updateUserStatus(modal.user.id, newVal);
      toast.success('Status updated');
      setModal(null);
      fetchUsers();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleRoleUpdate = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await adminApi.updateUserRole(modal.user.id, newVal);
      toast.success('Role updated');
      setModal(null);
      fetchUsers();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Personnel Registry</h1>
          <p style={{ ...S.label, marginTop: 5 }}>All registered users — {total.toLocaleString()} total</p>
        </div>
        <button onClick={fetchUsers} style={{ ...S.btn('#7a9bb5'), padding: '8px 14px', fontSize: 12 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} color="#3a5068" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
            style={S.input} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={S.select}>
          <option value="">All Roles</option>
          <option value="VETERAN_UNVERIFIED">Unverified</option>
          <option value="VETERAN_VERIFIED">Verified</option>
          <option value="VETERAN_MEMBER">BIA Member</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i}>{[200, 80, 70, 60, 120].map((w, j) => <td key={j} style={S.td}><Shimmer w={w} /></td>)}</tr>
            )) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>NO PERSONNEL FOUND</p>
              </td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                style={{ transition: 'background 0.1s' }}>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a2744,#2d4070)', border: '1px solid #1a2636', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#d4a853', flexShrink: 0 }}>
                      {(u.profile?.displayName || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#b8ccd8' }}>{u.profile?.displayName || '—'}</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td style={S.td}><span style={S.badge(roleColor[u.role] || '#7a9bb5')}>{u.role?.replace('VETERAN_', '').replace('_', ' ')}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[u.status] || '#7a9bb5')}>{u.status}</span></td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setModal({ type: 'role', user: u }); setNewVal(u.role); }} style={S.btn('#a78bfa')}>
                      <Shield size={11} /> Role
                    </button>
                    <button onClick={() => { setModal({ type: 'status', user: u }); setNewVal(u.status); }} style={S.btn('#f87171')}>
                      <Ban size={11} /> Status
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>PAGE {page} OF {pages}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...S.btn('#7a9bb5'), opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={12} /></button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ ...S.btn('#7a9bb5'), opacity: page === pages ? 0.4 : 1 }}><ChevronRight size={12} /></button>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, width: '100%', maxWidth: 420, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 18, color: '#dce8f5' }}>
                {modal.type === 'status' ? 'Update Status' : 'Update Role'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#d4a853', marginBottom: 16 }}>{modal.user.profile?.displayName || modal.user.email}</p>

            {modal.type === 'status' ? (
              <>
                <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>New Status</label>
                <select value={newVal} onChange={e => setNewVal(e.target.value)}
                  style={{ ...S.select, display: 'block', width: '100%', marginBottom: 14 }}>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended (7 days)</option>
                  <option value="BANNED">Permanently Banned</option>
                </select>
                <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Reason</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional reason..."
                  style={{ ...S.select, display: 'block', width: '100%', height: 70, resize: 'none', padding: '8px 12px', fontSize: 13, fontFamily: "'Barlow', sans-serif", marginBottom: 18 }} />
                <button onClick={handleStatusUpdate} disabled={saving}
                  style={{ ...S.btn('#d4a853'), padding: '10px 20px', fontSize: 13, width: '100%', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </>
            ) : (
              <>
                <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>New Role</label>
                <select value={newVal} onChange={e => setNewVal(e.target.value)}
                  style={{ ...S.select, display: 'block', width: '100%', marginBottom: 18 }}>
                  <option value="VETERAN_UNVERIFIED">Veteran (Unverified)</option>
                  <option value="VETERAN_VERIFIED">Veteran (Verified)</option>
                  <option value="VETERAN_MEMBER">BIA Member</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button onClick={handleRoleUpdate} disabled={saving}
                  style={{ ...S.btn('#d4a853'), padding: '10px 20px', fontSize: 13, width: '100%', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Confirm Role Change'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
