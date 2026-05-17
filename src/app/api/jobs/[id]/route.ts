import { NextResponse } from 'next/server';
import { getJobRecord } from '@/lib/jobs/redis-job-queue';
import { requireApiUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const job = await getJobRecord(id);
  if (!job) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Job not found or Redis is not configured.' },
      { status: 404, headers: PRIVATE_API_HEADERS },
    );
  }

  if (job.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_API_HEADERS });
  }

  return NextResponse.json(job, { headers: { ...PRIVATE_API_HEADERS, 'Cache-Control': 'private, no-store' } });
}
