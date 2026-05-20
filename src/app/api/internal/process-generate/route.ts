import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDeckGenerationBatch, type DeckGenerationJobBody } from '@/lib/ai/run-deck-generation-batch';
import { updateJobRecord } from '@/lib/jobs/redis-job-queue';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function assertWorkerAuth(req: Request): boolean {
  const secret = process.env.WORKER_INTERNAL_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get('x-worker-secret')?.trim();
  return header === secret;
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  if (!assertWorkerAuth(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let jobId = '';
  try {
    const payload = (await req.json()) as {
      jobId: string;
      userId: string;
      body: DeckGenerationJobBody;
    };

    ({ jobId } = payload);
    const { userId, body } = payload;
    if (!jobId || !userId || !body?.prompt) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const supabase = createClient(url, key);

    await updateJobRecord(jobId, { status: 'running', progress: 0 });

    const result = await runDeckGenerationBatch({
      appUrl: APP_URL,
      supabase,
      userId,
      body,
      onProgress: (progress, message) => {
        void updateJobRecord(jobId, { status: 'running', progress, error: undefined });
        void message;
      },
    });

    await updateJobRecord(jobId, {
      status: 'completed',
      progress: 100,
      result,
    });

    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    captureApiException(e, { requestId, route: 'POST /api/internal/process-generate' });
    if (jobId) {
      await updateJobRecord(jobId, {
        status: 'failed',
        error: e instanceof Error ? e.message : 'Generation failed',
      });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
