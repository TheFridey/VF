'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { usePersistedAdminState } from '@/lib/use-persisted-admin-state';
import {
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
  adminTheme,
} from '@/components/admin-ui';

const actionOptions = [
  { value: '', label: 'All events' },
  { value: 'USER_CREATED', label: 'User created' },
  { value: 'USER_LOGIN', label: 'User login' },
  { value: 'VERIFICATION_SUBMITTED', label: 'Verification submitted' },
  { value: 'VERIFICATION_APPROVED', label: 'Verification approved' },
  { value: 'VERIFICATION_REJECTED', label: 'Verification rejected' },
  { value: 'report_created', label: 'Report created' },
  { value: 'report_resolved', label: 'Report resolved' },
  { value: 'user_status_updated', label: 'User status changed' },
  { value: 'user_role_updated', label: 'User role changed' },
];

function actionColor(action?: string) {
  if (!action) {
    return adminTheme.textMuted;
  }

  if (action.includes('APPROVED') || action.includes('CREATED')) {
    return adminTheme.success;
  }

  if (action.includes('REJECTED') || action.includes('banned') || action.includes('suspended')) {
    return adminTheme.danger;
  }

  if (action.includes('LOGIN') || action.includes('updated')) {
    return adminTheme.info;
  }

  return adminTheme.warning;
}

export default function AuditPage() {
  const [filters, setFilters, hydrated] = usePersistedAdminState('vf-admin-audit-filters', {
    search: '',
    action: '',
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        page,
        limit: 30,
        userId: filters.search || undefined,
        action: filters.action || undefined,
      });
      setLogs(data.logs || data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || data.totalPages || 1);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    fetchLogs().catch(console.error);
  }, [hydrated, page, filters.search, filters.action]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.action]);

  const uniqueResources = useMemo(
    () => [...new Set(logs.map((log) => log.resource).filter(Boolean))],
    [logs],
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="System record"
        title="Audit Log"
        description="Immutable operator and platform events. Saved filters persist locally so investigations are easier to resume."
      />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        <AdminCard style={{ padding: '16px 18px' }}>
          <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            Total records
          </p>
          <p style={{ color: adminTheme.textStrong, fontSize: 28, fontWeight: 700, marginTop: 10 }}>{total.toLocaleString()}</p>
        </AdminCard>
        <AdminCard style={{ padding: '16px 18px' }}>
          <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            Active filter
          </p>
          <div style={{ marginTop: 10 }}>
            <AdminStatusChip label={filters.action || 'All events'} color={filters.action ? adminTheme.warning : adminTheme.success} />
          </div>
        </AdminCard>
        <AdminCard style={{ padding: '16px 18px' }}>
          <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            Resources on page
          </p>
          <p style={{ color: adminTheme.textStrong, fontSize: 28, fontWeight: 700, marginTop: 10 }}>{uniqueResources.length}</p>
        </AdminCard>
      </div>

      <AdminFilterBar>
        <AdminSearchInput
          value={filters.search}
          onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          placeholder="Filter by user ID"
          width={280}
        />
        <AdminSelect value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))}>
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </AdminFilterBar>

      <AdminTableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <AdminTableHeadCell>Timestamp</AdminTableHeadCell>
              <AdminTableHeadCell>Event</AdminTableHeadCell>
              <AdminTableHeadCell>User</AdminTableHeadCell>
              <AdminTableHeadCell>Resource</AdminTableHeadCell>
              <AdminTableHeadCell>Metadata</AdminTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, index) => (
                <tr key={index}>
                  {[120, 160, 120, 100, 220].map((width, cellIndex) => (
                    <AdminTableCell key={cellIndex}>
                      <div style={{ height: 13, width, background: '#111c2e', borderRadius: 4 }} />
                    </AdminTableCell>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <AdminEmptyState
                    title="NO EVENTS FOUND"
                    hint="Try widening the action or user filter."
                    icon={<FileText size={36} color={adminTheme.panelBorder} />}
                  />
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip label={log.action} color={actionColor(log.action)} />
                  </AdminTableCell>
                  <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {log.userId ? `${log.userId.slice(0, 8)}...` : 'System'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={{ color: adminTheme.textStrong, fontSize: 12 }}>{log.resource || '-'}</span>
                      {log.resourceId ? (
                        <span style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                          {log.resourceId.slice(0, 8)}...
                        </span>
                      ) : null}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {log.metadata && Object.keys(log.metadata).length > 0
                      ? Object.entries(log.metadata)
                          .slice(0, 3)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(' | ')
                      : 'No metadata'}
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
    </div>
  );
}
