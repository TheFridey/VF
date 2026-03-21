import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const uptime = process.uptime();

  return NextResponse.json(
    {
      service: 'web',
      status: 'alive',
      uptime,
      timestamp: new Date().toISOString(),
      startedAt: new Date(Date.now() - (uptime * 1000)).toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
