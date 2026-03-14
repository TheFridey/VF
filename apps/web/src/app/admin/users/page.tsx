'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Shield, Ban, Eye, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin-api';
import { useDebounce } from '@/hooks';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 13, fontFamily: "'Barlow', sans-serif", outline: 'none', width: '100%' },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  badge: (color: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}30` }),
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, textTransform: 'uppercase' as const, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '13px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500, transition: 'all 0.1s' }),
};

const roleColor: Record<string, string> = {
  ADMIN: '#d4a853', MODERATOR: '#a78bfa', VETERAN_VERIFIED: '#34d399',
  VETERAN_MEMBER: '#60a5fa', VETERAN_UNVERIFIED: '#94a3b8',
};
const statusColor: Record<string, string> = {
  ACTIVE: '#34d399', PENDING: '#fbbf24', SUSPENDED: '#f97316', BANNED: '#f87171', DELETED: '#6b7280',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ type: 'status' | 'role'; user: any } | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');
  const [reason, setReason] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, roleFilter, statusFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 25, search: debouncedSearch || undefined, role: roleFilter || undefined, status: statusFilter || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: any) => adminApi.updateUserStatus(id, { status, reason }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); setReason(''); },
    onError: () => toast.error('Failed to update status'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: any) => adminApi.updateUserRole(id, { role }),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
    onError: () => toast.error('Failed to update role'),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Personnel Registry</h1>
          <p style={{ ...S.label, marginTop: 4 }}>All registered users — {total.toLocaleString()} total</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
          style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} color="#3a5068" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...S.input, paddingLeft: 32 }} />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={S.select}>
          <option value="">All Roles</option>
          <option value="VETERAN_UNVERIFIED">Unverified</option>
          <option value="VETERAN_VERIFIED">Verified</option>
          <option value="VETERAN_MEMBER">BIA Member</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={S.select}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['User', 'Role', 'Status', 'Joined', 'Last Active', 'Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={S.td}>
                      <div style={{ height: 14, background: '#111c2e', borderRadius: 3, width: j === 0 ? 180 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: '40px', color: '#2d4055' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2 }}>NO PERSONNEL FOUND</p>
              </td></tr>
            ) : users.map((user: any) => (
              <tr key={user.id} className="vf-table-row" style={{ transition: 'background 0.1s' }}>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1a2744, #2d4070)', border: '1px solid #1a2636', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#d4a853', flexShrink: 0 }}>
                      {(user.profile?.displayName || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#b8ccd8', marginBottom: 2 }}>{user.profile?.displayName || '—'}</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{user.email}</p>
                    </div>
                  </div>
                </td>
                <td style={S.td}><span style={S.badge(roleColor[user.role] || '#7a9bb5')}>{user.role.replace('VETERAN_', '').replace('_', ' ')}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[user.status] || '#7a9bb5')}>{user.status}</span></td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/admin/users/${user.id}`}
                      style={{ ...S.btn('#7ab3d4'), display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      <Eye size={11} /> View
                    </Link>
                    <button onClick={() => { setModal({ type: 'role', user }); setNewRole(user.role); }}
                      style={{ ...S.btn('#a78bfa'), display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={11} /> Role
                    </button>
                    <button onClick={() => { setModal({ type: 'status', user }); setNewStatus(user.status); }}
                      style={{ ...S.btn('#f87171'), display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ban size={11} /> Status
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>
            PAGE {page} OF {pages} — {total} RECORDS
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={12} /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === pages ? 0.4 : 1 }}>
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 18, color: '#dce8f5', letterSpacing: 0.5 }}>
                {modal.type === 'status' ? 'Update Status' : 'Update Role'} — {modal.user.profile?.displayName || modal.user.email}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {modal.type === 'status' ? (
              <>
                <label style={S.label}>New Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...S.select, display: 'block', width: '100%', marginTop: 6, marginBottom: 14 }}>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspend (7 days)</option>
                  <option value="BANNED">Permanent Ban</option>
                </select>
                <label style={S.label}>Reason (optional)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..."
                  style={{ ...S.input, marginTop: 6, marginBottom: 18, height: 80, resize: 'none' }} />
                <button onClick={() => statusMutation.mutate({ id: modal.user.id, status: newStatus, reason })}
                  disabled={statusMutation.isPending}
                  style={{ ...S.btn('#d4a853'), padding: '10px 20px', fontSize: 13, width: '100%', opacity: statusMutation.isPending ? 0.6 : 1 }}>
                  {statusMutation.isPending ? 'Updating...' : 'Confirm Update'}
                </button>
              </>
            ) : (
              <>
                <label style={S.label}>New Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...S.select, display: 'block', width: '100%', marginTop: 6, marginBottom: 18 }}>
                  <option value="VETERAN_UNVERIFIED">Veteran (Unverified)</option>
                  <option value="VETERAN_VERIFIED">Veteran (Verified)</option>
                  <option value="VETERAN_MEMBER">BIA Member</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button onClick={() => roleMutation.mutate({ id: modal.user.id, role: newRole })}
                  disabled={roleMutation.isPending}
                  style={{ ...S.btn('#d4a853'), padding: '10px 20px', fontSize: 13, width: '100%', opacity: roleMutation.isPending ? 0.6 : 1 }}>
                  {roleMutation.isPending ? 'Updating...' : 'Confirm Role Change'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
