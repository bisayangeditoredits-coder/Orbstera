import { NextResponse } from 'next/server';
import {
  processGenerateJobInline,
  type ProcessGenerateJobPayload,
} from '@/lib/jobs/process-generate-job';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

export const runtime = 'nodejs';
export const maxDuration = 300;

function assertWorkerAuth(req: Request): boolean {
  const secret = process.env.WORKER_INTERNAL_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get('x-worker-secret')?.trim();
  return header === secret;
}

/**
 * Optional HTTP entry for legacy workers (GENERATE_WORKER_USE_HTTP_CALLBACK=true).
 * BullMQ workers should call processGenerateJobInline directly instead.
 */
export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  if (!assertWorkerAuth(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let jobId = '';
  try {
    const payload = (await req.json()) as ProcessGenerateJobPayload;
    ({ jobId } = payload);

    await processGenerateJobInline(payload);

    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    captureApiException(e, { requestId, route: 'POST /api/internal/process-generate' });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
