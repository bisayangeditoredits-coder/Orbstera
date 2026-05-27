import { NextResponse } from 'next/server';
import { getStatusSnapshot } from '@/lib/health/status-snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await getStatusSnapshot();
    return NextResponse.json(snapshot, {
      status: snapshot.status === 'healthy' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[health] unhandled:', err);
    return NextResponse.json(
      { status: 'error', error: message, ts: new Date().toISOString() },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
