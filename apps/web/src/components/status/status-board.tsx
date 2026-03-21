'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Database,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';

const POLL_INTERVAL_MS = 30000;
const REQUEST_TIMEOUT_MS = 8000;

type Envelope<T> = {
  data?: T;
  timestamp?: string;
};

type WebLivePayload = {
  service: 'web';
  status: 'alive';
  uptime: number;
  timestamp: string;
  startedAt: string;
};

type ApiLivePayload = {
  status: string;
  uptime: number;
  timestamp: string;
};

type ApiReadyPayload = {
  status: string;
  timestamp: string;
  checks: {
    database?: boolean;
    redis?: boolean;
  };
};

type StatusSnapshot = {
  web: WebLivePayload | null;
  apiLive: ApiLivePayload | null;
  apiReady: ApiReadyPayload | null;
  checkedAt: string | null;
  error: string | null;
};

function unwrapEnvelope<T>(payload: T | Envelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data;
  }

  return payload as T;
}

async function fetchStatusJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();
    return unwrapEnvelope<T>(payload);
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatUptime(seconds?: number | null) {
  if (!seconds && seconds !== 0) return 'Unavailable';

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-2.5 w-2.5 rounded-full',
        ok ? 'bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.14)]' : 'bg-rose-400 shadow-[0_0_0_6px_rgba(251,113,133,0.14)]',
      )}
      aria-hidden="true"
    />
  );
}

function ServiceCard({
  label,
  value,
  detail,
  icon: Icon,
  ok,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Globe;
  ok: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl border',
            ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/30 bg-rose-400/10 text-rose-300',
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusDot ok={ok} />
              <p className="text-lg font-semibold text-white">{value}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300/82">{detail}</p>
    </div>
  );
}

export function StatusBoard() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot>({
    web: null,
    apiLive: null,
    apiReady: null,
    checkedAt: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStatus = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [web, apiLive, apiReady] = await Promise.all([
        fetchStatusJson<WebLivePayload>('/status/live'),
        fetchStatusJson<ApiLivePayload>('/api/health/live'),
        fetchStatusJson<ApiReadyPayload>('/api/health/ready'),
      ]);

      setSnapshot({
        web,
        apiLive,
        apiReady,
        checkedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh live status right now.';

      setSnapshot((current) => ({
        ...current,
        checkedAt: new Date().toISOString(),
        error: message,
      }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const interval = window.setInterval(() => {
      void loadStatus(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const webOk = snapshot.web?.status === 'alive';
  const apiOk = snapshot.apiLive?.status === 'alive';
  const databaseOk = !!snapshot.apiReady?.checks?.database;
  const redisOk = !!snapshot.apiReady?.checks?.redis;
  const readyOk = snapshot.apiReady?.status === 'ready';
  const allHealthy = webOk && apiOk && databaseOk && redisOk && readyOk;

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-sky-200/60 bg-[linear-gradient(160deg,rgba(2,132,199,0.08)_0%,rgba(15,23,42,0.03)_48%,rgba(255,255,255,0.9)_100%)] shadow-[0_32px_120px_-64px_rgba(14,116,144,0.55)]">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_58%)]" />
      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-800 backdrop-blur">
              <Activity className="h-3.5 w-3.5" />
              Live System Status
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {allHealthy ? 'All core services are online.' : 'We are seeing a service issue right now.'}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              This page checks the live web app, API, database, and Redis cache every 30 seconds so people can see the current platform state without guessing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium',
              allHealthy
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-rose-300 bg-rose-50 text-rose-800',
            )}>
              <StatusDot ok={allHealthy} />
              {allHealthy ? 'Operational' : 'Degraded'}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadStatus(true)}
              className="border-slate-300 bg-white/85 text-slate-900 hover:bg-white"
            >
              {isRefreshing ? <Spinner size="sm" className="mr-2 text-slate-700" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh now
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <ServiceCard
            label="Website"
            value={webOk ? 'Online' : 'Unavailable'}
            detail={snapshot.web?.startedAt ? `Next.js process has been up ${formatRelativeTime(snapshot.web.startedAt)}.` : 'Waiting for the web status probe.'}
            icon={Globe}
            ok={webOk}
          />
          <ServiceCard
            label="API"
            value={apiOk ? 'Online' : 'Unavailable'}
            detail={snapshot.apiLive?.timestamp ? `API heartbeat responded ${formatRelativeTime(snapshot.apiLive.timestamp)}.` : 'Waiting for the API heartbeat.'}
            icon={Server}
            ok={apiOk}
          />
          <ServiceCard
            label="Database"
            value={databaseOk ? 'Connected' : 'Issue detected'}
            detail={databaseOk ? 'Readiness checks can reach the primary database.' : 'The readiness probe could not confirm database connectivity.'}
            icon={Database}
            ok={databaseOk}
          />
          <ServiceCard
            label="Redis Cache"
            value={redisOk ? 'Connected' : 'Issue detected'}
            detail={redisOk ? 'Live cache and queue connectivity is responding normally.' : 'The readiness probe could not confirm Redis connectivity.'}
            icon={ShieldCheck}
            ok={redisOk}
          />
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current Uptime</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">Live process duration</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Website app</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatUptime(snapshot.web?.uptime)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {snapshot.web?.startedAt ? `Started ${formatRelativeTime(snapshot.web.startedAt)}.` : 'No live reading yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">API app</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatUptime(snapshot.apiLive?.uptime)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {snapshot.apiLive?.timestamp ? `Heartbeat seen ${formatRelativeTime(snapshot.apiLive.timestamp)}.` : 'No live reading yet.'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm leading-6 text-slate-700">
              This is a live availability board, not a historical SLA report. It shows whether the core services are healthy right now and how long the current app processes have been running.
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Checks</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Latest poll details</h3>

            <div className="mt-6 space-y-3">
              {[
                { label: 'Website liveness', ok: webOk },
                { label: 'API liveness', ok: apiOk },
                { label: 'API readiness', ok: readyOk },
                { label: 'Database connectivity', ok: databaseOk },
                { label: 'Redis connectivity', ok: redisOk },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                    item.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
                  )}>
                    <StatusDot ok={item.ok} />
                    {item.ok ? 'OK' : 'Issue'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-slate-500">Last checked</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {snapshot.checkedAt ? formatDateTime(snapshot.checkedAt) : 'Checking now...'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {snapshot.checkedAt ? `Updated ${formatRelativeTime(snapshot.checkedAt)}.` : 'The first live poll is still in progress.'}
              </p>
            </div>

            {snapshot.error && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{snapshot.error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-sm text-slate-600">
            <Spinner size="sm" className="text-sky-700" />
            Pulling the first live status snapshot now.
          </div>
        )}
      </div>
    </section>
  );
}
