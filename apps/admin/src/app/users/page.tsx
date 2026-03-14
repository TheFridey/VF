'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Eye, RefreshCw, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { usePersistedAdminState } from '@/lib/use-persisted-admin-state';
import {
  AdminBulkActionBar,
  AdminCard,
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  AdminStatusChip,
  AdminTableCell,
  AdminTableHeadCell,
  AdminTableShell,
  adminActionButtonStyle,
  adminTextareaStyle,
  adminTheme,
} from '@/components/admin-ui';

const roleColors: Record<string, string> = {
  ADMIN: adminTheme.accent,
  MODERATOR: adminTheme.violet,
  VETERAN_VERIFIED: adminTheme.success,
  VETERAN_MEMBER: adminTheme.info,
  VETERAN_UNVERIFIED: adminTheme.textMuted,
  CIVILIAN: adminTheme.textMuted,
};

const statusColors: Record<string, string> = {
  ACTIVE: adminTheme.success,
  PENDING: adminTheme.warning,
  SUSPENDED: '#f97316',
  BANNED: adminTheme.danger,
  DELETED: adminTheme.textMuted,
};

export default function UsersPage() {
  const [filters, setFilters, hydrated] = usePersistedAdminState('vf-admin-users-filters', {
    search: '',
    role: '',
    status: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [modal, setModal] = useState<{ type: 'status' | 'role'; user: any } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({
        page,
        limit: 25,
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
      });
      const nextUsers = data.users || data.data || [];
      setUsers(nextUsers);
      setTotal(data.total || 0);
      setPages(data.pages || data.totalPages || 1);
      setSelectedIds((current) => current.filter((id) => nextUsers.some((user: any) => user.id === id)));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    fetchUsers().catch(console.error);
  }, [hydrated, page, filters.search, filters.role, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.role, filters.status]);

  const updateUser = async () => {
    if (!modal) {
      return;
    }

    setSaving(true);
    try {
      if (modal.type === 'status') {
        await adminApi.updateUserStatus(modal.user.id, newValue, reason || undefined);
      } else {
        await adminApi.updateUserRole(modal.user.id, newValue);
      }

      toast.success(`${modal.type === 'status' ? 'Status' : 'Role'} updated`);
      setModal(null);
      setReason('');
      await fetchUsers();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [selectedIds, users],
  );

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) {
      toast.error('Choose a status and at least one user');
      return;
    }

    setSaving(true);
    try {
      const result = await adminApi.bulkUpdateUserStatus({
        userIds: selectedIds,
        status: bulkStatus,
        reason: bulkReason || undefined,
      });

      toast.success(`${result.updatedCount || 0} user${result.updatedCount === 1 ? '' : 's'} updated`);
      setSelectedIds([]);
      setBulkStatus('');
      setBulkReason('');
      setShowBulkPanel(false);
      await fetchUsers();
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setSaving(false);
    }
  };

  const allSelected = users.length > 0 && users.every((user) => selectedIds.includes(user.id));

  return (
    <div>
      <AdminPageHeader
        eyebrow="Operator tools"
        title="Personnel Registry"
        description={`${total.toLocaleString()} total users. Save filters locally and make controlled status changes in bulk.`}
        actions={
          <button type="button" onClick={() => fetchUsers()} style={adminActionButtonStyle(adminTheme.info)}>
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      <AdminBulkActionBar count={selectedIds.length}>
        <button type="button" onClick={() => setShowBulkPanel((value) => !value)} style={adminActionButtonStyle(adminTheme.warning, true)}>
          <Ban size={13} />
          Bulk status
        </button>
        <span style={{ color: adminTheme.textMuted, fontSize: 12 }}>
          {selectedUsers.filter((user) => user.status === 'BANNED').length} already banned
        </span>
        <button type="button" onClick={() => setSelectedIds([])} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
          Clear
        </button>
      </AdminBulkActionBar>

      {showBulkPanel ? (
        <AdminCard style={{ padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div>
              <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                New status
              </label>
              <AdminSelect value={bulkStatus} onChange={setBulkStatus}>
                <option value="">Choose status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </AdminSelect>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Reason
              </label>
              <textarea
                value={bulkReason}
                onChange={(event) => setBulkReason(event.target.value)}
                rows={3}
                placeholder="Why are these users being updated?"
                style={adminTextareaStyle()}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={applyBulkStatus} disabled={saving} style={adminActionButtonStyle(adminTheme.warning)}>
              <Users size={14} />
              {saving ? 'Saving...' : 'Apply bulk status'}
            </button>
          </div>
        </AdminCard>
      ) : null}

      <AdminFilterBar>
        <AdminSearchInput
          value={filters.search}
          onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          placeholder="Search name or email"
        />
        <AdminSelect value={filters.role} onChange={(value) => setFilters((current) => ({ ...current, role: value }))}>
          <option value="">All roles</option>
          <option value="VETERAN_UNVERIFIED">Unverified</option>
          <option value="VETERAN_VERIFIED">Verified</option>
          <option value="VETERAN_MEMBER">BIA member</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </AdminSelect>
        <AdminSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </AdminSelect>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: adminTheme.textMuted, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => setSelectedIds(event.target.checked ? users.map((user) => user.id) : [])}
          />
          Select page
        </label>
      </AdminFilterBar>

      <AdminTableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <AdminTableHeadCell>Select</AdminTableHeadCell>
              <AdminTableHeadCell>User</AdminTableHeadCell>
              <AdminTableHeadCell>Role</AdminTableHeadCell>
              <AdminTableHeadCell>Status</AdminTableHeadCell>
              <AdminTableHeadCell>Joined</AdminTableHeadCell>
              <AdminTableHeadCell>Actions</AdminTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, index) => (
                <tr key={index}>
                  {[30, 220, 90, 90, 80, 120].map((width, cellIndex) => (
                    <AdminTableCell key={cellIndex}>
                      <div style={{ height: 13, width, background: '#111c2e', borderRadius: 4 }} />
                    </AdminTableCell>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <AdminEmptyState
                    title="NO PERSONNEL FOUND"
                    hint="Try widening the saved filters."
                    icon={<Users size={36} color={adminTheme.panelBorder} />}
                  />
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <AdminTableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id),
                        );
                      }}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1a2744, #2d4070)',
                          border: `1px solid ${adminTheme.panelBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: adminTheme.accent,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {(user.profile?.displayName || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>
                          {user.profile?.displayName || 'Unknown user'}
                        </p>
                        <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip
                      label={(user.role || '').replace('VETERAN_', '').replace(/_/g, ' ') || 'UNKNOWN'}
                      color={roleColors[user.role] || adminTheme.textMuted}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip label={user.status || 'UNKNOWN'} color={statusColors[user.status] || adminTheme.textMuted} />
                  </AdminTableCell>
                  <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/users/${user.id}`} style={adminActionButtonStyle(adminTheme.info, true)}>
                        <Eye size={13} />
                        Timeline
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setModal({ type: 'role', user });
                          setNewValue(user.role);
                          setReason('');
                        }}
                        style={adminActionButtonStyle(adminTheme.violet, true)}
                      >
                        <Shield size={13} />
                        Role
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModal({ type: 'status', user });
                          setNewValue(user.status);
                          setReason('');
                        }}
                        style={adminActionButtonStyle(adminTheme.warning, true)}
                      >
                        <Ban size={13} />
                        Status
                      </button>
                    </div>
                  </AdminTableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {pages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
          <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            PAGE {page} OF {pages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
              <ChevronLeft size={13} />
            </button>
            <button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      ) : null}

      {modal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.84)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <AdminCard style={{ width: '100%', maxWidth: 440, padding: 24 }}>
            <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
              {modal.type === 'status' ? 'Update status' : 'Update role'}
            </p>
            <h2 style={{ color: adminTheme.textStrong, fontSize: 22, marginTop: 8 }}>
              {modal.user.profile?.displayName || modal.user.email}
            </h2>

            <div style={{ marginTop: 18 }}>
              <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                {modal.type === 'status' ? 'New status' : 'New role'}
              </label>
              <AdminSelect value={newValue} onChange={setNewValue} style={{ width: '100%' }}>
                {modal.type === 'status' ? (
                  <>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="BANNED">Banned</option>
                  </>
                ) : (
                  <>
                    <option value="VETERAN_UNVERIFIED">Veteran (unverified)</option>
                    <option value="VETERAN_VERIFIED">Veteran (verified)</option>
                    <option value="VETERAN_MEMBER">BIA member</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                  </>
                )}
              </AdminSelect>
            </div>

            {modal.type === 'status' ? (
              <div style={{ marginTop: 14 }}>
                <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Why is the user status changing?"
                  style={adminTextareaStyle()}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setModal(null)} style={adminActionButtonStyle(adminTheme.textMuted)}>
                Cancel
              </button>
              <button type="button" onClick={updateUser} disabled={saving} style={adminActionButtonStyle(adminTheme.accent)}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </div>
  );
}
