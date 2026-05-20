import { PresentationData } from '@/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Export a presentation to PPTX.
 *
 * Strategy: Enqueue the presentation data to the background worker via Next.js.
 * Listen to the Supabase Realtime channel for the job to complete.
 * Once complete, the worker returns the Supabase Storage download URL.
 */
export async function exportToPptx(presentation: PresentationData): Promise<void> {
  const response = await fetch('/api/export/pptx', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(presentation),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Export failed');
  }

  const { jobId } = await response.json();
  if (!jobId) throw new Error('No job ID returned for export');

  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const channel = supabase.channel(`job-${jobId}`);

    channel.on('broadcast', { event: 'completed' }, (payload) => {
      supabase.removeChannel(channel);
      const downloadUrl = payload.payload?.downloadUrl;
      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `presentation-${Date.now()}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve();
      } else {
        reject(new Error('Missing download URL in response'));
      }
    });

    channel.on('broadcast', { event: 'failed' }, (payload) => {
      supabase.removeChannel(channel);
      reject(new Error(payload.payload?.error || 'Export job failed'));
    });

    // Provide a generous timeout for PPTX export (120s)
    setTimeout(() => {
      supabase.removeChannel(channel);
      reject(new Error('Export timed out. Please try again.'));
    }, 120000);

    channel.subscribe();
  });
}