import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SiteHeader } from '@/components/home/site-header';
import { Footer } from '@/components/layout/footer';
import { StatusBoard } from '@/components/status/status-board';

export const metadata: Metadata = {
  title: 'System Status | VeteranFinder',
  description: 'Live VeteranFinder service status, uptime, and readiness checks for the website, API, database, and cache.',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff8ff_0%,#f8fbff_18%,#ffffff_42%)] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,rgba(2,132,199,0.12)_0%,rgba(255,255,255,0.96)_48%,rgba(14,165,233,0.08)_100%)] px-6 py-10 shadow-[0_30px_120px_-64px_rgba(15,23,42,0.45)] sm:px-8 lg:px-10">
            <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.28),transparent_70%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-sky-800 transition-colors hover:text-sky-950">
                  <ArrowLeft className="h-4 w-4" />
                  Back to VeteranFinder
                </Link>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Live health checker
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  A public view of the current VeteranFinder platform state, including the website app, API, database, and Redis readiness.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/72 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Useful endpoints</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <a href="/status/live" className="flex items-center gap-2 transition-colors hover:text-slate-950">
                    <ExternalLink className="h-4 w-4" />
                    <span>/status/live</span>
                  </a>
                  <a href="/api/health/live" className="flex items-center gap-2 transition-colors hover:text-slate-950">
                    <ExternalLink className="h-4 w-4" />
                    <span>/api/health/live</span>
                  </a>
                  <a href="/api/health/ready" className="flex items-center gap-2 transition-colors hover:text-slate-950">
                    <ExternalLink className="h-4 w-4" />
                    <span>/api/health/ready</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <StatusBoard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
