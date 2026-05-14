import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import PptxGenJS from 'pptxgenjs';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { PresentationData, Slide, SlideElement, SlideTransition } from '@/types';
import { findDeckBackgroundElement, isSlideDeckBackgroundImage } from '@/lib/slide-background';
import { tryExtractR2ObjectKeyFromPublicUrl } from '@/lib/r2-public-url';
import { enforceAiRateLimit } from '@/lib/rate-limit-server';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

let exportR2Client: S3Client | null = null;
if (
  process.env.CLOUDFLARE_R2_ENDPOINT &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_SECRET_KEY
) {
  exportR2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

async function r2ObjectToBuffer(key: string): Promise<{ buf: Buffer; mime: string } | null> {
  if (!exportR2Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) return null;
  try {
    const obj = await exportR2Client.send(
      new GetObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME, Key: key }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of obj.Body as AsyncIterable<Uint8Array | Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    const mime = obj.ContentType || 'image/jpeg';
    return { buf, mime };
  } catch {
    return null;
  }
}

// ── Canvas → PPTX coordinate system ──────────────────────────────────────────
// Canvas: 1280 × 720 px  →  PPTX: 10 × 5.625 inches  (same 16:9 ratio)
const PPTX_W = 10;
const PPTX_H = 5.625;
const SCALE  = PPTX_W / 1280; // 0.0078125 in/px

const px = (v: number) => parseFloat((v * SCALE).toFixed(4));

/** Strip # and ensure 6-char uppercase hex (pptxgenjs format) */
function hex(color?: string): string {
  if (!color) return 'FFFFFF';
  const c = color.replace('#', '').toUpperCase();
  return c.length === 3
    ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
    : c.substring(0, 6);
}

/** Map web font names → Office-safe equivalents */
function mapFont(family?: string): string {
  if (!family) return 'Calibri';
  const f = family.toLowerCase();
  if (f.includes('grotesk') || f.includes('inter') || f.includes('roboto') || f.includes('outfit')) return 'Calibri';
  if (f.includes('helvetica') || f.includes('arial'))  return 'Arial';
  if (f.includes('georgia'))                           return 'Georgia';
  if (f.includes('times'))                             return 'Times New Roman';
  if (f.includes('trebuchet'))                         return 'Trebuchet MS';
  if (f.includes('verdana'))                           return 'Verdana';
  if (f.includes('courier'))                           return 'Courier New';
  if (f.includes('playfair'))                          return 'Georgia';
  if (f.includes('dm sans') || f.includes('dm'))       return 'Calibri';
  if (f.includes('jetbrains') || f.includes('mono'))   return 'Courier New';
  return 'Calibri';
}

/** Legacy heuristic when no explicit `SlideTransition` is set */
function legacySlideTransition(animStyle?: string, slideType?: string) {
  const fade: any = { type: 'fade',  speed: 'med' };
  const push: any = { type: 'push',  dir:   'l',  speed: 'med' };
  const zoom: any = { type: 'zoom',  speed: 'med' };

  if (animStyle?.includes('cinematic')) return fade;
  switch (slideType) {
    case 'hero':     return fade;
    case 'quote':    return fade;
    case 'split':    return push;
    case 'media':    return zoom;
    case 'chart':    return zoom;
    case 'stats':    return zoom;
    case 'timeline': return push;
    default:         return fade;
  }
}

/** Map Orbstera slide transitions → pptxgenjs transition objects */
function resolveSlideTransitionExport(
  slide: Slide,
  animStyle?: string,
  defaultSlideTransition?: SlideTransition,
) {
  const fade: any = { type: 'fade', speed: 'med' };
  const pushL: any = { type: 'push', dir: 'l', speed: 'med' };
  const pushU: any = { type: 'push', dir: 'u', speed: 'med' };
  const zoom: any = { type: 'zoom', speed: 'med' };

  const t = slide.slideTransition || defaultSlideTransition;
  if (t) {
    if (t === 'fade' || t === 'crossDissolve' || t === 'blurReveal') return fade;
    if (t === 'floating') return fade;
    if (t === 'verticalFlow') return pushU;
    if (t === 'zoom' || t === 'dynamicScale' || t === 'depth' || t === 'morph') return zoom;
    if (
      t === 'smoothSlide' ||
      t === 'horizontalCinematic' ||
      t === 'glassSwipe' ||
      t === 'parallaxFlow' ||
      t === 'layerReveal' ||
      t === 'keynote'
    ) {
      return pushL;
    }
  }
  return legacySlideTransition(animStyle, slide.type);
}

// ── Fetch a remote image and return it as a base64 data URI ──────────────────
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const r2Key = tryExtractR2ObjectKeyFromPublicUrl(url);
  if (r2Key) {
    const got = await r2ObjectToBuffer(r2Key);
    if (got) {
      return `data:${got.mime};base64,${got.buf.toString('base64')}`;
    }
  }

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

// ── Build real OOXML entrance animation for a shape by shapeId ────────────────
// This injects proper <p:timing> OOXML so PowerPoint actually plays animations
function buildAnimXml(shapeId: number, entrance: string, delayMs: number, orderIdx: number, durationMs = 600): string {
  // Map entrance names → OOXML preset IDs
  const presetMap: Record<string, { preset: number; subtype?: string; dir?: string }> = {
    none:           { preset: 10 },
    fadeSlideUp:    { preset: 2,  subtype: 'fromBottom' },   // Fly In from bottom
    fadeSlideLeft:  { preset: 2,  subtype: 'fromLeft'   },   // Fly In from left
    slideRight:     { preset: 2,  subtype: 'fromRight'  },
    fadeIn:         { preset: 10 },                           // Fade
    zoomIn:         { preset: 18, subtype: 'in'          },   // Zoom
    elasticScale:   { preset: 18, subtype: 'in'          },   // Zoom
    reveal:         { preset: 37 },                           // Wipe
    blurIn:         { preset: 10 },                           // Fade
    glassBlur:      { preset: 10 },
    glitch:         { preset: 2,  subtype: 'fromLeft'    },   // Fly In
    flipIn:         { preset: 8  },                           // Flip
    bounceIn:       { preset: 38 },                           // Bounce (closest)
    parallaxDrift:  { preset: 2,  subtype: 'fromLeft' },
    verticalRise:   { preset: 2,  subtype: 'fromBottom' },
    horizontalReveal: { preset: 2, subtype: 'fromLeft' },
    depthRise:      { preset: 18, subtype: 'in' },
    floatGentle:    { preset: 10 },
    scaleSoft:      { preset: 18, subtype: 'in' },
    morphBlend:     { preset: 10 },
    cinematicImageZoom: { preset: 18, subtype: 'in' },
    typewriterWords: { preset: 10 },
    staggerLines:   { preset: 2,  subtype: 'fromBottom' },
  };

  const info    = presetMap[entrance] || { preset: 10 };
  const presetId = info.preset;
  const attrSub  = info.subtype ? ` presetSubtype="${subEnum(info.subtype)}"` : '';
  const delayEmu = delayMs * 100_000; // EMU = ms * 100000

  // We return a snippet that gets appended to the slide XML timing block.
  // pptxgenjs exposes `addSlide(...).addElement` with raw XML via the internal
  // ooxml override. We patch the slide XML directly after generation.
  // This is the <p:par> block used inside <p:seq> children.
  const dur = Math.round(Math.max(50, durationMs));
  return `<p:par><p:cTn id="${orderIdx * 2 + 1}" presetID="${presetId}"${attrSub} presetClass="entr" grpId="0" afterActionClr="false" fill="hold" autoRev="false" restart="whenNotActive" nodeType="clickEffect"><p:stCondLst><p:cond delay="${delayEmu}"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="${orderIdx * 2 + 2}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect filter="fade" transition="in"><p:cBhvr><p:cTn id="${orderIdx * 2 + 3}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
}

// Map subtype strings to Office Open XML enum values
function subEnum(sub?: string): number {
  switch (sub) {
    case 'fromBottom': return 8;
    case 'fromLeft':   return 2;
    case 'fromRight':  return 4;
    case 'fromTop':    return 1;
    case 'in':         return 1;
    default:           return 0;
  }
}

export const runtime = 'nodejs';
/** Large decks + image prefetch can exceed default serverless limits on Vercel. */
export const maxDuration = 120;

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const encoding = (req.headers.get('content-encoding') || '').toLowerCase();
    const raw = Buffer.from(await req.arrayBuffer());
    const jsonStr =
      encoding === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    const body: PresentationData & { slideImages?: string[] } = JSON.parse(jsonStr);
    const { slides, colorPalette, fontPairing, animationStyle, title, defaultSlideTransition } = body;

    // ── Check user plan for watermark ─────────────────────────────────────────
    let isPaidUser = false;
    let exportCredits = 0;
    let userId = null;

    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        exportCredits = user.user_metadata?.watermark_free_exports || 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();
        const plan = profile?.plan?.toLowerCase() || 'free';
        isPaidUser = plan === 'pro' || plan === 'creator_pro' || plan === 'student_pro';
      }
    } catch (_) { /* If auth fails, default to watermark */ }

    const limited = await enforceAiRateLimit(req, userId, 'default');
    if (limited) return limited;

    // Use a credit if they are not a paid user but have credits
    const useCredit = !isPaidUser && exportCredits > 0;
    if (useCredit && userId) {
      isPaidUser = true; // Pretend they are paid so watermark is skipped
      
      // Deduct 1 credit using Supabase Admin
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { watermark_free_exports: exportCredits - 1 }
        });
      } catch (err) {
        console.error('[PPTX] Failed to deduct export credit:', err);
      }
    }

    const palette  = colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const bgColor  = hex(palette[0]);
    const accent   = hex(palette[2] || palette[1]);

    const pptx = new PptxGenJS();
    pptx.author  = 'Orbstera AI';
    pptx.company = 'Orbstera';
    pptx.title   = title || 'Generated Presentation';
    pptx.layout  = 'LAYOUT_16x9';

    // ── Pre-fetch ALL images in parallel ─────────────────────────────────────
    // Collect every image URL across all slides first, then fetch concurrently
    type ImgTask = { slideIdx: number; elIdx: number; url: string; isBg: boolean };
    const imgTasks: ImgTask[] = [];

    slides.forEach((slide, si) => {
      (slide.elements || []).forEach((el, ei) => {
        if (el.type === 'image' && el.src) {
          const isBg = isSlideDeckBackgroundImage(el);
          imgTasks.push({ slideIdx: si, elIdx: ei, url: el.src, isBg });
        }
      });
    });

    // Fetch all images at once
    const fetchedImages = await Promise.allSettled(
      imgTasks.map(t => fetchImageAsBase64(t.url))
    );
    // Build a lookup map: "slideIdx-elIdx" → base64
    const imgMap = new Map<string, string>();
    imgTasks.forEach((t, i) => {
      const result = fetchedImages[i];
      if (result.status === 'fulfilled' && result.value) {
        imgMap.set(`${t.slideIdx}-${t.elIdx}`, result.value);
      }
    });

    // ── Build each slide ──────────────────────────────────────────────────────
    for (let si = 0; si < slides.length; si++) {
      const slide    = slides[si];
      const pptSlide = pptx.addSlide();

      // ── 1. Solid background color ──────────────────────────────────────────
      pptSlide.background = { color: bgColor };

      // ── 2. Gradient overlay to match Konva canvas gradient ─────────────────
      // Canvas renders: accent+'33' at corner 0, transparent at 50%, accent+'22' at corner 1
      // We approximate with a diagonal linear gradient shape overlay
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: PPTX_W, h: PPTX_H,
        fill: {
          type:     'gradient',
          gradType: 'linear',
          angle:    315,
          stops: [
            { position: 0,   color: accent, transparency: 80 },
            { position: 50,  color: 'FFFFFF', transparency: 100 },
            { position: 100, color: accent, transparency: 85 },
          ],
        } as any,
        line: { type: 'none' },
      });

      // ── 3. Hero background image (low opacity, full-slide) ─────────────────
      const bgEl = findDeckBackgroundElement(slide.elements);
      const bgElIdx = bgEl ? (slide.elements || []).indexOf(bgEl) : -1;

      if (bgEl && bgElIdx !== -1) {
        const bgData = imgMap.get(`${si}-${bgElIdx}`);
        if (bgData) {
          pptSlide.addImage({
            x: 0, y: 0, w: PPTX_W, h: PPTX_H,
            data:   bgData,
            sizing: { type: 'cover', w: PPTX_W, h: PPTX_H },
          } as any);
          // Overlay to match ~18% image opacity on canvas
          pptSlide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: PPTX_W, h: PPTX_H,
            fill: { type: 'solid', color: bgColor, transparency: 18 } as any,
            line: { type: 'none' },
          });
        }
      }

      // ── 4. Elements ────────────────────────────────────────────────────────
      const sorted = [...(slide.elements || [])].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      for (let ei = 0; ei < sorted.length; ei++) {
        const el = sorted[ei];
        if (el.visible === false) continue;
        // Skip bg image (handled above)
        if (el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0) continue;

        const common = {
          x: px(el.x),
          y: px(el.y),
          w: px(el.width),
          h: px(el.height),
        };

        // ── TEXT ──────────────────────────────────────────────────────────
        if (el.type === 'text' && el.content) {
          const ts       = el.textStyle || {};
          const fontSize = Math.max(6, Math.round((ts.fontSize || 24) * 0.5625));
          const bold     = ts.fontWeight === 'bold' || Number(ts.fontWeight) >= 700;
          const italic   = ts.fontStyle === 'italic';
          const align    = (ts.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';

          pptSlide.addText(el.content, {
            ...common,
            fontFace:           mapFont(ts.fontFamily),
            fontSize,
            bold,
            italic,
            color:              hex(ts.color || '#FFFFFF'),
            align,
            valign:             'top',
            wrap:               true,
            charSpacing:        ts.letterSpacing || 0,
            lineSpacingMultiple: ts.lineHeight || 1.4,
            autoFit:            false,
          });
        }

        // ── IMAGE ─────────────────────────────────────────────────────────
        else if (el.type === 'image' && el.src) {
          // Find original index in unsorted elements to look up pre-fetched image
          const origIdx = (slide.elements || []).indexOf(el);
          const imgData = imgMap.get(`${si}-${origIdx}`)
            || await fetchImageAsBase64(el.src);

          if (imgData) {
            pptSlide.addImage({
              ...common,
              data:     imgData,
              sizing:   { type: 'cover', w: common.w, h: common.h },
              rounding: false,
            });
          }
        }

        // ── SHAPE ─────────────────────────────────────────────────────────
        else if (el.type === 'shape') {
          const ss   = el.shapeStyle || {};
          const fill = ss.fill ? { type: 'solid', color: hex(ss.fill) } : { type: 'none' };
          const line = ss.stroke && ss.strokeWidth
            ? { color: hex(ss.stroke), pt: ss.strokeWidth }
            : { type: 'none' };

          const shapeType =
            el.shapeType === 'circle'   ? pptx.ShapeType.ellipse :
            el.shapeType === 'triangle' ? pptx.ShapeType.triangle :
            pptx.ShapeType.rect;

          pptSlide.addShape(shapeType, {
            ...common,
            fill,
            line,
            opacity:    el.opacity ?? 1,
            rectRadius: el.shapeType === 'rect' && ss.cornerRadius
              ? ss.cornerRadius / 100
              : undefined,
          } as any);
        }
      }

      // ── 5. Slide transition ────────────────────────────────────────────────
      const trans = resolveSlideTransitionExport(slide, animationStyle, defaultSlideTransition);
      (pptSlide as any).transition = trans;

      // ── 6. Speaker notes ───────────────────────────────────────────────────
      const notes = [
        slide.speakerNotes,
        slide.imagePrompt ? `Image Prompt: ${slide.imagePrompt}` : '',
      ].filter(Boolean).join('\n\n');
      if (notes) pptSlide.addNotes(notes);
    }

    // ── Watermark: inject on every slide for Free users ──────────────────────
    if (!isPaidUser) {
      let logoData: string | undefined;
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.png.png');
        const logoBuffer = fs.readFileSync(logoPath);
        logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch (err) {
        console.error('Failed to load watermark logo:', err);
      }

      const allSlides = (pptx as any).slides as any[];
      allSlides.forEach((wSlide: any) => {
        if (logoData) {
          wSlide.addImage({
            data: logoData,
            x: 8.2, y: 5.05, w: 1.5, h: 0.35,
            sizing: { type: 'contain', w: 1.5, h: 0.35 },
          });
        }
        wSlide.addText('Made with Orbstera AI', {
          x: 7.2, y: 5.4, w: 2.5, h: 0.15,
          fontSize: 9,
          color: '999999',
          align: 'right',
          bold: true,
          isTextBox: true,
        });
      });
    }

    // ── Serialise ─────────────────────────────────────────────────────────────
    const safeTitle = (title || 'presentation')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 60);

    const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    // ── Inject entrance animations via OOXML post-processing ─────────────────
    // pptxgenjs doesn't expose element animations via its public API so we
    // patch the raw XML buffer. We convert to string, find each slide's spTree,
    // and append a <p:timing> block with fade-in animations for every text/shape.
    const xmlStr = await injectAnimations(buffer, slides, palette);

    const finalBuffer = xmlStr instanceof ArrayBuffer ? xmlStr : buffer;

    return new NextResponse(new Uint8Array(finalBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeTitle}.pptx"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('PPTX export error:', err);
    captureApiException(err, { requestId, route: 'POST /api/export/pptx' });
    return NextResponse.json({ error: 'Export failed', detail: String(err) }, { status: 500 });
  }
}

// ── Post-process: Inject OOXML animations into the pptx buffer ────────────────
// This uses JSZip-style manipulation to patch slide XMLs inside the .pptx zip
async function injectAnimations(
  buffer: ArrayBuffer,
  slides: PresentationData['slides'],
  palette: string[]
): Promise<ArrayBuffer> {
  try {
    // Dynamic import to avoid SSR issues
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);

    for (let si = 0; si < slides.length; si++) {
      const slideFile = zip.file(`ppt/slides/slide${si + 1}.xml`);
      if (!slideFile) continue;

      let xml = await slideFile.async('string');

      // Extract all shape IDs from the spTree
      const spIds: { id: number; entrance: string; delay: number }[] = [];
      const spIdRegex = /<p:sp>[\s\S]*?<p:cNvPr id="(\d+)"[\s\S]*?<\/p:sp>/g;
      let match: RegExpExecArray | null;
      let order = 0;

      // Map elements to animations in sorted order (skip bg image)
      const sorted = [...(slides[si]?.elements || [])]
        .filter(el => el.visible !== false && !(el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0))
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Collect shape IDs from the XML (they are assigned sequentially by pptxgenjs)
      // pptxgenjs assigns IDs starting at 2 (slide layout ref is 1)
      let shapeCounter = 2; // Gradient overlay is 2, bg overlay is 3 etc
      // We conservatively assign animations starting from shape 4 (after our overlays)
      const animElems = sorted.filter(el => el.type === 'text' || el.type === 'shape');

      if (animElems.length === 0) continue;

      // Build the timing XML block
      const parList = animElems.map((el, i) => {
        const entrance = el.animation?.entrance || 'fadeIn';
        const delay = el.animation?.delay ?? i * 150;
        const durationMs = Math.max(50, el.animation?.duration ?? 600);
        const spId = 4 + i;
        return `<p:par>
          <p:cTn id="${100 + i * 3}" presetID="${getPresetId(entrance)}" presetClass="entr" grpId="${i}" fill="hold" nodeType="clickEffect">
            <p:stCondLst><p:cond delay="${delay * 100000}"/></p:stCondLst>
            <p:childTnLst>
              <p:animEffect transition="in" filter="fade">
                <p:cBhvr><p:cTn id="${101 + i * 3}" dur="${durationMs}" fill="hold"/>
                  <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
                </p:cBhvr>
              </p:animEffect>
            </p:childTnLst>
          </p:cTn>
        </p:par>`;
      }).join('');

      const timingXml = `<p:timing>
        <p:tnLst>
          <p:par>
            <p:cTn id="1" dur="indefinite" restart="whenNotActive" nodeType="tmRoot">
              <p:childTnLst>
                <p:seq concurrent="1" nextAc="seek">
                  <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
                    <p:childTnLst>${parList}</p:childTnLst>
                  </p:cTn>
                  <p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn/></p:cond></p:prevCondLst>
                  <p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn/></p:cond></p:nextCondLst>
                </p:seq>
              </p:childTnLst>
            </p:cTn>
          </p:par>
        </p:tnLst>
        <p:bldLst>${animElems.map((el, i) =>
          `<p:bldP spid="${4 + i}" grpId="${i}" uiExpand="0" build="p"/>`
        ).join('')}</p:bldLst>
      </p:timing>`;

      // Replace or append timing block
      if (xml.includes('<p:timing>')) {
        xml = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, timingXml);
      } else {
        xml = xml.replace('</p:sld>', `${timingXml}</p:sld>`);
      }

      zip.file(`ppt/slides/slide${si + 1}.xml`, xml);
    }

    return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  } catch (e) {
    console.error('[PPTX] Animation injection failed (non-fatal):', e);
    return buffer; // Return original if patching fails
  }
}

function getPresetId(entrance: string): number {
  const map: Record<string, number> = {
    none: 10,
    fadeSlideUp:   2,
    fadeSlideLeft: 2,
    slideRight:     2,
    fadeIn:        10,
    zoomIn:        18,
    elasticScale:  18,
    reveal:        37,
    blurIn:        10,
    glassBlur:     10,
    glitch:        2,
    flipIn:        8,
    bounceIn:      38,
    parallaxDrift: 2,
    verticalRise:  2,
    horizontalReveal: 2,
    depthRise:     18,
    floatGentle:   10,
    scaleSoft:     18,
    morphBlend:    10,
    cinematicImageZoom: 18,
    typewriterWords: 10,
    staggerLines:  2,
  };
  return map[entrance] || 10;
}