'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Gauge,
  MousePointerClick,
  TimerReset,
  UserPlus,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import {
  AdminCard,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSelect,
  AdminStatusChip,
  AdminTableCell,
  AdminTableHeadCell,
  AdminTableShell,
  adminTheme,
  adminTypography,
} from '@/components/admin-ui';

type AnalyticsSummary = {
  rangeDays: number;
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgLoadTimeMs: number | null;
    avgDomContentLoadedMs: number | null;
    avgFirstPaintMs: number | null;
    avgFirstContentfulPaintMs: number | null;
    avgLargestContentfulPaintMs: number | null;
  };
  signupFunnel: {
    views: number;
    submits: number;
    successes: number;
    viewToSubmitDropoffPct: number | null;
    submitToSuccessDropoffPct: number | null;
    overallConversionPct: number | null;
  };
  topPages: Array<{
    path: string;
    pageViews: number;
    uniqueVisitors: number;
    avgLoadTimeMs: number | null;
    avgFirstContentfulPaintMs: number | null;
    avgLargestContentfulPaintMs: number | null;
  }>;
  slowestPages: Array<{
    path: string;
    avgLoadTimeMs: number | null;
    avgFirstContentfulPaintMs: number | null;
    avgLargestContentfulPaintMs: number | null;
  }>;
  trafficByDay: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
  }>;
};

function formatMetric(value: number | null | undefined, suffix = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  return `${value}%`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}

function TrafficBars({ trafficByDay }: { trafficByDay: AnalyticsSummary['trafficByDay'] }) {
  const maxPageViews = Math.max(...trafficByDay.map((entry) => entry.pageViews), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${trafficByDay.length}, minmax(0, 1fr))`, gap: 10 }}>
      {trafficByDay.map((entry) => {
        const height = Math.max(24, Math.round((entry.pageViews / maxPageViews) * 140));

        return (
          <div key={entry.date} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
            <div style={{ minHeight: 168, display: 'flex', alignItems: 'flex-end' }}>
              <div
                title={`${entry.pageViews.toLocaleString()} page views, ${entry.uniqueVisitors.toLocaleString()} visitors`}
                style={{
                  width: '100%',
                  height,
                  borderRadius: 10,
                  background: 'linear-gradient(180deg, rgba(212,168,83,0.95) 0%, rgba(122,179,212,0.7) 100%)',
                  border: `1px solid ${adminTheme.panelBorder}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              />
            </div>
            <div>
              <p style={{ ...adminTypography.eyebrow, color: adminTheme.textSoft }}>{formatDateLabel(entry.date)}</p>
              <p style={{ color: adminTheme.textStrong, fontSize: 12, marginTop: 4 }}>{entry.pageViews.toLocaleString()} views</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  helper,
  color,
}: {
  label: string;
  value: number;
  helper: string;
  color: string;
}) {
  return (
    <AdminCard style={{ padding: '18px 20px', borderColor: `${color}35` }}>
      <p style={{ ...adminTypography.eyebrow, color }}>{label}</p>
      <p style={{ color, fontSize: 30, fontWeight: 700, marginTop: 10 }}>{value.toLocaleString()}</p>
      <p style={{ color: adminTheme.textMuted, fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>{helper}</p>
    </AdminCard>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await adminApi.getAnalytics({ days: Number(days) });
        if (!mounted) {
          return;
        }

        setAnalytics(response);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load().catch(console.error);

    return () => {
      mounted = false;
    };
  }, [days]);

  const traffic = analytics?.trafficByDay ?? [];
  const hasTraffic = traffic.length > 0;
  const overview = analytics?.overview;
  const funnel = analytics?.signupFunnel;
  const topPages = analytics?.topPages ?? [];
  const slowestPages = analytics?.slowestPages ?? [];
  const performanceStatus = useMemo(() => {
    const lcp = overview?.avgLargestContentfulPaintMs ?? null;

    if (typeof lcp !== 'number') {
      return { label: 'Awaiting data', color: adminTheme.textMuted };
    }

    if (lcp <= 2500) {
      return { label: 'Fast', color: adminTheme.success };
    }

    if (lcp <= 4000) {
      return { label: 'Needs work', color: adminTheme.warning };
    }

    return { label: 'Slow', color: adminTheme.danger };
  }, [overview?.avgLargestContentfulPaintMs]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth telemetry"
        title="Visitor Analytics"
        description="Traffic, signup drop-off, page popularity, and averaged load speed across the main VeteranFinder experience."
        actions={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AdminSelect value={days} onChange={setDays}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </AdminSelect>
          </div>
        )}
      />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <AdminMetricCard
          label="Unique Visitors"
          value={loading ? '...' : (overview?.uniqueVisitors ?? 0).toLocaleString()}
          helper="Consent-based browser visitors in the selected range"
          accent={adminTheme.info}
          icon={<MousePointerClick size={18} />}
        />
        <AdminMetricCard
          label="Page Views"
          value={loading ? '...' : (overview?.totalPageViews ?? 0).toLocaleString()}
          helper="All tracked page loads and route views"
          accent={adminTheme.accent}
          icon={<BarChart3 size={18} />}
        />
        <AdminMetricCard
          label="Signup Conversion"
          value={loading ? '...' : formatPercent(funnel?.overallConversionPct)}
          helper={`${funnel?.successes ?? 0} successful signups from ${funnel?.views ?? 0} signup page visits`}
          accent={adminTheme.success}
          icon={<UserPlus size={18} />}
        />
        <AdminMetricCard
          label="Average Load"
          value={loading ? '...' : formatMetric(overview?.avgLoadTimeMs, 'ms')}
          helper={loading ? 'Loading performance data...' : `Average LCP ${formatMetric(overview?.avgLargestContentfulPaintMs, 'ms')}`}
          accent={performanceStatus.color}
          icon={<Gauge size={18} />}
        />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <AdminCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={adminTypography.eyebrow}>Traffic trend</p>
                <h2 style={{ color: adminTheme.textStrong, fontSize: 22, marginTop: 8 }}>Daily visitor movement</h2>
              </div>
              <AdminStatusChip label={performanceStatus.label} color={performanceStatus.color} />
            </div>
            <p style={{ color: adminTheme.textMuted, fontSize: 12, marginTop: 10, marginBottom: 18 }}>
              This view is based on first-party analytics consent and helps spot spikes, quiet periods, and post-launch changes.
            </p>
            {hasTraffic ? (
              <TrafficBars trafficByDay={traffic} />
            ) : (
              <AdminEmptyState
                title="NO TRAFFIC DATA YET"
                hint="Page views will appear here once visitors browse the site with analytics enabled."
                icon={<Activity size={20} color={adminTheme.textSoft} />}
              />
            )}
          </AdminCard>

          <AdminTableShell>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${adminTheme.panelInset}` }}>
              <p style={adminTypography.eyebrow}>Most visited pages</p>
              <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Top destinations</h2>
            </div>
            {topPages.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <AdminTableHeadCell>Path</AdminTableHeadCell>
                    <AdminTableHeadCell>Views</AdminTableHeadCell>
                    <AdminTableHeadCell>Visitors</AdminTableHeadCell>
                    <AdminTableHeadCell>Avg Load</AdminTableHeadCell>
                    <AdminTableHeadCell>Avg LCP</AdminTableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page) => (
                    <tr key={page.path}>
                      <AdminTableCell style={{ color: adminTheme.textStrong, fontWeight: 600 }}>{page.path}</AdminTableCell>
                      <AdminTableCell>{page.pageViews.toLocaleString()}</AdminTableCell>
                      <AdminTableCell>{page.uniqueVisitors.toLocaleString()}</AdminTableCell>
                      <AdminTableCell>{formatMetric(page.avgLoadTimeMs, 'ms')}</AdminTableCell>
                      <AdminTableCell>{formatMetric(page.avgLargestContentfulPaintMs, 'ms')}</AdminTableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <AdminEmptyState title="NO PAGE DATA YET" hint="Top pages will populate after tracked browsing sessions." />
            )}
          </AdminTableShell>
        </div>

        <div style={{ display: 'grid', gap: 20, height: 'fit-content' }}>
          <AdminCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TimerReset size={18} color={adminTheme.warning} />
              <div>
                <p style={adminTypography.eyebrow}>Signup funnel</p>
                <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Where people drop off</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              <FunnelStep
                label="Viewed signup"
                value={funnel?.views ?? 0}
                helper="People who opened the registration page."
                color={adminTheme.info}
              />
              <FunnelStep
                label="Attempted signup"
                value={funnel?.submits ?? 0}
                helper={`Drop-off before submit: ${formatPercent(funnel?.viewToSubmitDropoffPct)}`}
                color={adminTheme.warning}
              />
              <FunnelStep
                label="Created account"
                value={funnel?.successes ?? 0}
                helper={`Drop-off after submit: ${formatPercent(funnel?.submitToSuccessDropoffPct)}`}
                color={adminTheme.success}
              />
            </div>
          </AdminCard>

          <AdminCard style={{ padding: '20px 22px' }}>
            <p style={adminTypography.eyebrow}>Performance summary</p>
            <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Average speed signals</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
              {[
                ['Load time', formatMetric(overview?.avgLoadTimeMs, 'ms')],
                ['DOMContentLoaded', formatMetric(overview?.avgDomContentLoadedMs, 'ms')],
                ['First paint', formatMetric(overview?.avgFirstPaintMs, 'ms')],
                ['First contentful paint', formatMetric(overview?.avgFirstContentfulPaintMs, 'ms')],
                ['Largest contentful paint', formatMetric(overview?.avgLargestContentfulPaintMs, 'ms')],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#060c17',
                    border: `1px solid ${adminTheme.panelInset}`,
                  }}
                >
                  <span style={{ color: adminTheme.textMuted, fontSize: 12 }}>{label}</span>
                  <span style={{ color: adminTheme.textStrong, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{value}</span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminTableShell>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${adminTheme.panelInset}` }}>
              <p style={adminTypography.eyebrow}>Slowest pages</p>
              <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Pages to optimise first</h2>
            </div>
            {slowestPages.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <AdminTableHeadCell>Path</AdminTableHeadCell>
                    <AdminTableHeadCell>Load</AdminTableHeadCell>
                    <AdminTableHeadCell>FCP</AdminTableHeadCell>
                    <AdminTableHeadCell>LCP</AdminTableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {slowestPages.map((page) => (
                    <tr key={page.path}>
                      <AdminTableCell style={{ color: adminTheme.textStrong, fontWeight: 600 }}>{page.path}</AdminTableCell>
                      <AdminTableCell>{formatMetric(page.avgLoadTimeMs, 'ms')}</AdminTableCell>
                      <AdminTableCell>{formatMetric(page.avgFirstContentfulPaintMs, 'ms')}</AdminTableCell>
                      <AdminTableCell>{formatMetric(page.avgLargestContentfulPaintMs, 'ms')}</AdminTableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <AdminEmptyState title="NO PERFORMANCE DATA YET" hint="Speed rankings will appear after tracked page loads." />
            )}
          </AdminTableShell>
        </div>
      </div>
    </div>
  );
}
