import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TrackAnalyticsEventDto, TrackPageViewDto } from './dto/analytics.dto';

const SIGNUP_EVENTS = ['signup_view', 'signup_submit', 'signup_success'] as const;

type AnalyticsPageViewRecord = {
  sessionId: string;
  path: string;
  loadTimeMs: number | null;
  domContentLoadedMs: number | null;
  firstPaintMs: number | null;
  firstContentfulPaintMs: number | null;
  largestContentfulPaintMs: number | null;
  createdAt: Date;
};

type AnalyticsEventRecord = {
  sessionId: string;
  event: string;
  createdAt: Date;
};

type PageSummaryBucket = {
  path: string;
  pageViews: number;
  sessions: Set<string>;
  loadTimeMs: number[];
  firstContentfulPaintMs: number[];
  largestContentfulPaintMs: number[];
};

function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (usable.length === 0) {
    return null;
  }

  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackPageView(dto: TrackPageViewDto) {
    return (this.prisma as any).analyticsPageView.create({
      data: {
        sessionId: dto.sessionId.trim(),
        userId: dto.userId?.trim() || null,
        path: dto.path.trim(),
        referrer: dto.referrer?.trim() || null,
        loadTimeMs: dto.loadTimeMs ?? null,
        domContentLoadedMs: dto.domContentLoadedMs ?? null,
        firstPaintMs: dto.firstPaintMs ?? null,
        firstContentfulPaintMs: dto.firstContentfulPaintMs ?? null,
        largestContentfulPaintMs: dto.largestContentfulPaintMs ?? null,
        viewportWidth: dto.viewportWidth ?? null,
        viewportHeight: dto.viewportHeight ?? null,
        deviceType: dto.deviceType?.trim() || null,
      },
    });
  }

  async trackEvent(dto: TrackAnalyticsEventDto) {
    return (this.prisma as any).analyticsEvent.create({
      data: {
        sessionId: dto.sessionId.trim(),
        userId: dto.userId?.trim() || null,
        event: dto.event.trim(),
        path: dto.path?.trim() || null,
        metadata: dto.metadata ?? null,
      },
    });
  }

  async getSummary(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [rawPageViews, rawSignupEvents] = await Promise.all([
      (this.prisma as any).analyticsPageView.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
        select: {
          sessionId: true,
          path: true,
          loadTimeMs: true,
          domContentLoadedMs: true,
          firstPaintMs: true,
          firstContentfulPaintMs: true,
          largestContentfulPaintMs: true,
          createdAt: true,
        },
      }),
      (this.prisma as any).analyticsEvent.findMany({
        where: {
          createdAt: { gte: startDate },
          event: { in: [...SIGNUP_EVENTS] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          sessionId: true,
          event: true,
          createdAt: true,
        },
      }),
    ]);

    const pageViews = rawPageViews as AnalyticsPageViewRecord[];
    const signupEvents = rawSignupEvents as AnalyticsEventRecord[];

    const uniqueVisitors = new Set(pageViews.map((entry) => entry.sessionId)).size;
    const pageMap = new Map<string, PageSummaryBucket>();
    const trafficByDay = new Map<string, { date: string; pageViews: number; sessions: Set<string> }>();

    for (const view of pageViews) {
      const pageEntry: PageSummaryBucket = pageMap.get(view.path) ?? {
        path: view.path,
        pageViews: 0,
        sessions: new Set<string>(),
        loadTimeMs: [],
        firstContentfulPaintMs: [],
        largestContentfulPaintMs: [],
      };

      pageEntry.pageViews += 1;
      pageEntry.sessions.add(view.sessionId);
      if (typeof view.loadTimeMs === 'number') pageEntry.loadTimeMs.push(view.loadTimeMs);
      if (typeof view.firstContentfulPaintMs === 'number') pageEntry.firstContentfulPaintMs.push(view.firstContentfulPaintMs);
      if (typeof view.largestContentfulPaintMs === 'number') pageEntry.largestContentfulPaintMs.push(view.largestContentfulPaintMs);
      pageMap.set(view.path, pageEntry);

      const date = dayKey(new Date(view.createdAt));
      const dayEntry = trafficByDay.get(date) ?? { date, pageViews: 0, sessions: new Set<string>() };
      dayEntry.pageViews += 1;
      dayEntry.sessions.add(view.sessionId);
      trafficByDay.set(date, dayEntry);
    }

    const signupSessions = {
      views: new Set<string>(),
      submits: new Set<string>(),
      successes: new Set<string>(),
    };

    for (const event of signupEvents) {
      if (event.event === 'signup_view') signupSessions.views.add(event.sessionId);
      if (event.event === 'signup_submit') signupSessions.submits.add(event.sessionId);
      if (event.event === 'signup_success') signupSessions.successes.add(event.sessionId);
    }

    const signupViewCount = signupSessions.views.size;
    const signupSubmitCount = signupSessions.submits.size;
    const signupSuccessCount = signupSessions.successes.size;

    return {
      rangeDays: days,
      overview: {
        totalPageViews: pageViews.length,
        uniqueVisitors,
        avgLoadTimeMs: average(pageViews.map((view) => view.loadTimeMs)),
        avgDomContentLoadedMs: average(pageViews.map((view) => view.domContentLoadedMs)),
        avgFirstPaintMs: average(pageViews.map((view) => view.firstPaintMs)),
        avgFirstContentfulPaintMs: average(pageViews.map((view) => view.firstContentfulPaintMs)),
        avgLargestContentfulPaintMs: average(pageViews.map((view) => view.largestContentfulPaintMs)),
      },
      signupFunnel: {
        views: signupViewCount,
        submits: signupSubmitCount,
        successes: signupSuccessCount,
        viewToSubmitDropoffPct: signupViewCount > 0
          ? Math.round(((signupViewCount - signupSubmitCount) / signupViewCount) * 100)
          : null,
        submitToSuccessDropoffPct: signupSubmitCount > 0
          ? Math.round(((signupSubmitCount - signupSuccessCount) / signupSubmitCount) * 100)
          : null,
        overallConversionPct: signupViewCount > 0
          ? Math.round((signupSuccessCount / signupViewCount) * 100)
          : null,
      },
      topPages: Array.from(pageMap.values())
        .map((entry) => ({
          path: entry.path,
          pageViews: entry.pageViews,
          uniqueVisitors: entry.sessions.size,
          avgLoadTimeMs: average(entry.loadTimeMs),
          avgFirstContentfulPaintMs: average(entry.firstContentfulPaintMs),
          avgLargestContentfulPaintMs: average(entry.largestContentfulPaintMs),
        }))
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 12),
      slowestPages: Array.from(pageMap.values())
        .map((entry) => ({
          path: entry.path,
          avgLoadTimeMs: average(entry.loadTimeMs),
          avgFirstContentfulPaintMs: average(entry.firstContentfulPaintMs),
          avgLargestContentfulPaintMs: average(entry.largestContentfulPaintMs),
        }))
        .filter((entry) => entry.avgLoadTimeMs !== null || entry.avgLargestContentfulPaintMs !== null)
        .sort((a, b) => (b.avgLoadTimeMs ?? 0) - (a.avgLoadTimeMs ?? 0))
        .slice(0, 8),
      trafficByDay: Array.from(trafficByDay.values())
        .map((entry) => ({
          date: entry.date,
          pageViews: entry.pageViews,
          uniqueVisitors: entry.sessions.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
