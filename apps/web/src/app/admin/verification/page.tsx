'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, Eye, ChevronLeft, ChevronRight, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin-api';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 13, fontFamily: "'Barlow', sans-serif", outline: 'none', width: '100%' },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '14px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500 }),
  badge: (color: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}30` }),
};

const statusColor: Record<string, string> = { PENDING: '#fbbf24', APPROVED: '#34d399', REJECTED: '#f87171' };

export default function AdminVerificationPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selected, setSelected] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verification', page, statusFilter],
    queryFn: () => adminApi.getVerificationRequests({ page, limit: 20, status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: any) => adminApi.approveVerification(id, notes),
    onSuccess: () => { toast.success('Verification approved — email sent to veteran'); qc.invalidateQueries({ queryKey: ['admin-verification'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); setSelected(null); setApprovalNotes(''); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => adminApi.rejectVerification(id, reason),
    onSuccess: () => { toast.success('Verification rejected — email sent to veteran'); qc.invalidateQueries({ queryKey: ['admin-verification'] }); setSelected(null); setRejectionReason(''); },
    onError: () => toast.error('Failed to reject'),
  });

  const requests = data?.requests || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Verification Queue</h1>
          <p style={{ ...S.label, marginTop: 4 }}>Review veteran identity documents</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {statusFilter === 'PENDING' && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fbbf2414', border: '1px solid #fbbf2430', borderRadius: 6 }}>
              <Clock size={13} color="#fbbf24" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#fbbf24' }}>{total} AWAITING REVIEW</span>
            </div>
          )}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={S.select}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Veteran', 'Status', 'Documents', 'Submitted', 'Reviewed', 'Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} style={S.td}><div style={{ height: 14, background: '#111c2e', borderRadius: 3, width: j === 0 ? 160 : 80 }} /></td>)}</tr>
              ))
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
                <Shield size={32} color="#1a2636" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>
                  {statusFilter === 'PENDING' ? 'QUEUE CLEAR' : 'NO RECORDS'}
                </p>
              </td></tr>
            ) : requests.map((req: any) => (
              <tr key={req.id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={S.td}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#b8ccd8' }}>{req.user?.profile?.displayName || '—'}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{req.user?.email}</p>
                </td>
                <td style={S.td}><span style={S.badge(statusColor[req.status] || '#7a9bb5')}>{req.status}</span></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} color="#3a5068" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{req.evidenceUrls?.length || 0} file{req.evidenceUrls?.length !== 1 ? 's' : ''}</span>
                  </div>
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : <span style={{ color: '#2d4055' }}>—</span>}
                </td>
                <td style={S.td}>
                  <button onClick={() => setSelected(req)}
                    style={{ ...S.btn('#d4a853'), display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Eye size={11} /> Review
                  </button>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={12} /> Prev</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === pages ? 0.4 : 1 }}>Next <ChevronRight size={12} /></button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '22px 24px', borderBottom: '1px solid #141f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 20, color: '#dce8f5' }}>
                  Verification Review
                </h3>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#d4a853', marginTop: 2 }}>
                  {selected.user?.profile?.displayName || selected.user?.email}
                </p>
              </div>
              <button onClick={() => { setSelected(null); setRejectionReason(''); setApprovalNotes(''); }}
                style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Evidence files */}
              <p style={{ ...S.label, marginBottom: 10 }}>Evidence Documents ({selected.evidenceUrls?.length || 0})</p>
              {selected.evidenceUrls?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {selected.evidenceUrls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#0a1420', border: '1px solid #1a2636', borderRadius: 6, color: '#7ab3d4', textDecoration: 'none', fontSize: 12 }}>
                      <FileText size={13} />
                      Document {i + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#f87171', marginBottom: 20 }}>No documents uploaded</p>
              )}

              {selected.status === 'PENDING' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Approve */}
                  <div style={{ padding: 16, background: '#34d39910', border: '1px solid #34d39930', borderRadius: 8 }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#34d399', letterSpacing: 1.5, marginBottom: 10 }}>APPROVE</p>
                    <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
                    <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
                      placeholder="Internal notes..."
                      style={{ ...S.input, height: 70, resize: 'none', marginBottom: 12 }} />
                    <button onClick={() => approveMutation.mutate({ id: selected.id, notes: approvalNotes })}
                      disabled={approveMutation.isPending}
                      style={{ ...S.btn('#34d399'), width: '100%', padding: '9px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={13} /> Approve Veteran
                    </button>
                  </div>

                  {/* Reject */}
                  <div style={{ padding: 16, background: '#f8717110', border: '1px solid #f8717130', borderRadius: 8 }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#f87171', letterSpacing: 1.5, marginBottom: 10 }}>REJECT</p>
                    <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Reason (required)</label>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Explain why the documents were rejected..."
                      style={{ ...S.input, height: 70, resize: 'none', marginBottom: 12 }} />
                    <button onClick={() => { if (!rejectionReason.trim()) { toast.error('Rejection reason is required'); return; } rejectMutation.mutate({ id: selected.id, reason: rejectionReason }); }}
                      disabled={rejectMutation.isPending || !rejectionReason.trim()}
                      style={{ ...S.btn('#f87171'), width: '100%', padding: '9px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !rejectionReason.trim() ? 0.5 : 1 }}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, background: '#111c2e', borderRadius: 8 }}>
                  <p style={{ ...S.label, marginBottom: 8 }}>Decision</p>
                  <span style={S.badge(statusColor[selected.status])}>{selected.status}</span>
                  {selected.rejectionReason && <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 10 }}>{selected.rejectionReason}</p>}
                  {selected.notes && <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 6 }}>{selected.notes}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
