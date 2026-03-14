'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Eye, Check, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin-api';

const S = {
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 8 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  select: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none', cursor: 'pointer' },
  input: { background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '8px 12px', color: '#c8d6e5', fontSize: 13, fontFamily: "'Barlow', sans-serif", outline: 'none', width: '100%' },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#2d4055', letterSpacing: 2, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid #141f2e', fontWeight: 500 },
  td: { padding: '13px 16px', borderBottom: '1px solid #0d1524', fontSize: 13, color: '#7a9bb5', verticalAlign: 'middle' as const },
  btn: (color: string) => ({ background: `${color}14`, border: `1px solid ${color}30`, color, borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 500 }),
  badge: (color: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}30` }),
};

type ResolutionOption = {
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
  UNDERAGE: '#f87171',
  OTHER: '#7a9bb5',
};

const statusColor: Record<string, string> = {
  PENDING: '#fbbf24',
  DISMISSED: '#7a9bb5',
  ACTION_TAKEN: '#a78bfa',
};

const resolutionOptions: Record<string, ResolutionOption> = {
  DISMISSED: { label: 'Dismissed - no action', status: 'DISMISSED' },
  WARNING: { label: 'Warning issued', status: 'ACTION_TAKEN', userAction: 'WARNING' },
  SUSPEND_7_DAYS: { label: 'Suspend for 7 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_7_DAYS' },
  SUSPEND_30_DAYS: { label: 'Suspend for 30 days', status: 'ACTION_TAKEN', userAction: 'SUSPEND_30_DAYS' },
  PERMANENT_BAN: { label: 'Permanent ban', status: 'ACTION_TAKEN', userAction: 'PERMANENT_BAN' },
};

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionChoice, setResolutionChoice] = useState<keyof typeof resolutionOptions>('DISMISSED');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', page, statusFilter],
    queryFn: () => adminApi.getReports({ page, limit: 20, status: statusFilter || undefined }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes, choiceKey }: { id: string; notes: string; choiceKey: keyof typeof resolutionOptions }) => {
      const choice = resolutionOptions[choiceKey];
      return adminApi.resolveReport(id, {
        status: choice.status,
        resolution: notes,
        userAction: choice.userAction,
      });
    },
    onSuccess: () => {
      toast.success('Report resolved');
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelected(null);
      setResolution('');
      setResolutionChoice('DISMISSED');
    },
    onError: () => toast.error('Failed to resolve report'),
  });

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Reports</h1>
          <p style={{ ...S.label, marginTop: 4 }}>User-submitted conduct reports</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {statusFilter === 'PENDING' && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#f8717114', border: '1px solid #f8717130', borderRadius: 6 }}>
              <AlertTriangle size={13} color="#f87171" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#f87171' }}>{total} OPEN</span>
            </div>
          )}
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} style={S.select}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ACTION_TAKEN">Action Taken</option>
          </select>
        </div>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Reporter', 'Reported User', 'Reason', 'Status', 'Submitted', 'Actions'].map((heading) => <th key={heading} style={S.th}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {[...Array(6)].map((_, columnIndex) => (
                    <td key={columnIndex} style={S.td}>
                      <div style={{ height: 14, background: '#111c2e', borderRadius: 3, width: 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 48 }}>
                  <Flag size={32} color="#1a2636" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>
                    {statusFilter === 'PENDING' ? 'NO OPEN REPORTS' : 'NO RECORDS'}
                  </p>
                </td>
              </tr>
            ) : reports.map((report: any) => (
              <tr
                key={report.id}
                style={{ transition: 'background 0.1s' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(212,168,83,0.03)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={S.td}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#b8ccd8' }}>{report.reporter?.profile?.displayName || report.reporter?.email || '-'}</p>
                </td>
                <td style={S.td}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#b8ccd8' }}>{report.reportedUser?.profile?.displayName || report.reportedUser?.email || '-'}</p>
                </td>
                <td style={S.td}>
                  <span style={S.badge(reasonColor[report.reason] || '#7a9bb5')}>{report.reason?.replace(/_/g, ' ')}</span>
                </td>
                <td style={S.td}>
                  <span style={S.badge(statusColor[report.status] || '#7a9bb5')}>{report.status}</span>
                </td>
                <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                </td>
                <td style={S.td}>
                  <button onClick={() => setSelected(report)} style={{ ...S.btn('#d4a853'), display: 'flex', alignItems: 'center', gap: 5 }}>
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
            <button onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} disabled={page === 1} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={12} /> Prev</button>
            <button onClick={() => setPage((currentPage) => Math.min(pages, currentPage + 1))} disabled={page === pages} style={{ ...S.btn('#7a9bb5'), display: 'flex', alignItems: 'center', gap: 4, opacity: page === pages ? 0.4 : 1 }}>Next <ChevronRight size={12} /></button>
          </div>
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, width: '100%', maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #141f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 20, color: '#dce8f5' }}>Report Review</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#3a5068', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ padding: 14, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e' }}>
                  <p style={{ ...S.label, marginBottom: 6 }}>Reporter</p>
                  <p style={{ fontSize: 13, color: '#b8ccd8' }}>{selected.reporter?.profile?.displayName || selected.reporter?.email}</p>
                </div>
                <div style={{ padding: 14, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e' }}>
                  <p style={{ ...S.label, marginBottom: 6 }}>Reported User</p>
                  <p style={{ fontSize: 13, color: '#b8ccd8' }}>{selected.reportedUser?.profile?.displayName || selected.reportedUser?.email}</p>
                </div>
              </div>

              <div style={{ padding: 14, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e', marginBottom: 20 }}>
                <p style={{ ...S.label, marginBottom: 6 }}>Reason</p>
                <span style={S.badge(reasonColor[selected.reason] || '#7a9bb5')}>{selected.reason?.replace(/_/g, ' ')}</span>
                {selected.description && <p style={{ fontSize: 13, color: '#7a9bb5', marginTop: 10, lineHeight: 1.6 }}>{selected.description}</p>}
              </div>

              {selected.status === 'PENDING' ? (
                <>
                  <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Resolution Action</label>
                  <select value={resolutionChoice} onChange={(event) => setResolutionChoice(event.target.value as keyof typeof resolutionOptions)} style={{ ...S.select, display: 'block', width: '100%', marginBottom: 14 }}>
                    {Object.entries(resolutionOptions).map(([key, option]) => (
                      <option key={key} value={key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label style={{ ...S.label, display: 'block', marginBottom: 6 }}>Resolution Notes</label>
                  <textarea
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    placeholder="Describe the outcome..."
                    style={{ ...S.input, height: 80, resize: 'none', marginBottom: 16 }}
                  />
                  <button
                    onClick={() => resolveMutation.mutate({ id: selected.id, notes: resolution, choiceKey: resolutionChoice })}
                    disabled={resolveMutation.isPending || !resolution.trim()}
                    style={{ ...S.btn('#34d399'), width: '100%', padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !resolution.trim() ? 0.6 : 1 }}
                  >
                    <Check size={13} /> Submit Resolution
                  </button>
                </>
              ) : (
                <div style={{ padding: 14, background: '#0a1420', borderRadius: 7, border: '1px solid #141f2e' }}>
                  <p style={{ ...S.label, marginBottom: 8 }}>Resolution</p>
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
