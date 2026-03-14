'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

function buildAdminUrl(baseUrl: string, pathname: string, search: string) {
  const adminPath = pathname.replace(/^\/admin/, '') || '/';
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}${adminPath}${search}`;
}

export default function TransitionalAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.toString();
  const adminAppUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL || 'http://localhost:3002';

  const targetUrl = useMemo(
    () => buildAdminUrl(adminAppUrl, pathname, search ? `?${search}` : ''),
    [adminAppUrl, pathname, search],
  );

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Admin has moved to the dedicated command centre</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The embedded admin area in the main web app is now transitional only. We&apos;re standardising on
          `apps/admin` to reduce duplication, permission drift, and maintenance overhead.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={targetUrl}>
              Open dedicated admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Transition note</p>
          <p className="mt-2">
            Existing `/admin/*` routes remain in the repo temporarily so links do not hard-break during the move, but
            the long-term operator surface is the dedicated admin app.
          </p>
        </div>
      </div>
      <div className="sr-only">{children}</div>
    </div>
  );
}
