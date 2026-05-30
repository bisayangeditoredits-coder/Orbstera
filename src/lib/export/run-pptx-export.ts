import PptxGenJS from 'pptxgenjs';
import { createClient } from '@supabase/supabase-js';
import { PresentationData, Slide, SlideTransition, SlideElement } from '@/types';
import { findDeckBackgroundElement, isSlideDeckBackgroundImage } from '@/lib/slide-background';
import { fetchImageAsBase64ForExport, fetchVideoAsBase64ForExport } from '@/lib/export/export-image';
import { combinedShapeTransparency, parseColorForPptx } from '@/lib/export/export-colors';
import { shapePathToSvgDataUri } from '@/lib/export/export-shape-path';
import { elementPlacement, pptxRectRadius, pptxShapeLine } from '@/lib/export/export-pptx-placement';
import { updateJobRecord } from '@/lib/jobs/redis-job-queue';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import { getR2BucketName, getR2Client, isR2Configured } from '@/lib/server/r2-client';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// ── Canvas → PPTX coordinate system ──────────────────────────────────────────
// Canvas: 1280 × 720 px  →  PPTX: 13.333 × 7.5 inches (96 DPI exact match)
const PPTX_W = 13.3333333;
const PPTX_H = 7.5;
const SCALE  = 1 / 96; // 1px = 1/96 inch

const px = (v: number) => parseFloat((v * SCALE).toFixed(4));

/** Read PNG dimensions from IHDR for watermark aspect-ratio math */
function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/** Fit image inside a max box while preserving aspect ratio (inches) */
function fitImageInBox(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const aspect = imgW / imgH;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: parseFloat(w.toFixed(4)), h: parseFloat(h.toFixed(4)) };
}

const WATERMARK_LOGO_CANDIDATES = [
  'public/orbstera-colored-logo.png',
  'public/@2026-Logos-orbstera/orbstera-colored-logo.png',
  'public/Main_logo.png',
  'public/logo.png.png',
];

function loadWatermarkLogo(): { dataUri: string; width: number; height: number } | null {
  for (const rel of WATERMARK_LOGO_CANDIDATES) {
    const logoPath = path.join(process.cwd(), rel);
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      const dims = readPngDimensions(logoBuffer);
      if (!dims) continue;
      return {
        dataUri: `data:image/png;base64,${logoBuffer.toString('base64')}`,
        width: dims.width,
        height: dims.height,
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Strip # and ensure 6-char uppercase hex (pptxgenjs format) */
function hex(color?: string): string {
  return parseColorForPptx(color).color;
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
  if (f.includes('playfair') || f.includes('lora')) return 'Georgia';
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

export type PptxExportBody = PresentationData & { slideImages?: string[] };

export type PptxExportResult =
  | { mode: 'download'; buffer: ArrayBuffer; fileName: string }
  | { mode: 'job'; exportKey: string; fileName: string };

async function resolveExportBilling(userId: string): Promise<{ isPaidUser: boolean }> {
  let isPaidUser = false;
  let exportCredits = 0;

  const admin = getServiceSupabase();
  if (!admin) return { isPaidUser: false };

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();
    const plan = profile?.plan?.toLowerCase() || 'free';
    isPaidUser = plan === 'pro' || plan === 'creator_pro' || plan === 'student_pro';

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    exportCredits =
      (authUser?.user?.user_metadata?.watermark_free_exports as number | undefined) || 0;
  } catch {
    return { isPaidUser: false };
  }

  const useCredit = !isPaidUser && exportCredits > 0;
  if (useCredit) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabaseAdmin = createClient(url, key);
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { watermark_free_exports: exportCredits - 1 },
      });
      isPaidUser = true;
    } catch (err) {
      console.error('[PPTX] Failed to deduct export credit:', err);
    }
  }

  return { isPaidUser };
}

async function failExportJob(jobId: string, message: string): Promise<void> {
  try {
    await updateJobRecord(jobId, { status: 'failed', progress: 0, error: message });
  } catch (e) {
    console.error('[pptx-export] failed to update job record', e);
  }
}

/**
 * Core PPTX build — runs in API routes and in-process export workers (no HTTP callback).
 */
export async function runPptxExport(params: {
  userId: string;
  body: PptxExportBody;
  jobId?: string;
}): Promise<PptxExportResult> {
  const { userId, body, jobId } = params;
  const { slides, colorPalette, animationStyle, title, defaultSlideTransition } = body;

  if (!slides?.length) {
    throw new Error('Invalid presentation: missing or empty slides');
  }

  if (jobId && !isR2Configured()) {
    const msg = 'Export storage (Cloudflare R2) is not configured';
    await failExportJob(jobId, msg);
    throw new Error(msg);
  }

  try {
  const { isPaidUser } = await resolveExportBilling(userId);

  const palette = colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const bgColor  = hex(palette[0]);
    const accent   = hex(palette[2] || palette[1]);

    const pptx = new PptxGenJS();
    pptx.author  = 'Orbstera AI';
    pptx.company = 'Orbstera';
    pptx.title   = title || 'Generated Presentation';
    pptx.defineLayout({ name: 'ORBSTERA_16x9', width: PPTX_W, height: PPTX_H });
    pptx.layout  = 'ORBSTERA_16x9';

    // ── Pre-fetch ALL images in parallel (dedupe by URL) ─────────────────────
    type ImgTask = { slideIdx: number; elementId: string; url: string };
    const imgTasks: ImgTask[] = [];
    const uniqueUrls = new Set<string>();

    slides.forEach((slide, si) => {
      for (const el of slide.elements || []) {
        const isRaster =
          (el.type === 'image' || el.type === 'icon') && typeof el.src === 'string' && el.src.trim();
        if (!isRaster || el.aiImagePending) continue;
        const src = el.src!.trim();
        imgTasks.push({ slideIdx: si, elementId: el.id, url: src });
        uniqueUrls.add(src);
      }
    });

    const urlToData = new Map<string, string | null>();
    await Promise.all(
      [...uniqueUrls].map(async (url) => {
        const data = await fetchImageAsBase64ForExport(url);
        urlToData.set(url, data);
      }),
    );

    const imgMap = new Map<string, string>();
    for (const t of imgTasks) {
      const data = urlToData.get(t.url);
      if (data) imgMap.set(`${t.slideIdx}:${t.elementId}`, data);
    }

    const pptSlidesInfo: { bgShapeCount: number; exportedElements: any[] }[] = [];

    // ── Build each slide ──────────────────────────────────────────────────────
    for (let si = 0; si < slides.length; si++) {
      const slide    = slides[si];
      const pptSlide = pptx.addSlide();

      // ── 1. Solid background color ──────────────────────────────────────────
      pptSlide.background = { color: bgColor };

      // ── 2. (Gradient overlay removed to match current KonvaCanvas background) ──

      // ── 3. Hero background image (low opacity, full-slide) ─────────────────
      const bgEl = findDeckBackgroundElement(slide.elements);

      let bgShapeCount = 0;

      if (bgEl?.src) {
        const bgData = imgMap.get(`${si}:${bgEl.id}`);
        if (bgData) {
          const bgOpacity = bgEl.opacity ?? 0.18;
          bgShapeCount++;
          pptSlide.addImage({
            x: 0,
            y: 0,
            w: PPTX_W,
            h: PPTX_H,
            data: bgData,
            // Removed sizing: 'cover' to prevent background image warping 
            // AI-generated backgrounds are already 16:9
          } as any);
          const bgOverlayTransparency = combinedShapeTransparency(
            undefined,
            1 - bgOpacity,
          );
          if (bgOverlayTransparency !== undefined && bgOverlayTransparency < 100) {
            pptSlide.addShape(pptx.ShapeType.rect, {
              objectName: 'bg-overlay',
              x: 0,
              y: 0,
              w: PPTX_W,
              h: PPTX_H,
              fill: { type: 'solid', color: bgColor, transparency: bgOverlayTransparency } as any,
              line: { type: 'none' },
            });
          }
        }
      }

      // ── 4. Elements ────────────────────────────────────────────────────────
      const exportedElements: SlideElement[] = [];
      const sorted = [...(slide.elements || [])].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      for (let ei = 0; ei < sorted.length; ei++) {
        const el = sorted[ei];
        if (el.visible === false) continue;
        if (isSlideDeckBackgroundImage(el)) continue;

        exportedElements.push(el);

        const _placement = elementPlacement(el);
        const common = { ..._placement, w: _placement.w as number, h: _placement.h as number, objectName: el.id };

        // ── TEXT ──────────────────────────────────────────────────────────
        if (el.type === 'text' && el.content) {
          const ts       = el.textStyle || {};
          // Convert from px to pt (72pt = 96px -> factor of 0.75)
          const fontSize = Math.max(6, Math.round((ts.fontSize || 24) * 0.75));
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
            fit:                'shrink',
            margin:             0,
          });
        }

        // ── IMAGE / VIDEO / ICON ─────────────────────────────────────────
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
          const isVideo = el.src.includes('youtube.com') || el.src.includes('youtu.be') || el.src.split('?')[0].endsWith('.mp4') || el.src.split('?')[0].endsWith('.mov');
          
          if (isVideo) {
            try {
              if (el.src.includes('youtube.com') || el.src.includes('youtu.be')) {
                (pptSlide as any).addMedia({
                  ...common,
                  type: 'online',
                  link: el.src,
                });
              } else {
                let videoUrl = el.src;
                if (videoUrl.includes('?') && !videoUrl.includes('read-asset')) {
                  videoUrl = videoUrl.split('?')[0];
                }
                const b64 = await fetchVideoAsBase64ForExport(el.src);
                if (b64) {
                  (pptSlide as any).addMedia({
                    ...common,
                    type: 'video',
                    data: b64,
                    cover: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                  });
                }
              }
            } catch (e) {
              console.error('[pptx-export] video insertion failed:', e);
            }
          } else {
            // Regular Image
            const imgData =
              imgMap.get(`${si}:${el.id}`) || (await fetchImageAsBase64ForExport(el.src));

            if (imgData) {
              const imageTransparency = combinedShapeTransparency(undefined, el.opacity);
              pptSlide.addImage({
                ...common,
                data: imgData,
                // Removed sizing: 'cover' to prevent image warping in PPTX
                // The w and h from 'common' already preserve the exact aspect ratio from the canvas
                rounding: false,
                ...(imageTransparency !== undefined
                  ? { transparency: imageTransparency }
                  : {}),
              } as any);
            } else {
              console.warn('[pptx-export] missing image on slide', si + 1, el.id, (el.src || '').slice(0, 80));
            }
          }
        }

        // ── FREEHAND DRAW ─────────────────────────────────────────────────
        else if (el.type === 'draw' && el.points && el.points.length >= 4) {
          const pts = el.points.map((p) => px(p));
          const strokeParsed = parseColorForPptx(el.shapeStyle?.stroke || el.shapeStyle?.fill || '#38BDF8');
          pptSlide.addShape(pptx.ShapeType.line, {
            ...common,
            line: {
              color: strokeParsed.color,
              pt: el.shapeStyle?.strokeWidth || 3,
              transparency: strokeParsed.transparency,
            },
            points: pts,
          } as any);
        }

        // ── SHAPE ─────────────────────────────────────────────────────────
        else if (el.type === 'shape') {
          const ss = el.shapeStyle || {};

          if (el.shapeType === 'path') {
            const pathData = shapePathToSvgDataUri(el);
            if (pathData) {
              pptSlide.addImage({
                ...common,
                data: pathData,
                sizing: { type: 'contain', w: common.w, h: common.h },
              });
            }
            continue;
          }

          const fillParsed = ss.fill ? parseColorForPptx(ss.fill) : null;
          const strokeParsed =
            ss.stroke && ss.stroke !== 'transparent' ? parseColorForPptx(ss.stroke) : null;
          const shapeTransparency = combinedShapeTransparency(
            fillParsed?.transparency,
            el.opacity,
          );

          const fill = fillParsed
            ? {
                type: 'solid' as const,
                color: fillParsed.color,
                ...(shapeTransparency !== undefined ? { transparency: shapeTransparency } : {}),
              }
            : { type: 'none' as const };

          const line = pptxShapeLine(ss);

          if (el.shapeType === 'line' || el.shapeType === 'arrow') {
            const lineColor = strokeParsed?.color || fillParsed?.color || '000000';
            pptSlide.addShape(
              el.shapeType === 'arrow' ? pptx.ShapeType.rightArrow : pptx.ShapeType.line,
              {
                ...common,
                line: { color: lineColor, pt: ss.strokeWidth || 4 },
                fill: fillParsed ? { type: 'solid', color: fillParsed.color } : undefined,
              } as any,
            );
            continue;
          }

          const shapeType =
            el.shapeType === 'circle'
              ? pptx.ShapeType.ellipse
              : el.shapeType === 'triangle'
                ? pptx.ShapeType.triangle
                : el.shapeType === 'star'
                  ? pptx.ShapeType.star5
                  : pptx.ShapeType.rect;

          pptSlide.addShape(shapeType, {
            ...common,
            fill,
            line,
            rectRadius: pptxRectRadius(el),
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

      pptSlidesInfo.push({ bgShapeCount, exportedElements });
    }

    // ── Watermark: inject on every slide for Free users ──────────────────────
    if (!isPaidUser) {
      try {
        const logo = loadWatermarkLogo();
        if (!logo) {
          console.warn('[export/pptx] No watermark logo found in public/; text-only watermark');
        }

        const WM_MAX_W = 2.05;
        const WM_MAX_H = 0.42;
        const WM_MARGIN_X = 0.14;
        const WM_MARGIN_Y = 0.1;
        const TAGLINE_H = 0.12;

        let logoPlacement: { x: number; y: number; w: number; h: number } | null = null;
        if (logo) {
          const { w, h } = fitImageInBox(logo.width, logo.height, WM_MAX_W, WM_MAX_H);
          logoPlacement = {
            w,
            h,
            x: parseFloat((PPTX_W - w - WM_MARGIN_X).toFixed(4)),
            y: parseFloat((PPTX_H - h - WM_MARGIN_Y - TAGLINE_H).toFixed(4)),
          };
        }

        const internalSlides = (pptx as unknown as { slides?: unknown }).slides;
        const allSlides = Array.isArray(internalSlides) ? internalSlides : [];
        for (const wSlide of allSlides) {
          if (!wSlide || typeof (wSlide as { addText?: unknown }).addText !== 'function') continue;
          const ws = wSlide as {
            addImage?: (o: Record<string, unknown>) => void;
            addText: (t: string, o: Record<string, unknown>) => void;
          };
          if (logo && logoPlacement && typeof ws.addImage === 'function') {
            ws.addImage({
              data: logo.dataUri,
              x: logoPlacement.x,
              y: logoPlacement.y,
              w: logoPlacement.w,
              h: logoPlacement.h,
            });
          }
          const taglineW = 2.0;
          const taglineX = parseFloat((PPTX_W - taglineW - WM_MARGIN_X).toFixed(4));
          const taglineY = logoPlacement
            ? parseFloat((logoPlacement.y + logoPlacement.h + 0.03).toFixed(4))
            : parseFloat((PPTX_H - TAGLINE_H - WM_MARGIN_Y).toFixed(4));
          ws.addText('Made with Orbstera AI', {
            x: taglineX,
            y: taglineY,
            w: taglineW,
            h: TAGLINE_H,
            fontSize: 7,
            color: 'BBBBBB',
            align: 'right',
            bold: false,
            isTextBox: true,
          });
        }
      } catch (wmErr) {
        console.error('[export/pptx] Watermark injection skipped:', wmErr);
      }
    }

    // ── Serialise ─────────────────────────────────────────────────────────────
    const safeTitle = (title || 'presentation')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 60);

    const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    // ── Inject entrance animations via OOXML post-processing ─────────────────
    // Temporarily disabled injectAnimations because it causes file corruption (shape ID mismatches & XML schema violations)
    let finalBuffer = buffer;
    if (pptSlidesInfo.length > 0) {
      finalBuffer = await injectVideoAutoplay(finalBuffer);
    }

  if (jobId) {
    const client = getR2Client();
    const bucket = getR2BucketName();
    if (!client || !bucket) {
      throw new Error('Export storage (Cloudflare R2) is not configured');
    }
    const exportKey = `exports/${userId}/${jobId}.pptx`;
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: exportKey,
          Body: Buffer.from(finalBuffer),
          ContentType:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        }),
      );
      await updateJobRecord(jobId, {
        status: 'completed',
        progress: 100,
        result: { exportKey, fileName: `${safeTitle}.pptx` },
      });
      return { mode: 'job', exportKey, fileName: `${safeTitle}.pptx` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PPTX upload failed';
      await failExportJob(jobId, msg);
      throw e;
    }
  }

  return { mode: 'download', buffer: finalBuffer, fileName: `${safeTitle}.pptx` };
  } catch (e) {
    if (jobId) {
      const msg = e instanceof Error ? e.message : 'PPTX export failed';
      await failExportJob(jobId, msg);
    }
    throw e;
  }
}



// ── Post-process: Inject OOXML animations into the pptx buffer ────────────────
async function injectAnimations(
  buffer: ArrayBuffer,
  pptSlidesInfo: { bgShapeCount: number; exportedElements: SlideElement[] }[],
): Promise<ArrayBuffer> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);

    for (let si = 0; si < pptSlidesInfo.length; si++) {
      const slideFile = zip.file(`ppt/slides/slide${si + 1}.xml`);
      if (!slideFile) continue;

      let xml = await slideFile.async('string');

      const shapeIdMap = new Map<string, number>();
      const cNvPrRe = /<p:cNvPr\s([^>]+)>/g;
      let m;
      while ((m = cNvPrRe.exec(xml)) !== null) {
        const attrs = m[1];
        const idM   = /\bid="(\d+)"/.exec(attrs);
        const nameM = /\bname="([^"]+)"/.exec(attrs);
        if (idM && nameM) {
          const id   = parseInt(idM[1], 10);
          const name = nameM[1];
          if (id > 1 && name) shapeIdMap.set(name, id);
        }
      }

      if (shapeIdMap.size === 0) continue;
      const meta = pptSlidesInfo[si];
      if (!meta) continue;
      const { exportedElements } = meta;

      const hasAnyAnim = exportedElements.some(el => el.animation && el.animation.entrance !== 'none');
      if (!hasAnyAnim) continue;

      interface AnimEntry { spId: number; entrance: string; delay: number; duration: number }
      const animEntries: AnimEntry[] = [];
      exportedElements.forEach((el, i) => {
        const anim = el.animation;
        if (!anim || anim.entrance === 'none') return;
        const spId = shapeIdMap.get(el.id);
        if (!spId) return;
        animEntries.push({
          spId,
          entrance: anim.entrance,
          delay:    anim.delay    ?? i * 150,
          duration: anim.duration ?? 600,
        });
      });
      if (animEntries.length === 0) continue;

      let nodeId = 100;
      const getId = () => nodeId++;
      const rootId   = getId();
      const seqId    = getId();

      const parBlocks = animEntries.map((entry) => {
        const preset   = getPresetId(entry.entrance);
        const subtype  = getPresetSubtype(entry.entrance);
        const subtypeAttr = subtype ? ` presetSubtype="${subtype}"` : '';
        const dur      = Math.round(Math.max(100, entry.duration));
        const delayEmu = Math.round(entry.delay) * 100_000;
        const parId    = getId();
        const setId    = getId();
        const animId   = getId();
        return `<p:par><p:cTn id="${parId}" presetID="${preset}"${subtypeAttr} presetClass="entr" grpId="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="${delayEmu}"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="${setId}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="${entry.spId}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${animId}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${entry.spId}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
      }).join('');

      const bldList = animEntries.map((entry, i) =>
        `<p:bldP spid="${entry.spId}" grpId="${i}" uiExpand="0" build="p"/>`
      ).join('');

      const timingXml =
        `<p:timing><p:tnLst><p:par><p:cTn id="${rootId}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${parBlocks}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn/></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn/></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>${bldList}</p:bldLst></p:timing>`;

      if (xml.includes('<p:timing>')) {
        xml = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, timingXml);
      } else if (xml.includes('<p:extLst>')) {
        xml = xml.replace('<p:extLst>', `${timingXml}<p:extLst>`);
      } else if (xml.includes('</p:transition>')) {
        xml = xml.replace('</p:transition>', `</p:transition>${timingXml}`);
      } else {
        xml = xml.replace('</p:cSld>', `</p:cSld>${timingXml}`);
      }
      zip.file(`ppt/slides/slide${si + 1}.xml`, xml);
    }
    return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  } catch (e) {
    console.error('[PPTX] Animation injection failed:', e);
    return buffer;
  }
}

// ── Post-process: Make embedded MP4 videos autoplay on slide entry ────────────────
async function injectVideoAutoplay(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);

    const slideNames = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

    for (const slideFileName of slideNames) {
      const slideFile = zip.file(slideFileName);
      if (!slideFile) continue;

      let xml = await slideFile.async('string');

      const videoShapeIds: number[] = [];
      const picRe = /<p:pic>[\s\S]*?<\/p:pic>/g;
      let picM;
      while ((picM = picRe.exec(xml)) !== null) {
        if (picM[0].includes('<a:videoFile')) {
          const idM = /id="(\d+)"/.exec(picM[0]);
          if (idM) videoShapeIds.push(parseInt(idM[1], 10));
        }
      }
      if (videoShapeIds.length === 0) continue;

      let maxId = 0;
      for (const m of xml.matchAll(/ id="(\d+)"/g)) {
        const n = parseInt(m[1], 10);
        if (n > maxId) maxId = n;
      }
      let nid = Math.max(maxId + 50, 500);
      const nxt = () => nid++;

      const buildVideoPar = (spId: number) => {
        const [a, b, c, d] = [nxt(), nxt(), nxt(), nxt()];
        return (
          `<p:par><p:cTn id="${a}" fill="hold" nodeType="withEffect">` +
            `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` +
            `<p:childTnLst>` +
              `<p:par><p:cTn id="${b}" fill="hold">` +
                `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` +
                `<p:childTnLst>` +
                  `<p:par><p:cTn id="${c}" dur="indefinite" fill="hold">` +
                    `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` +
                    `<p:childTnLst>` +
                      `<p:video><p:cMediaNode vol="80000">` +
                        `<p:cTn id="${d}" dur="indefinite" fill="hold" display="0" repeatCount="indefinite"/>` +
                        `<p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>` +
                      `</p:cMediaNode></p:video>` +
                    `</p:childTnLst>` +
                  `</p:cTn></p:par>` +
                `</p:childTnLst>` +
              `</p:cTn></p:par>` +
            `</p:childTnLst>` +
          `</p:cTn></p:par>`
        );
      };

      const videoPars = videoShapeIds.map(buildVideoPar).join('');
      let injected = false;
      if (xml.includes('nodeType="mainSeq"')) {
        xml = xml.replace(/(nodeType="mainSeq"[^>]*><p:childTnLst>)/, `$1${videoPars}`);
        // We do NOT inject <p:bldP> for videos. Build paragraphs are for text animations.
        // PowerPoint silently rejects autoplay if media elements have bogus paragraph builds!
        injected = true;
      }

      if (!injected) {
        let seqId = nxt();
        let timingXml = 
          `<p:timing><p:tnLst><p:par><p:cTn id="${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn><p:cTnRef id="${seqId}"/></p:tn></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn><p:cTnRef id="${seqId}"/></p:tn></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
        if (xml.includes('<p:extLst>')) {
          xml = xml.replace('<p:extLst>', `${timingXml}<p:extLst>`);
        } else if (xml.includes('</p:transition>')) {
          xml = xml.replace('</p:transition>', `</p:transition>${timingXml}`);
        } else {
          xml = xml.replace('</p:cSld>', `</p:cSld>${timingXml}`);
        }
      }
      zip.file(slideFileName, xml);
    }
    return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  } catch (err) {
    console.error('[pptx-export] injectVideoAutoplay failed', err);
    return buffer;
  }
}

function getPresetId(entrance: string): number {
  const map: Record<string, number> = {
    none: 10, fadeSlideUp: 2, fadeSlideLeft: 2, slideRight: 2,
    fadeIn: 10, zoomIn: 18, elasticScale: 18, reveal: 37,
    blurIn: 10, glassBlur: 10, glitch: 2, flipIn: 8,
    bounceIn: 38, parallaxDrift: 2, verticalRise: 2, horizontalReveal: 2,
    depthRise: 18, floatGentle: 10, scaleSoft: 18, morphBlend: 10,
    cinematicImageZoom: 18, typewriterWords: 10, staggerLines: 2,
  };
  return map[entrance] || 10;
}

function getPresetSubtype(entrance: string): number | undefined {
  const map: Record<string, number> = {
    fadeSlideUp: 8, verticalRise: 8, staggerLines: 8,
    fadeSlideLeft: 2, parallaxDrift: 2, horizontalReveal: 2, glitch: 2,
    slideRight: 4, zoomIn: 1, elasticScale: 1, depthRise: 1,
    scaleSoft: 1, cinematicImageZoom: 1,
  };
  return map[entrance];
}
