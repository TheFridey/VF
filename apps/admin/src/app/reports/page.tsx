'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Flag, Eye, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: '#dce8f5', letterSpacing: 0.5 },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  textarea: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '9px 12px', color: '#c8d6e5', fontSize: 13, outline: 'none', width: '100%', resize: 'none' as const, fontFamily: "'Barlow', sans-serif" },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '11px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '13px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (c: string) => ({ background: `${c}14`, border: `1px solid ${c}30`, color: c, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }),
  badge: (c: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30` }),
};

type ResolutionChoice = {
  label: string;
  status: 'DISMISSED' | 'ACTION_TAKEN';
  userAction?: 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
};

const reasonColor: Record<string, string> = {
  HARASSMENT: '#f87171',
  FAKE_PROFILE: '#fbbf24',
  SPAM: '#f97316',
  INAPPROPRIATE_CONTENT: '#fb7185',
  SCAM: '#f87171',
  IMPERSONATION: '#fbbf24',
  OTHER: '#7a9bb5',
};

const statusColor: Record<string, string> = {
  PENDING: '#fbbf24',
  DISMISSED: '#7a9bb5',
  ACTION_TAKEN: '#a78bfa',
};

const resolutionChoices: Record<string, ResolutionChoice> = {
  DISMISSED: { label: 'Dismissed - no action', status: 'DISMISSED' },
  WARNING: { label: 'Warning issued', status: 'ACTION_TAKEN', userAction: 'WARNING' },
  SUSPEND_7_DAYS: { label: 'Suspend for 7 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_7_DAYS' },
  SUSPEND_30_DAYS: { label: 'Suspend for 30 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_30_DAYS' },
  PERMANENT_BAN: { label: 'Permanent ban', status: 'ACTION_TAKEN', userAction: 'PERMANENT_BAN' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [resolveChoice, setResolveChoice] = useState<keyof typeof resolutionChoices>('DISMISSED');
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReports({ status: statusFilter || undefined });
      setReports(Array.isArray(data) ? data : (data.reports || data.data || []));
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleResolve = async () => {
    if (!selected || !resolution.trim()) {
      return;
    }

    setSaving(true);
    try {
      const choice = resolutionChoices[resolveChoice];
      await adminApi.resolveReport(selected.id, {
        status: choice.status,
        resolution,
        userAction: choice.userAction,
      });
      toast.success('Report resolved');
      setSelected(null);
      setResolution('');
      setResolveChoice('DISMISSED');
      fetchReports();
    } catch {
      toast.error('Failed to resolve');
    } finally {
      setSaving(false);
    }
  };

  const openCount = reports.filter((report) => report.status === 'PENDING').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Reports</h1>
          <p style={{ ...S.label, marginTop: 5 }}>User-submitted conduct reports</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {openCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#f8717114', border: '1px solid #f8717130', borderRadius: 6 }}>
              <AlertTriangle size={13} color="#f87171" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#f87171' }}>{openCount} OPEN</span>
            </div>
          )}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={S.select}>
            <option value="PENDING">Pending</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ACTION_TAKEN">Action Taken</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Reporter', 'Reported', 'Reason', 'Status', 'Date', 'Action'].map((heading) => <th key={heading} style={S.th}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? [...Array(6)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[120, 120, 90, 70, 70, 80].map((width, columnIndex) => (
                  <td key={columnIndex} style={S.td}>
                    <div style={{ height: 13, background: '#111c2e', borderRadius: 3, width }} />
                  </td>
                ))}
              </tr>
            ))
              : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 56 }}>
                    <Flag size={36} color="#1a2636" style={{ margin: '0 auto 14px' }} />
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>
                      {statusFilter === 'PENDING' ? 'NO OPEN REPORTS' : 'NO RECORDS'}
                    </p>
                  </td>
                </tr>
              ) : reports.map((report: any) => (
                <tr
                  key={report.id}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = 'rgba(212,168,83,0.03)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent';
                  }}
                  style={{ transition: 'background 0.1s' }}
                >
                  <td style={S.td}><p style={{ fontSize: 12, fontWeight: 500, color: '#b8ccd8' }}>{report.reporter?.profile?.displayName || report.reporter?.email || '-'}</p></td>
                  <td style={S.td}><p style={{ fontSize: 12, fontWeight: 500, color: '#b8ccd8' }}>{report.reportedUser?.profile?.displayName || report.reportedUser?.email || '-'}</p></td>
                  <td style={S.td}><span style={S.badge(reasonColor[report.reason] || '#7a9bb5')}>{report.reason?.replace(/_/g, ' ')}</span></td>
                  <td style={S.td}><span style={S.badge(statusColor[report.status] || '#7a9bb5')}>{report.status}</span></td>
                  <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                  </td>
                  <td style={S.td}>
                    <button onClick={() => { setSelected(report); setResolveChoice('DISMISSED'); setResolution(''); }} style={S.btn('#d4a853')}><Eye size={11} /> Review</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.87)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, width: '100%', maxWidth: 500 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #141f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 20, color: '#dce8f5' }}>Report Review</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {[['Reporter', selected.reporter?.profile?.displayName || selected.reporter?.email], ['Reported', selected.reportedUser?.profile?.displayName || selected.reportedUser?.email]].map(([label, value]) => (
                  <div key={label} style={{ padding: 12, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e' }}>
                    <p style={{ ...S.label, marginBottom: 5 }}>{label}</p>
                    <p style={{ fontSize: 13, color: '#b8ccd8' }}>{value || '-'}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e', marginBottom: 18 }}>
                <p style={{ ...S.label, marginBottom: 6 }}>Reason</p>
                <span style={S.badge(reasonColor[selected.reason] || '#7a9bb5')}>{selected.reason?.replace(/_/g, ' ')}</span>
                {selected.description && <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 10, lineHeight: 1.6 }}>{selected.description}</p>}
              </div>
              {selected.status === 'PENDING' ? (
                <>
                  <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Action</label>
                  <select value={resolveChoice} onChange={(event) => setResolveChoice(event.target.value as keyof typeof resolutionChoices)} style={{ ...S.select, display: 'block', width: '100%', marginBottom: 12 }}>
                    {Object.entries(resolutionChoices).map(([key, choice]) => (
                      <option key={key} value={key}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                  <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Notes</label>
                  <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={3} placeholder="Resolution details..." style={{ ...S.textarea, marginBottom: 16 }} />
                  <button onClick={handleResolve} disabled={saving || !resolution.trim()} style={{ ...S.btn('#34d399'), width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13, opacity: !resolution.trim() ? 0.6 : 1 }}>
                    <Check size={13} /> Submit Resolution
                  </button>
                </>
              ) : (
                <div style={{ padding: 12, background: '#111c2e', borderRadius: 7 }}>
                  <span style={S.badge(statusColor[selected.status])}>{selected.status}</span>
                  {selected.resolution && <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 10 }}>{selected.resolution}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
