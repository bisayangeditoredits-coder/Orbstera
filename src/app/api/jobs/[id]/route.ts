import { NextResponse } from 'next/server';
import { getJobRecord } from '@/lib/jobs/redis-job-queue';
import { cancelGenerateJob } from '@/lib/jobs/cancel-generate-job';
import { PRIVATE_API_HEADERS } from '@/lib/auth/server';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  const auth = await requireApiUserWithRateLimit(_req, 'default');
  if ('response' in auth) return auth.response;

  try {
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
  } catch (err) {
    console.error('[api/jobs]', err);
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Job status temporarily unavailable.' },
      { status: 503, headers: PRIVATE_API_HEADERS },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;

  try {
    const result = await cancelGenerateJob({ jobId: id, userId: auth.user.id });
    if (!result.ok) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Job not found or Redis is not configured.' },
          { status: 404, headers: PRIVATE_API_HEADERS },
        );
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_API_HEADERS });
    }

    return NextResponse.json(
      { id, status: result.status === 'already_terminal' ? 'already_terminal' : 'cancelled' },
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (err) {
    console.error('[api/jobs DELETE]', err);
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Could not cancel job.' },
      { status: 503, headers: PRIVATE_API_HEADERS },
    );
  }
}
