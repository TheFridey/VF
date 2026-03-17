'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Eye, FileText, Shield, X } from 'lucide-react';
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

const statusColors: Record<string, string> = {
  PENDING: adminTheme.warning,
  APPROVED: adminTheme.success,
  REJECTED: adminTheme.danger,
};

function getSlaLabel(sla?: { urgency?: string; hoursElapsed?: number; targetHours?: number }) {
  if (!sla) {
    return null;
  }

  if (sla.urgency === 'breached') {
    return { label: 'Breached', color: adminTheme.danger };
  }

  if (sla.urgency === 'urgent') {
    return { label: 'Urgent', color: adminTheme.warning };
  }

  return { label: 'On track', color: adminTheme.success };
}

export default function VerificationPage() {
  const [filters, setFilters, filtersHydrated] = usePersistedAdminState('vf-admin-verification-filters', {
    status: 'PENDING',
  });
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [queueSummary, setQueueSummary] = useState({ normal: 0, urgent: 0, breached: 0 });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPendingVerifications({
        status: filters.status || undefined,
        limit: 50,
      });
      const nextRequests = Array.isArray(data) ? data : (data.requests || data.data || []);
      setRequests(nextRequests);
      setQueueSummary(data.slaSummary || { normal: 0, urgent: 0, breached: 0 });
      setSelectedIds((current) => current.filter((id) => nextRequests.some((request: any) => request.id === id)));
    } catch {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    fetchRequests().catch(console.error);
  }, [fetchRequests, filtersHydrated]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING').length,
    [requests],
  );

  const selectableCount = requests.filter((request) => request.status === 'PENDING').length;
  const allSelectableSelected =
    selectableCount > 0 &&
    requests.filter((request) => request.status === 'PENDING').every((request) => selectedIds.includes(request.id));

  const applySingleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedRequest) {
      return;
    }

    if (decision === 'REJECT' && !decisionNotes.trim()) {
      toast.error('A rejection reason is required');
      return;
    }

    setSaving(true);
    try {
      if (decision === 'APPROVE') {
        await adminApi.approveVerification(selectedRequest.id, decisionNotes);
        toast.success('Verification approved');
      } else {
        await adminApi.rejectVerification(selectedRequest.id, decisionNotes);
        toast.success('Verification rejected');
      }

      setSelectedRequest(null);
      setDecisionNotes('');
      await fetchRequests();
    } catch {
      toast.error('Unable to save decision');
    } finally {
      setSaving(false);
    }
  };

  const applyBulkDecision = async () => {
    if (!bulkMode || selectedIds.length === 0) {
      return;
    }

    if (bulkMode === 'REJECT' && !decisionNotes.trim()) {
      toast.error('A rejection reason is required');
      return;
    }

    setSaving(true);
    try {
      const result = await adminApi.bulkReviewVerifications({
        requestIds: selectedIds,
        decision: bulkMode,
        notes: decisionNotes,
      });

      toast.success(
        `${result.updatedCount || 0} request${result.updatedCount === 1 ? '' : 's'} ${
          bulkMode === 'APPROVE' ? 'approved' : 'rejected'
        }`,
      );
      if (result.skippedCount) {
        toast(`${result.skippedCount} request${result.skippedCount === 1 ? '' : 's'} skipped`, {
          icon: 'i',
        });
      }

      setSelectedIds([]);
      setBulkMode(null);
      setDecisionNotes('');
      await fetchRequests();
    } catch {
      toast.error('Bulk review failed');
    } finally {
      setSaving(false);
    }
  };

  const openReview = (request: any) => {
    setSelectedRequest(request);
    setDecisionNotes(request.notes || request.rejectionReason || '');
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Trust operations"
        title="Verification Queue"
        description="Review documents, watch SLA pressure, and clear the queue without losing audit clarity."
        actions={
          <>
            <AdminStatusChip
              label={`${pendingCount} awaiting review`}
              color={pendingCount > 0 ? adminTheme.warning : adminTheme.success}
            />
            <AdminSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="">All statuses</option>
            </AdminSelect>
          </>
        }
      />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        {[
          { label: 'Pending', value: pendingCount, color: adminTheme.warning },
          { label: 'Urgent SLA', value: queueSummary.urgent, color: adminTheme.warning },
          { label: 'Breached SLA', value: queueSummary.breached, color: adminTheme.danger },
          { label: 'On track', value: queueSummary.normal, color: adminTheme.success },
        ].map((item) => (
          <AdminCard key={item.label} style={{ padding: '16px 18px' }}>
            <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
              {item.label}
            </p>
            <p style={{ color: item.color, fontSize: 28, fontWeight: 700, marginTop: 10 }}>{item.value}</p>
          </AdminCard>
        ))}
      </div>

      <AdminBulkActionBar count={selectedIds.length}>
        <button type="button" onClick={() => { setBulkMode('APPROVE'); setDecisionNotes(''); }} style={adminActionButtonStyle(adminTheme.success, true)}>
          <Check size={13} />
          Bulk approve
        </button>
        <button type="button" onClick={() => { setBulkMode('REJECT'); setDecisionNotes(''); }} style={adminActionButtonStyle(adminTheme.danger, true)}>
          <X size={13} />
          Bulk reject
        </button>
        <button type="button" onClick={() => setSelectedIds([])} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
          Clear
        </button>
      </AdminBulkActionBar>

      <AdminFilterBar>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: adminTheme.textMuted, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={allSelectableSelected}
            onChange={(event) => {
              setSelectedIds(
                event.target.checked
                  ? requests.filter((request) => request.status === 'PENDING').map((request) => request.id)
                  : [],
              );
            }}
          />
          Select all pending requests
        </label>
      </AdminFilterBar>

      <AdminTableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <AdminTableHeadCell>Select</AdminTableHeadCell>
              <AdminTableHeadCell>Veteran</AdminTableHeadCell>
              <AdminTableHeadCell>Service context</AdminTableHeadCell>
              <AdminTableHeadCell>Evidence</AdminTableHeadCell>
              <AdminTableHeadCell>Status</AdminTableHeadCell>
              <AdminTableHeadCell>Submitted</AdminTableHeadCell>
              <AdminTableHeadCell>SLA</AdminTableHeadCell>
              <AdminTableHeadCell>Action</AdminTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <tr key={index}>
                  {[40, 180, 180, 80, 80, 90, 100, 90].map((width, cellIndex) => (
                    <AdminTableCell key={cellIndex}>
                      <div style={{ height: 13, width, background: '#111c2e', borderRadius: 4 }} />
                    </AdminTableCell>
                  ))}
                </tr>
              ))
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <AdminEmptyState
                    title={filters.status === 'PENDING' ? 'QUEUE CLEAR' : 'NO RECORDS'}
                    hint={filters.status === 'PENDING' ? 'No verification cases are waiting right now.' : 'Try widening the status filter.'}
                    icon={<Shield size={36} color={adminTheme.panelBorder} />}
                  />
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const slaMeta = getSlaLabel(request.sla);
                const isPending = request.status === 'PENDING';

                return (
                  <tr key={request.id}>
                    <AdminTableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(request.id)}
                        disabled={!isPending}
                        onChange={(event) => {
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...current, request.id]
                              : current.filter((id) => id !== request.id),
                          );
                        }}
                      />
                    </AdminTableCell>
                    <AdminTableCell>
                      <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>
                        {request.user?.profile?.displayName || 'Unknown veteran'}
                      </p>
                      <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                        {request.user?.email}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell>
                      <p style={{ color: adminTheme.textMuted, fontSize: 12 }}>{request.user?.veteranDetails?.branch || 'Not provided'}</p>
                      <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                        {request.user?.veteranDetails?.regiment || 'Unit not provided'}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} color={adminTheme.textSoft} />
                        <span style={{ color: adminTheme.textStrong, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                          {request.evidenceUrls?.length || 0}
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminStatusChip label={request.status} color={statusColors[request.status] || adminTheme.textMuted} />
                    </AdminTableCell>
                    <AdminTableCell style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </AdminTableCell>
                    <AdminTableCell>
                      {slaMeta ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <AdminStatusChip label={slaMeta.label} color={slaMeta.color} />
                          <span style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                            {request.sla.hoursElapsed}h / {request.sla.targetHours}h
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: adminTheme.textSoft, fontSize: 12 }}>-</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <button type="button" onClick={() => openReview(request)} style={adminActionButtonStyle(adminTheme.accent, true)}>
                        <Eye size={13} />
                        Review
                      </button>
                    </AdminTableCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {(selectedRequest || bulkMode) && (
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
          <AdminCard style={{ width: '100%', maxWidth: 620, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${adminTheme.panelInset}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {bulkMode ? 'Bulk review' : 'Verification review'}
                </p>
                <h2 style={{ color: adminTheme.textStrong, fontSize: 22, marginTop: 8 }}>
                  {bulkMode
                    ? `${bulkMode === 'APPROVE' ? 'Approve' : 'Reject'} ${selectedIds.length} request${selectedIds.length === 1 ? '' : 's'}`
                    : selectedRequest?.user?.profile?.displayName || selectedRequest?.user?.email}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setBulkMode(null);
                  setDecisionNotes('');
                }}
                style={adminActionButtonStyle(adminTheme.textMuted, true)}
              >
                <X size={13} />
                Close
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {selectedRequest && !bulkMode ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <AdminCard style={{ padding: '14px 16px' }}>
                      <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                        Evidence files
                      </p>
                      <p style={{ color: adminTheme.textStrong, fontSize: 24, fontWeight: 700, marginTop: 10 }}>
                        {selectedRequest.evidenceUrls?.length || 0}
                      </p>
                    </AdminCard>
                    <AdminCard style={{ padding: '14px 16px' }}>
                      <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                        SLA status
                      </p>
                      <div style={{ marginTop: 10 }}>
                        {getSlaLabel(selectedRequest.sla) ? (
                          <AdminStatusChip
                            label={getSlaLabel(selectedRequest.sla)!.label}
                            color={getSlaLabel(selectedRequest.sla)!.color}
                          />
                        ) : (
                          <span style={{ color: adminTheme.textMuted }}>No SLA data</span>
                        )}
                      </div>
                    </AdminCard>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(selectedRequest.evidenceUrls || []).map((url: string, index: number) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...adminActionButtonStyle(adminTheme.info, true),
                          textDecoration: 'none',
                        }}
                      >
                        <FileText size={13} />
                        Evidence {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 18 }}>
                <label style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  {bulkMode === 'REJECT' || selectedRequest?.status === 'PENDING' ? 'Decision notes / reason' : 'Decision notes'}
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(event) => setDecisionNotes(event.target.value)}
                  rows={4}
                  placeholder={bulkMode === 'REJECT' ? 'Explain why the evidence is being rejected.' : 'Optional notes for the audit trail.'}
                  style={adminTextareaStyle({ minHeight: 110 })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                {bulkMode ? (
                  <button type="button" onClick={applyBulkDecision} disabled={saving} style={adminActionButtonStyle(bulkMode === 'APPROVE' ? adminTheme.success : adminTheme.danger)}>
                    {bulkMode === 'APPROVE' ? <Check size={14} /> : <X size={14} />}
                    {saving ? 'Saving...' : bulkMode === 'APPROVE' ? 'Approve selected' : 'Reject selected'}
                  </button>
                ) : selectedRequest?.status === 'PENDING' ? (
                  <>
                    <button type="button" onClick={() => applySingleDecision('APPROVE')} disabled={saving} style={adminActionButtonStyle(adminTheme.success)}>
                      <Check size={14} />
                      {saving ? 'Saving...' : 'Approve'}
                    </button>
                    <button type="button" onClick={() => applySingleDecision('REJECT')} disabled={saving} style={adminActionButtonStyle(adminTheme.danger)}>
                      <X size={14} />
                      {saving ? 'Saving...' : 'Reject'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
