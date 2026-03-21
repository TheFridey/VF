'use client';

import Link from 'next/link';
import { VeteranFinderLogo } from '@/components/brand/veteranfinder-logo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <VeteranFinderLogo
                markClassName="h-6"
                textClassName="font-semibold text-slate-950"
              />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              A trust-first veteran reconnection platform focused on verification, privacy, moderation, and useful
              community access.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Cookie Policy</Link></li>
              <li><Link href="/dpia" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Data Protection (DPIA)</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Platform</p>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-slate-600 transition-colors hover:text-slate-950">About</Link></li>
              <li><Link href="/contact" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Contact</Link></li>
              <li><Link href="/partner-with-us" className="text-sm text-slate-600 transition-colors hover:text-slate-950">Partner With Us</Link></li>
              <li><Link href="/status" className="text-sm text-slate-600 transition-colors hover:text-slate-950">System Status</Link></li>
              <li><Link href="/app/premium" className="text-sm text-slate-600 transition-colors hover:text-slate-950">BIA Membership</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} VeteranFinder Ltd. All rights reserved.</p>
          <p>Built for a calmer, more accountable veteran community experience.</p>
        </div>
      </div>
    </footer>
  );
}
