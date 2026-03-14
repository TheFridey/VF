'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, Flag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { usePersistedAdminState } from '@/lib/use-persisted-admin-state';
import {
  AdminBulkActionBar,
  AdminCard,
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminSelect,
  AdminStatusChip,
  AdminTableCell,
  AdminTableHeadCell,
  AdminTableShell,
  adminActionButtonStyle,
  adminTextareaStyle,
  adminTheme,
} from '@/components/admin-ui';

type ResolveChoice = {
  label: string;
  status: 'DISMISSED' | 'ACTION_TAKEN';
  userAction?: 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
};

const reasonColors: Record<string, string> = {
  HARASSMENT: adminTheme.danger,
  FAKE_PROFILE: adminTheme.warning,
  SPAM: '#f97316',
  INAPPROPRIATE_CONTENT: '#fb7185',
  SCAM: adminTheme.danger,
  IMPERSONATION: adminTheme.warning,
  OTHER: adminTheme.textMuted,
};

const statusColors: Record<string, string> = {
  PENDING: adminTheme.warning,
  DISMISSED: adminTheme.textMuted,
  ACTION_TAKEN: adminTheme.violet,
};

const resolutionChoices: Record<string, ResolveChoice> = {
  DISMISSED: { label: 'Dismissed - no action', status: 'DISMISSED' },
  WARNING: { label: 'Warning issued', status: 'ACTION_TAKEN', userAction: 'WARNING' },
  SUSPEND_7_DAYS: { label: 'Suspend 7 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_7_DAYS' },
  SUSPEND_30_DAYS: { label: 'Suspend 30 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_30_DAYS' },
  PERMANENT_BAN: { label: 'Permanent ban', status: 'ACTION_TAKEN', userAction: 'PERMANENT_BAN' },
};

export default function ReportsPage() {
  const [filters, setFilters, hydrated] = usePersistedAdminState('vf-admin-reports-filters', {
    status: 'PENDING',
  });
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolveChoice, setResolveChoice] = useState<keyof typeof resolutionChoices>('DISMISSED');
  const [resolution, setResolution] = useState('');
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReports({ status: filters.status || undefined });
      const nextReports = Array.isArray(data) ? data : (data.reports || data.data || []);
      setReports(nextReports);
      setSelectedIds((current) => current.filter((id) => nextReports.some((report: any) => report.id === id)));
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    fetchReports().catch(console.error);
  }, [filters.status, hydrated]);

  const openCount = useMemo(
    () => reports.filter((report) => report.status === 'PENDING').length,
    [reports],
  );

  const allPendingSelected =
    reports.filter((report) => report.status === 'PENDING').length > 0 &&
    reports.filter((report) => report.status === 'PENDING').every((report) => selectedIds.includes(report.id));

  const submitResolution = async (bulk = false) => {
    if (!resolution.trim()) {
      toast.error('Resolution notes are required');
      return;
    }

    const choice = resolutionChoices[resolveChoice];
    setSaving(true);
    try {
      if (bulk) {
        const result = await adminApi.bulkResolveReports({
          reportIds: selectedIds,
          status: choice.status,
          resolution,
          userAction: choice.userAction,
        });
        toast.success(`${result.updatedCount || 0} reports resolved`);
        setSelectedIds([]);
        setBulkResolveOpen(false);
      } else if (selectedReport) {
        await adminApi.resolveReport(selectedReport.id, {
          status: choice.status,
          resolution,
          userAction: choice.userAction,
        });
        toast.success('Report resolved');
        setSelectedReport(null);
      }

      setResolution('');
      setResolveChoice('DISMISSED');
      await fetchReports();
    } catch {
      toast.error('Unable to resolve report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Moderation"
        title="Reports"
        description="Work through conduct reports with saved filters, clearer status chips, and bulk resolution when the outcome is consistent."
        actions={
          <>
            <AdminStatusChip label={`${openCount} open`} color={openCount > 0 ? adminTheme.danger : adminTheme.success} />
            <AdminSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
              <option value="PENDING">Pending</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ACTION_TAKEN">Action taken</option>
              <option value="">All statuses</option>
            </AdminSelect>
          </>
        }
      />

      <AdminBulkActionBar count={selectedIds.length}>
        <button type="button" onClick={() => { setBulkResolveOpen(true); setResolution(''); setResolveChoice('DISMISSED'); }} style={adminActionButtonStyle(adminTheme.warning, true)}>
          <Check size={13} />
          Bulk resolve
        </button>
        <button type="button" onClick={() => setSelectedIds([])} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
          Clear
        </button>
      </AdminBulkActionBar>

      <AdminFilterBar>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: adminTheme.textMuted, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={allPendingSelected}
            onChange={(event) => {
              setSelectedIds(
                event.target.checked
                  ? reports.filter((report) => report.status === 'PENDING').map((report) => report.id)
                  : [],
              );
            }}
          />
          Select all pending reports
        </label>
      </AdminFilterBar>

      <AdminTableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <AdminTableHeadCell>Select</AdminTableHeadCell>
              <AdminTableHeadCell>Reporter</AdminTableHeadCell>
              <AdminTableHeadCell>Reported user</AdminTableHeadCell>
              <AdminTableHeadCell>Reason</AdminTableHeadCell>
              <AdminTableHeadCell>Status</AdminTableHeadCell>
              <AdminTableHeadCell>Date</AdminTableHeadCell>
              <AdminTableHeadCell>Action</AdminTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <tr key={index}>
                  {[30, 150, 150, 90, 90, 80, 90].map((width, cellIndex) => (
                    <AdminTableCell key={cellIndex}>
                      <div style={{ height: 13, width, background: '#111c2e', borderRadius: 4 }} />
                    </AdminTableCell>
                  ))}
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <AdminEmptyState
                    title={filters.status === 'PENDING' ? 'NO OPEN REPORTS' : 'NO RECORDS'}
                    hint="Reports will appear here as members raise concerns."
                    icon={<Flag size={36} color={adminTheme.panelBorder} />}
                  />
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <AdminTableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(report.id)}
                      disabled={report.status !== 'PENDING'}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, report.id]
                            : current.filter((id) => id !== report.id),
                        );
                      }}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>
                      {report.reporter?.profile?.displayName || report.reporter?.email || '-'}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>
                      {report.reportedUser?.profile?.displayName || report.reportedUser?.email || '-'}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip
                      label={(report.reason || 'OTHER').replace(/_/g, ' ')}
                      color={reasonColors[report.reason] || adminTheme.textMuted}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip label={report.status || 'UNKNOWN'} color={statusColors[report.status] || adminTheme.textMuted} />
                  </AdminTableCell>
                  <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(report);
                        setResolveChoice('DISMISSED');
                        setResolution('');
                      }}
                      style={adminActionButtonStyle(adminTheme.accent, true)}
                    >
                      <Eye size={13} />
                      Review
                    </button>
                  </AdminTableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {(selectedReport || bulkResolveOpen) && (
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
          <AdminCard style={{ width: '100%', maxWidth: 560, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${adminTheme.panelInset}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {bulkResolveOpen ? 'Bulk resolution' : 'Report review'}
                </p>
                <h2 style={{ color: adminTheme.textStrong, fontSize: 22, marginTop: 8 }}>
                  {bulkResolveOpen ? `${selectedIds.length} selected report${selectedIds.length === 1 ? '' : 's'}` : 'Moderation decision'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setBulkResolveOpen(false);
                  setResolution('');
                }}
                style={adminActionButtonStyle(adminTheme.textMuted, true)}
              >
                <X size={13} />
                Close
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {selectedReport && !bulkResolveOpen ? (
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 14 }}>
                  <AdminCard style={{ padding: '14px 16px' }}>
                    <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                      Reporter
                    </p>
                    <p style={{ color: adminTheme.textStrong, marginTop: 8 }}>
                      {selectedReport.reporter?.profile?.displayName || selectedReport.reporter?.email || '-'}
                    </p>
                  </AdminCard>
                  <AdminCard style={{ padding: '14px 16px' }}>
                    <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                      Reported user
                    </p>
                    <p style={{ color: adminTheme.textStrong, marginTop: 8 }}>
                      {selectedReport.reportedUser?.profile?.displayName || selectedReport.reportedUser?.email || '-'}
                    </p>
                  </AdminCard>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <AdminStatusChip
                      label={(selectedReport.reason || 'OTHER').replace(/_/g, ' ')}
                      color={reasonColors[selectedReport.reason] || adminTheme.textMuted}
                    />
                    {selectedReport.description ? (
                      <p style={{ color: adminTheme.textMuted, fontSize: 13, lineHeight: 1.7, marginTop: 10 }}>
                        {selectedReport.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div>
                <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Outcome
                </label>
                <AdminSelect value={resolveChoice} onChange={(value) => setResolveChoice(value as keyof typeof resolutionChoices)} style={{ width: '100%' }}>
                  {Object.entries(resolutionChoices).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Resolution notes
                </label>
                <textarea
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  rows={4}
                  placeholder="Document the moderation outcome clearly."
                  style={adminTextareaStyle({ minHeight: 110 })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => submitResolution(Boolean(bulkResolveOpen))}
                  disabled={saving}
                  style={adminActionButtonStyle(resolveChoice === 'DISMISSED' ? adminTheme.success : adminTheme.warning)}
                >
                  {resolveChoice === 'DISMISSED' ? <Check size={14} /> : <AlertTriangle size={14} />}
                  {saving ? 'Saving...' : bulkResolveOpen ? 'Resolve selected' : 'Submit resolution'}
                </button>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
