import { NextResponse } from 'next/server';
import { getJobRecord } from '@/lib/jobs/redis-job-queue';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  const job = await getJobRecord(id);
  if (!job) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Job not found or Redis is not configured.' },
      { status: 404 },
    );
  }

  return NextResponse.json(job, { headers: { 'Cache-Control': 'private, no-store' } });
}
