import { Worker, Job } from 'bullmq';
import { connection, QUEUE_NAMES } from '../lib/queue/config';
import PptxGenJS from 'pptxgenjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

let cachedLogoData: string | undefined;

const PPTX_W = 10;
const PPTX_H = 5.625;
const SCALE  = PPTX_W / 1280;
const px = (v: number) => parseFloat((v * SCALE).toFixed(4));

function hex(color?: string): string {
  if (!color) return 'FFFFFF';
  const c = color.replace('#', '').toUpperCase();
  return c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c.substring(0, 6);
}

function mapFont(family?: string): string {
  if (!family) return 'Calibri';
  const f = family.toLowerCase();
  if (f.includes('grotesk') || f.includes('inter') || f.includes('roboto') || f.includes('outfit')) return 'Calibri';
  if (f.includes('helvetica') || f.includes('arial'))  return 'Arial';
  return 'Calibri';
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const buf  = await res.arrayBuffer();
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export const pptxExportWorker = new Worker(QUEUE_NAMES.PPTX_EXPORT, async (job: Job) => {
  const { body, userId, isPaidUser } = job.data;
  const { slides, colorPalette, title } = body;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const channel = supabaseAdmin.channel(`job-${job.id}`);
  channel.subscribe();

  const sendProgress = async (message: string) => {
    await job.updateProgress({ message });
    await channel.send({ type: 'broadcast', event: 'progress', payload: { message } });
  };

  const palette  = colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
  const bgColor  = hex(palette[0]);
  const accent   = hex(palette[2] || palette[1]);

  const pptx = new PptxGenJS();
  pptx.author  = 'Orbstera AI';
  pptx.company = 'Orbstera';
  pptx.title   = title || 'Generated Presentation';
  pptx.layout  = 'LAYOUT_16x9';

  type ImgTask = { slideIdx: number; elIdx: number; url: string; isBg: boolean };
  const imgTasks: ImgTask[] = [];

  slides.forEach((slide: any, si: number) => {
    (slide.elements || []).forEach((el: any, ei: number) => {
      if (el.type === 'image' && el.src) {
        const isBg = el.zIndex === 0 && el.x === 0 && el.y === 0;
        imgTasks.push({ slideIdx: si, elIdx: ei, url: el.src, isBg });
      }
    });
  });

  const CONCURRENCY_LIMIT = 5;
  const fetchedImages: PromiseSettledResult<string | null>[] = [];
  for (let i = 0; i < imgTasks.length; i += CONCURRENCY_LIMIT) {
    const chunk = imgTasks.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.allSettled(chunk.map(t => fetchImageAsBase64(t.url)));
    fetchedImages.push(...chunkResults);
    await sendProgress(`Fetching images... ${Math.round((fetchedImages.length / imgTasks.length) * 50)}%`);
  }

  const imgMap = new Map<string, string>();
  imgTasks.forEach((t, i) => {
    const result = fetchedImages[i];
    if (result.status === 'fulfilled' && result.value) {
      imgMap.set(`${t.slideIdx}-${t.elIdx}`, result.value);
    }
  });

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si];
    const pptSlide = pptx.addSlide();
    pptSlide.background = { color: bgColor };

    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: PPTX_W, h: PPTX_H,
      fill: {
        type: 'gradient', gradType: 'linear', angle: 315,
        stops: [
          { position: 0, color: accent, transparency: 80 },
          { position: 50, color: 'FFFFFF', transparency: 100 },
          { position: 100, color: accent, transparency: 85 },
        ],
      } as any,
      line: { type: 'none' },
    });

    const sorted = [...(slide.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (let ei = 0; ei < sorted.length; ei++) {
      const el = sorted[ei];
      if (el.visible === false) continue;
      
      const common = { x: px(el.x), y: px(el.y), w: px(el.width), h: px(el.height) };

      if (el.type === 'text' && el.content) {
        const ts = el.textStyle || {};
        pptSlide.addText(el.content, {
          ...common,
          fontFace: mapFont(ts.fontFamily),
          fontSize: Math.max(6, Math.round((ts.fontSize || 24) * 0.5625)),
          color: hex(ts.color || '#FFFFFF'),
          align: (ts.textAlign || 'left') as any,
        });
      } else if (el.type === 'image' && el.src) {
        const origIdx = (slide.elements || []).indexOf(el);
        const imgData = imgMap.get(`${si}-${origIdx}`);
        if (imgData) pptSlide.addImage({ ...common, data: imgData, sizing: { type: 'cover', w: common.w, h: common.h } as any });
      }
    }
    await sendProgress(`Generating slide ${si + 1}/${slides.length}...`);
  }

  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

  await sendProgress('Uploading presentation to cloud storage...');

  const safeTitle = (title || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 60);
  const fileName = `${userId || 'anon'}/${safeTitle}-${Date.now()}.pptx`;

  const { data, error } = await supabaseAdmin.storage
    .from('exports')
    .upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      upsert: true,
    });

  if (error) {
    await channel.send({ type: 'broadcast', event: 'failed', payload: { error: error.message } });
    supabaseAdmin.removeChannel(channel);
    throw new Error(`Upload failed. Ensure the 'exports' bucket exists. Error: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('exports').getPublicUrl(fileName);

  await channel.send({ type: 'broadcast', event: 'completed', payload: { downloadUrl: publicUrlData.publicUrl } });
  supabaseAdmin.removeChannel(channel);

  return { downloadUrl: publicUrlData.publicUrl };
}, { connection, concurrency: 5 });

pptxExportWorker.on('failed', (job, err) => {
  console.error(`[PPTX Worker] Job ${job?.id} failed:`, err);
});
