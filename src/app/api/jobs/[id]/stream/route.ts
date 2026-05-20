import { NextResponse } from 'next/server';
import { QueueEvents, Job } from 'bullmq';
import { connection, QUEUE_NAMES } from '@/lib/queue/config';
import { aiGenerationQueue, pptxExportQueue } from '@/lib/queue/client';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const jobId = params.id;
  if (!jobId) return new NextResponse('Missing jobId', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendPayload = (payload: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (e) {
          // stream closed
        }
      };

      // Determine which queue it belongs to by prefix
      let queueName = QUEUE_NAMES.AI_GENERATION;
      let queueClient = aiGenerationQueue;
      if (jobId.startsWith('pptx-')) {
        queueName = QUEUE_NAMES.PPTX_EXPORT;
        queueClient = pptxExportQueue;
      }

      const queueEvents = new QueueEvents(queueName, { connection });

      queueEvents.on('progress', ({ jobId: eventJobId, data }) => {
        if (eventJobId === jobId) {
          sendPayload(data);
        }
      });

      queueEvents.on('completed', ({ jobId: eventJobId, returnvalue }) => {
        if (eventJobId === jobId) {
          let parsedRet;
          try {
            parsedRet = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
          } catch (e) {
            parsedRet = returnvalue;
          }
          sendPayload({ type: 'completed', data: parsedRet });
          queueEvents.close();
          try { controller.close(); } catch (e) {}
        }
      });

      queueEvents.on('failed', ({ jobId: eventJobId, failedReason }) => {
        if (eventJobId === jobId) {
          sendPayload({ type: 'failed', error: failedReason });
          queueEvents.close();
          try { controller.close(); } catch (e) {}
        }
      });

      // Keep-alive heartbeat every 15 seconds to prevent timeout
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(interval);
          queueEvents.close();
        }
      }, 15000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        queueEvents.close();
      });

      // Fetch current state in case it finished before we connected
      try {
        const job = await Job.fromId(queueClient, jobId);
        if (job) {
          const state = await job.getState();
          if (state === 'completed') {
            sendPayload({ type: 'completed', data: job.returnvalue });
            clearInterval(interval);
            queueEvents.close();
            try { controller.close(); } catch(e){}
          } else if (state === 'failed') {
            sendPayload({ type: 'failed', error: job.failedReason });
            clearInterval(interval);
            queueEvents.close();
            try { controller.close(); } catch(e){}
          }
        }
      } catch(e) {}
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
