import { getJobRecord, type JobRecord } from '@/lib/jobs/redis-job-queue';
import { PRIVATE_API_HEADERS } from '@/lib/auth/server';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const STREAM_MAX_MS = 600_000;
const SERVER_POLL_MS = 2_000;
const HEARTBEAT_MS = 15_000;

function jobSignature(job: JobRecord): string {
  return `${job.status}:${job.progress ?? ''}:${job.updatedAt}:${job.error ?? ''}`;
}

function sseChunk(data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sseComment(): Uint8Array {
  return new TextEncoder().encode(': heartbeat\n\n');
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...PRIVATE_API_HEADERS },
  });
}

/**
 * Server-Sent Events stream for job status.
 * One long-lived connection replaces dozens of client GET polls.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id?.trim();
    if (!id) {
      return jsonError(400, 'Missing job id');
    }

    const auth = await requireApiUserWithRateLimit(req, 'default');
    if ('response' in auth) return auth.response;

    const initial = await getJobRecord(id);
    if (!initial) {
      return jsonError(404, 'NOT_FOUND');
    }
    if (initial.userId !== auth.user.id) {
      return jsonError(403, 'Forbidden');
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let aborted = req.signal.aborted;
        const onAbort = () => {
          aborted = true;
        };
        req.signal.addEventListener('abort', onAbort);
        const started = Date.now();
        let lastSig = '';
        let lastHeartbeat = Date.now();

        const push = (job: JobRecord) => {
          const sig = jobSignature(job);
          if (sig === lastSig) return;
          lastSig = sig;
          controller.enqueue(
            sseChunk({
              id: job.id,
              status: job.status,
              progress: job.progress,
              error: job.error,
              result: job.status === 'completed' ? job.result : undefined,
            }),
          );
        };

        try {
          push(initial);
          if (initial.status === 'completed' || initial.status === 'failed' || initial.status === 'cancelled') {
            controller.close();
            return;
          }

          while (!aborted && Date.now() - started < STREAM_MAX_MS) {
            await new Promise((r) => setTimeout(r, SERVER_POLL_MS));
            if (aborted) break;
            const job = await getJobRecord(id);
            if (!job) {
              controller.enqueue(sseChunk({ error: 'NOT_FOUND', status: 'failed' }));
              break;
            }
            push(job);
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') break;

            if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
              controller.enqueue(sseComment());
              lastHeartbeat = Date.now();
            }
          }

          if (!aborted && Date.now() - started >= STREAM_MAX_MS) {
            controller.enqueue(
              sseChunk({
                status: 'failed',
                error: 'STREAM_TIMEOUT',
              }),
            );
          }
        } catch (e) {
          console.error('[api/jobs/stream]', e);
          if (!aborted) {
            controller.enqueue(
              sseChunk({
                status: 'failed',
                error: e instanceof Error ? e.message : 'Stream error',
              }),
            );
          }
        } finally {
          req.signal.removeEventListener('abort', onAbort);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...PRIVATE_API_HEADERS,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    console.error('[api/jobs/stream] setup failed:', e);
    return jsonError(500, 'Internal error');
  }
}
