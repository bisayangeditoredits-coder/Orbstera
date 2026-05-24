import { getJobRecord, type JobRecord } from '@/lib/jobs/redis-job-queue';
import { requireApiUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';

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

/**
 * Server-Sent Events stream for job status.
 * One long-lived connection replaces dozens of client GET polls.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing job id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...PRIVATE_API_HEADERS },
    });
  }

  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const initial = await getJobRecord(id);
  if (!initial) {
    return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...PRIVATE_API_HEADERS },
    });
  }
  if (initial.userId !== auth.user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...PRIVATE_API_HEADERS },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
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
        if (initial.status === 'completed' || initial.status === 'failed') {
          controller.close();
          return;
        }

        while (Date.now() - started < STREAM_MAX_MS) {
          await new Promise((r) => setTimeout(r, SERVER_POLL_MS));
          const job = await getJobRecord(id);
          if (!job) {
            controller.enqueue(sseChunk({ error: 'NOT_FOUND', status: 'failed' }));
            break;
          }
          push(job);
          if (job.status === 'completed' || job.status === 'failed') break;

          if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
            controller.enqueue(sseComment());
            lastHeartbeat = Date.now();
          }
        }
      } catch (e) {
        console.error('[api/jobs/stream]', e);
        controller.enqueue(
          sseChunk({
            status: 'failed',
            error: e instanceof Error ? e.message : 'Stream error',
          }),
        );
      } finally {
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
}
