'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Shield, Check, X, Eye, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  textarea: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '9px 12px', color: '#c8d6e5', fontSize: 13, outline: 'none', width: '100%', resize: 'none' as const, fontFamily: "'Barlow', sans-serif" },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '11px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '14px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }),
  badge: (c: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30` }),
};

const statusColor: Record<string, string> = { PENDING: '#fbbf24', APPROVED: '#34d399', REJECTED: '#f87171' };

export default function VerificationPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPendingVerifications();
      // API returns array of pending, or paginated object
      const arr = Array.isArray(data) ? data : (data.requests || data.data || []);
      if (statusFilter === 'PENDING' || !statusFilter) {
        setRequests(arr.filter((r: any) => !statusFilter || r.status === statusFilter));
      } else {
        setRequests(arr.filter((r: any) => r.status === statusFilter));
      }
      setPendingCount(arr.filter((r: any) => r.status === 'PENDING').length);
    } catch { toast.error('Failed to load verifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleApprove = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.approveVerification(selected.id, approvalNotes);
      toast.success('Approved — email sent to veteran');
      setSelected(null); setApprovalNotes(''); fetch();
    } catch { toast.error('Failed to approve'); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!selected || !rejectionReason.trim()) { toast.error('Rejection reason required'); return; }
    setSaving(true);
    try {
      await adminApi.rejectVerification(selected.id, rejectionReason);
      toast.success('Rejected — email sent to veteran');
      setSelected(null); setRejectionReason(''); fetch();
    } catch { toast.error('Failed to reject'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Verification Queue</h1>
          <p style={{ ...S.label, marginTop: 5 }}>Review veteran identity documents</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fbbf2414', border: '1px solid #fbbf2430', borderRadius: 6 }}>
              <Clock size={13} color="#fbbf24" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#fbbf24' }}>{pendingCount} AWAITING</span>
            </div>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Veteran', 'Branch / Unit', 'Docs', 'Status', 'Submitted', 'SLA', 'Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i}>{[160,100,50,70,70,80].map((w,j)=><td key={j} style={S.td}><div style={{height:13,background:'#111c2e',borderRadius:3,width:w}}/></td>)}</tr>)
            : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 56 }}>
                <Shield size={36} color="#1a2636" style={{ margin: '0 auto 14px' }} />
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>
                  {statusFilter === 'PENDING' ? 'QUEUE CLEAR' : 'NO RECORDS'}
                </p>
              </td></tr>
            ) : requests.map((r: any) => (
              <tr key={r.id}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,168,83,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                style={{ transition: 'background 0.1s' }}>
                <td style={S.td}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#b8ccd8' }}>{r.user?.profile?.displayName || '—'}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068' }}>{r.user?.email}</p>
                </td>
                <td style={{ ...S.td, fontSize: 12 }}>
                  {r.user?.profile?.branch || '—'}
                  {r.user?.profile?.unit && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a5068', display: 'block' }}>{r.user.profile.unit}</span>}
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} color="#3a5068" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{r.evidenceUrls?.length || 0}</span>
                  </div>
                </td>
                <td style={S.td}><span style={S.badge(statusColor[r.status] || '#7a9bb5')}>{r.status}</span></td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td style={S.td}>
                  {r.sla ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={S.badge(
                        r.sla.urgency === 'breached' ? '#f87171' :
                        r.sla.urgency === 'urgent' ? '#fbbf24' : '#34d399'
                      )}>
                        {r.sla.urgency === 'breached' ? '🔴 BREACHED' :
                         r.sla.urgency === 'urgent' ? '🟡 URGENT' : '🟢 ON TRACK'}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', marginTop: 2 }}>
                        {r.sla.hoursElapsed}h / {r.sla.targetHours}h
                      </span>
                    </div>
                  ) : '—'}
                </td>
                <td style={S.td}>
                  <button onClick={() => { setSelected(r); setApprovalNotes(''); setRejectionReason(''); }}
                    style={S.btn('#d4a853')}><Eye size={11} /> Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.87)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #141f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 20, color: '#dce8f5' }}>Verification Review</h3>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#d4a853', marginTop: 2 }}>{selected.user?.profile?.displayName || selected.user?.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* Evidence */}
              <p style={{ ...S.label, display: 'block', marginBottom: 6 }}>Verification Recording ({selected.evidenceUrls?.length || 0} file{selected.evidenceUrls?.length !== 1 ? 's' : ''})</p>
              <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>
                ⚠ Video evidence is permanently deleted from secure storage immediately after you approve or reject. Download before deciding if needed.
              </p>
              {(selected.evidenceUrls?.length > 0) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                  {selected.evidenceUrls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#0a1420', border: '1px solid #1a2636', borderRadius: 6, color: '#7ab3d4', fontSize: 12 }}>
                      <FileText size={12} /> Recording {i + 1}
                    </a>
                  ))}
                </div>
              ) : <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#f87171', marginBottom: 20 }}>No documents uploaded</p>}

              {selected.status === 'PENDING' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ padding: 16, background: '#34d39910', border: '1px solid #34d39930', borderRadius: 8 }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#34d399', letterSpacing: 2, marginBottom: 10 }}>APPROVE</p>
                    <label style={{ ...S.label, display: 'block', marginBottom: 5 }}>Notes (optional)</label>
                    <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
                      placeholder="Internal notes..." rows={3} style={{ ...S.textarea, marginBottom: 12 }} />
                    <button onClick={handleApprove} disabled={saving}
                      style={{ ...S.btn('#34d399'), width: '100%', justifyContent: 'center', padding: '9px' }}>
                      <Check size={13} /> Approve
                    </button>
                  </div>
                  <div style={{ padding: 16, background: '#f8717110', border: '1px solid #f8717130', borderRadius: 8 }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#f87171', letterSpacing: 2, marginBottom: 10 }}>REJECT</p>
                    <label style={{ ...S.label, display: 'block', marginBottom: 5 }}>Reason (required)</label>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Why were docs rejected?" rows={3} style={{ ...S.textarea, marginBottom: 12 }} />
                    <button onClick={handleReject} disabled={saving || !rejectionReason.trim()}
                      style={{ ...S.btn('#f87171'), width: '100%', justifyContent: 'center', padding: '9px', opacity: !rejectionReason.trim() ? 0.5 : 1 }}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, background: '#111c2e', borderRadius: 8 }}>
                  <p style={{ ...S.label, marginBottom: 8 }}>Decision</p>
                  <span style={S.badge(statusColor[selected.status])}>{selected.status}</span>
                  {(selected.rejectionReason || selected.notes) && (
                    <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 10 }}>{selected.rejectionReason || selected.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
