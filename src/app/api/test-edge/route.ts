import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const hasTimeout = typeof AbortSignal.timeout === 'function';
  return NextResponse.json({ hasTimeout });
}
