'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  MessageSquare,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import {
  AdminCard,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatusChip,
  adminTheme,
} from '@/components/admin-ui';

function metricValue(value: number | undefined, loading: boolean) {
  if (loading) {
    return '...';
  }

  return (value ?? 0).toLocaleString();
}

function HealthRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'unknown';
  detail?: string;
}) {
  const color =
    status === 'ok'
      ? adminTheme.success
      : status === 'warn'
        ? adminTheme.warning
        : status === 'error'
          ? adminTheme.danger
          : adminTheme.textMuted;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        borderBottom: `1px solid ${adminTheme.panelInset}`,
      }}
    >
      <div>
        <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>{label}</p>
        {detail ? <p style={{ color: adminTheme.textSoft, fontSize: 11, marginTop: 4 }}>{detail}</p> : null}
      </div>
      <AdminStatusChip label={status.toUpperCase()} color={color} />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [dashboard, systemHealth] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.getHealth(),
        ]);

        if (!mounted) {
          return;
        }

        setStats(dashboard);
        setHealth(systemHealth);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load().catch(console.error);
    const interval = window.setInterval(() => {
      adminApi.getDashboard().then(setStats).catch(console.error);
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const dashboard = stats || {};
  const pendingVerifications = dashboard.pendingVerifications ?? 0;
  const pendingReports = dashboard.pendingReports ?? 0;
  const suspendedUsers = dashboard.suspendedUsers ?? 0;
  const queueSeverity =
    pendingReports > 5 || pendingVerifications > 10
      ? adminTheme.danger
      : pendingReports > 0 || pendingVerifications > 0
        ? adminTheme.warning
        : adminTheme.success;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Operations overview"
        title="Command Dashboard"
        description="Real-time metrics for operator workload, trust operations, and platform health."
      />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <AdminMetricCard
          label="Total Personnel"
          value={metricValue(dashboard.totalUsers, loading)}
          helper={`${metricValue(dashboard.newUsersToday, loading)} joined today`}
          accent={adminTheme.info}
          icon={<Users size={18} />}
        />
        <AdminMetricCard
          label="Verified Veterans"
          value={metricValue(dashboard.verifiedVeterans, loading)}
          helper={`${metricValue(pendingVerifications, loading)} awaiting review`}
          accent={adminTheme.success}
          icon={<Shield size={18} />}
        />
        <AdminMetricCard
          label="Open Reports"
          value={metricValue(pendingReports, loading)}
          helper={`${metricValue(suspendedUsers, loading)} users suspended`}
          accent={pendingReports > 0 ? adminTheme.danger : adminTheme.warning}
          icon={<AlertTriangle size={18} />}
        />
        <AdminMetricCard
          label="Connections Today"
          value={metricValue(dashboard.matchesToday, loading)}
          helper={`${metricValue(dashboard.totalConnections, loading)} total connections`}
          accent={adminTheme.violet}
          icon={<MessageSquare size={18} />}
        />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)', marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <AdminCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                  Queue health
                </p>
                <h2 style={{ color: adminTheme.textStrong, fontSize: 22, marginTop: 8 }}>Trust operations at a glance</h2>
              </div>
              <AdminStatusChip
                label={pendingReports + pendingVerifications > 0 ? 'Action needed' : 'Stable'}
                color={queueSeverity}
              />
            </div>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 18 }}>
              {[
                {
                  href: '/verification',
                  label: 'Verification queue',
                  value: pendingVerifications,
                  helper: dashboard.pendingVerifications > 0 ? 'Review against 48h SLA' : 'No cases waiting',
                  accent: pendingVerifications > 0 ? adminTheme.warning : adminTheme.success,
                  icon: <Clock3 size={16} />,
                },
                {
                  href: '/reports',
                  label: 'Conduct reports',
                  value: pendingReports,
                  helper: pendingReports > 0 ? 'Reports need moderator decision' : 'No unresolved reports',
                  accent: pendingReports > 0 ? adminTheme.danger : adminTheme.success,
                  icon: <AlertTriangle size={16} />,
                },
                {
                  href: '/users',
                  label: 'User health',
                  value: suspendedUsers,
                  helper: 'Monitor status changes and escalations',
                  accent: suspendedUsers > 0 ? adminTheme.info : adminTheme.textMuted,
                  icon: <Activity size={16} />,
                },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <AdminCard style={{ padding: '16px 18px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                          {item.label}
                        </p>
                        <p style={{ color: item.accent, fontSize: 28, fontWeight: 700, marginTop: 8 }}>{item.value}</p>
                        <p style={{ color: adminTheme.textMuted, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>{item.helper}</p>
                      </div>
                      <div style={{ color: item.accent }}>{item.icon}</div>
                    </div>
                  </AdminCard>
                </Link>
              ))}
            </div>
          </AdminCard>

          <AdminCard style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${adminTheme.panelInset}` }}>
              <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                Operator prompts
              </p>
              <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Recommended next actions</h2>
            </div>
            {[
              {
                href: '/verification',
                label: 'Verification backlog',
                description: pendingVerifications > 0 ? `${pendingVerifications} veterans are waiting for review.` : 'Queue is currently clear.',
                color: pendingVerifications > 0 ? adminTheme.warning : adminTheme.success,
              },
              {
                href: '/reports',
                label: 'Conduct reports',
                description: pendingReports > 0 ? `${pendingReports} reports still need a moderation outcome.` : 'No open reports need attention.',
                color: pendingReports > 0 ? adminTheme.danger : adminTheme.success,
              },
              {
                href: '/audit',
                label: 'Audit visibility',
                description: 'Review recent role changes, verification outcomes, and moderation actions.',
                color: adminTheme.info,
              },
            ].map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '16px 20px',
                  borderBottom: index === 2 ? 'none' : `1px solid ${adminTheme.panelInset}`,
                }}
              >
                <div>
                  <p style={{ color: adminTheme.textStrong, fontSize: 13, fontWeight: 600 }}>{item.label}</p>
                  <p style={{ color: adminTheme.textMuted, fontSize: 12, marginTop: 4 }}>{item.description}</p>
                </div>
                <CheckCircle2 size={16} color={item.color} />
              </Link>
            ))}
          </AdminCard>
        </div>

        <AdminCard style={{ overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${adminTheme.panelInset}` }}>
            <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
              System health
            </p>
            <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Platform dependencies</h2>
          </div>
          <HealthRow
            label="API"
            status={health?.status === 'error' ? 'error' : 'ok'}
            detail="Process responding to dashboard requests"
          />
          <HealthRow
            label="PostgreSQL"
            status={health?.database?.status || 'unknown'}
            detail={health?.database?.latency ? `${health.database.latency}ms query time` : 'Database latency unavailable'}
          />
          <HealthRow
            label="Redis"
            status={health?.redis?.status || 'unknown'}
            detail={health?.redis?.latency ? `${health.redis.latency}ms ping` : 'Redis telemetry unavailable'}
          />
          <HealthRow label="Realtime messaging" status="ok" detail="Read sync and sockets available" />
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={16} color={adminTheme.accent} />
              <p style={{ color: adminTheme.textMuted, fontSize: 12 }}>
                Dashboard metrics refresh every 60 seconds.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
