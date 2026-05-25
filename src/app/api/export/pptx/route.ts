import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PresentationData } from '@/types';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { createJobRecord } from '@/lib/jobs/redis-job-queue';
import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isValidDeckStagingKey } from '@/lib/server/deck-staging-key';
import { asyncExportSlideThreshold } from '@/lib/infra/scaling-flags';
import { runPptxExport, type PptxExportBody } from '@/lib/export/run-pptx-export';
import { getR2BucketName, getR2Client } from '@/lib/server/r2-client';

async function readS3BodyToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const runtime = 'nodejs';
export const maxDuration = 120;

function isWorkerRequest(req: Request): string | null {
  const secret = process.env.WORKER_INTERNAL_SECRET?.trim();
  const header = req.headers.get('x-worker-secret')?.trim();
  const userId = req.headers.get('x-user-id')?.trim();
  if (secret && header === secret && userId) return userId;
  return null;
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const workerUserId = isWorkerRequest(req);
  const exportJobId = req.headers.get('x-export-job-id')?.trim() || '';

  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (!workerUserId && contentLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Payload too large. Maximum export payload is 100MB.' }, { status: 413 });
    }

    let authedUserId: string;
    if (workerUserId) {
      authedUserId = workerUserId;
    } else {
      const auth = await requireAiUser(req, 'heavy');
      if ('response' in auth) {
        if (auth.response.status === 401) {
          return aiUnauthorized('Please sign in to export presentations.');
        }
        return auth.response;
      }
      authedUserId = auth.user.id;
    }

    const encoding = (req.headers.get('content-encoding') || '').toLowerCase();
    const contentType = (req.headers.get('content-type') || '').toLowerCase();
    const raw = Buffer.from(await req.arrayBuffer());

    let jsonStr: string;
    const trySmallStagingMeta =
      contentType.includes('application/json') &&
      encoding !== 'gzip' &&
      raw.length <= 65536;

    if (trySmallStagingMeta) {
      let meta: { stagingKey?: string; gzip?: boolean };
      try {
        meta = JSON.parse(raw.toString('utf8')) as { stagingKey?: string; gzip?: boolean };
      } catch {
        meta = {};
      }
      if (typeof meta.stagingKey === 'string' && meta.stagingKey.trim()) {
        const cookieStore = cookies();
        const supabaseEarly = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const { data: { user: stagingUser } } = await supabaseEarly.auth.getUser();
        if (!stagingUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!isValidDeckStagingKey(stagingUser.id, meta.stagingKey)) {
          return NextResponse.json({ error: 'Invalid staging key' }, { status: 400 });
        }
        const exportR2Client = getR2Client();
        const bucket = getR2BucketName();
        if (!exportR2Client || !bucket) {
          return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
        }
        let stagedBuf: Buffer;
        try {
          const obj = await exportR2Client.send(
            new GetObjectCommand({ Bucket: bucket, Key: meta.stagingKey }),
          );
          stagedBuf = await readS3BodyToBuffer(obj.Body);
        } catch (e) {
          console.error('[export/pptx] staging GetObject', e);
          return NextResponse.json({ error: 'Export staging blob not found or expired' }, { status: 404 });
        }
        try {
          jsonStr = meta.gzip ? gunzipSync(stagedBuf).toString('utf8') : stagedBuf.toString('utf8');
        } catch (e) {
          console.error('[export/pptx] staging gunzip', e);
          await exportR2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: meta.stagingKey })).catch(() => {});
          return NextResponse.json({ error: 'Invalid compressed export payload' }, { status: 400 });
        }
        await exportR2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: meta.stagingKey })).catch((err) => {
          console.error('[export/pptx] staging delete', err);
        });
      } else {
        jsonStr = raw.toString('utf8');
      }
    } else {
      jsonStr = encoding === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    }

    let body: PptxExportBody;
    try {
      body = JSON.parse(jsonStr) as PptxExportBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body.slides?.length) {
      return NextResponse.json({ error: 'Invalid presentation: missing or empty slides' }, { status: 400 });
    }

    const url = new URL(req.url);
    if (
      !workerUserId &&
      !exportJobId &&
      url.searchParams.get('async') === '1' &&
      body.slides.length >= asyncExportSlideThreshold()
    ) {
      const { redis } = await import('@/lib/redis');
      if (!redis) {
        return NextResponse.json(
          { error: 'Export queue unavailable. Try again without async export or configure Redis.' },
          { status: 503 },
        );
      }
      const jobId = uuidv4();
      const record = await createJobRecord({
        id: jobId,
        userId: authedUserId,
        type: 'export_pptx',
        status: 'queued',
      });
      if (!record) {
        return NextResponse.json({ error: 'Export job storage unavailable' }, { status: 503 });
      }
      await redis.lpush(
        'queue:export:v1',
        JSON.stringify({ jobId, userId: authedUserId, body }),
      );
      return NextResponse.json(
        { jobId, status: 'queued', message: 'Export queued. Poll GET /api/jobs/[id].' },
        { status: 202 },
      );
    }

    const activeJobId = exportJobId || url.searchParams.get('jobId') || undefined;
    const result = await runPptxExport({
      userId: authedUserId,
      body,
      jobId: activeJobId || undefined,
    });

    if (result.mode === 'job') {
      return NextResponse.json({ ok: true, exportKey: result.exportKey });
    }

    return new NextResponse(new Uint8Array(result.buffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('PPTX export error:', err);
    captureApiException(err, { requestId, route: 'POST /api/export/pptx' });
    const short = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: short && short !== 'Error' ? short.slice(0, 240) : 'PPTX generation failed',
      },
      { status: 500 },
    );
  }
}
