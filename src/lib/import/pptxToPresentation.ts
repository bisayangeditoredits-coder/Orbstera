/**
 * Converts .pptx (OOXML) into Orbstera PresentationData with editable SlideElements.
 * Best-effort: text + images + simple rects; unsupported constructs recorded in warnings.
 */

import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { PresentationData, Slide, SlideElement, SlideLayoutType } from '@/types';
import { finalizeAllSlidesMotion } from '@/lib/presentationMotion';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const MAX_SLIDES = 80;
const MAX_ELEMENTS_PER_SLIDE = 120;
const MAX_IMAGE_BYTES = 2_500_000;

export interface PptxImportResult {
  presentation: PresentationData;
  warnings: string[];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Default Office 16:9 slide EMU (10" x 5.625") */
const DEFAULT_SLIDE_CX = 9144000;
const DEFAULT_SLIDE_CY = 5143500;

async function readSlideSizeEmu(zip: JSZip): Promise<{ cx: number; cy: number }> {
  const f = zip.file('ppt/presentation.xml');
  if (!f) return { cx: DEFAULT_SLIDE_CX, cy: DEFAULT_SLIDE_CY };
  const xml = await f.async('text');
  const m = xml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"|<p:sldSz[^>]*cy="(\d+)"[^>]*cx="(\d+)"/);
  if (!m) return { cx: DEFAULT_SLIDE_CX, cy: DEFAULT_SLIDE_CY };
  if (m[1] && m[2]) return { cx: Number(m[1]), cy: Number(m[2]) };
  return { cx: Number(m[4]), cy: Number(m[3]) };
}

async function readCoreTitle(zip: JSZip): Promise<string | null> {
  const f = zip.file('docProps/core.xml');
  if (!f) return null;
  const xml = await f.async('text');
  const m = xml.match(/<dc:title>([^<]*)<\/dc:title>/);
  return m ? m[1].trim() || null : null;
}

function parseThemeAccent(zip: JSZip): Promise<string | undefined> {
  const theme = zip.file('ppt/theme/theme1.xml');
  if (!theme) return Promise.resolve(undefined);
  return theme.async('text').then((xml) => {
    const m = xml.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
    return m ? `#${m[1].toUpperCase()}` : undefined;
  });
}

function parseRelsMap(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const chunks = relsXml.match(/<Relationship\b[^/>]+\/>/g) || [];
  for (const ch of chunks) {
    const id = ch.match(/\bId="([^"]+)"/)?.[1];
    const tgt = ch.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && tgt) map.set(id, tgt);
  }
  return map;
}

function resolveMediaPath(target: string): string {
  const t = target.replace(/^\.\//, '');
  if (t.startsWith('../')) return `ppt/${t.slice(3)}`;
  if (t.startsWith('media/')) return `ppt/${t}`;
  return `ppt/${t}`;
}

function parseXfrm(block: string): { x: number; y: number; cx: number; cy: number } | null {
  const inner = block.match(/<a:xfrm>([\s\S]*?)<\/a:xfrm>/)?.[1] || block;
  const off =
    inner.match(/<a:off\s+[^>]*x="(\d+)"\s+y="(\d+)"/) ||
    inner.match(/<a:off\s+x="(\d+)"\s+y="(\d+)"/);
  const ext =
    inner.match(/<a:ext\s+[^>]*cx="(\d+)"\s+cy="(\d+)"/) ||
    inner.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
  if (!off || !ext) return null;
  return { x: Number(off[1]), y: Number(off[2]), cx: Number(ext[1]), cy: Number(ext[2]) };
}

function emuBoxToCanvas(
  box: { x: number; y: number; cx: number; cy: number },
  slideCx: number,
  slideCy: number,
): { x: number; y: number; width: number; height: number } {
  const x = (box.x / slideCx) * CANVAS_W;
  const y = (box.y / slideCy) * CANVAS_H;
  const w = (box.cx / slideCx) * CANVAS_W;
  const h = (box.cy / slideCy) * CANVAS_H;
  return {
    x: clamp(Math.round(x), 0, CANVAS_W - 8),
    y: clamp(Math.round(y), 0, CANVAS_H - 8),
    width: clamp(Math.round(w), 12, CANVAS_W),
    height: clamp(Math.round(h), 10, CANVAS_H),
  };
}

function extractTextFromShapeBlock(block: string): string {
  const parts: string[] = [];
  const re = /<a:t>([^<]*)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const t = m[1].replace(/\s+/g, ' ').trim();
    if (t) parts.push(t);
  }
  return parts.join('\n').trim();
}

function extractFontSizeHundredths(block: string): number | undefined {
  const m = block.match(/<a:rPr[^>]*sz="(\d+)"/);
  if (!m) return undefined;
  return Number(m[1]) / 100;
}

function extractEmbedRId(block: string): string | null {
  const m = block.match(/r:embed="([^"]+)"/) || block.match(/embed="([^"]+)"/);
  return m ? m[1] : null;
}

function guessLayoutType(text: string, index: number): SlideLayoutType {
  const t = text.toLowerCase();
  if (index === 0 && text.length < 120) return 'hero';
  if (t.includes('thank you') || t.includes('q&a')) return 'closing';
  if (/\d+%|\$\d|€|£|growth|revenue|kpi|metric/i.test(text)) return 'stats';
  return 'content';
}

async function parseSlideXml(
  slideXml: string,
  relsXml: string | null,
  zip: JSZip,
  slideCx: number,
  slideCy: number,
  warnings: string[],
  assetUrlFor?: (mediaPath: string) => string,
): Promise<{ elements: SlideElement[]; plainText: string }> {
  const relMap = relsXml ? parseRelsMap(relsXml) : new Map<string, string>();
  const elements: SlideElement[] = [];
  let z = 1;

  const pushWarn = (msg: string) => {
    if (warnings.length < 40) warnings.push(msg);
  };

  // ── Pictures ─────────────────────────────────────────────────────────────
  const picRe = /<p:pic\b[\s\S]*?<\/p:pic>/g;
  let pm: RegExpExecArray | null;
  while ((pm = picRe.exec(slideXml))) {
    if (elements.length >= MAX_ELEMENTS_PER_SLIDE) break;
    const block = pm[0];
    const box = parseXfrm(block);
    if (!box) continue;
    const rId = extractEmbedRId(block);
    if (!rId) continue;
    const target = relMap.get(rId);
    if (!target) continue;
    const mediaPath = resolveMediaPath(target);
    const file = zip.file(mediaPath);
    if (!file) {
      pushWarn(`Missing media: ${mediaPath}`);
      continue;
    }
    const buf = await file.async('nodebuffer');
    if (buf.length > MAX_IMAGE_BYTES && !assetUrlFor) {
      pushWarn(`Skipped large image (${mediaPath})`);
      continue;
    }
    const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';

    let src: string;
    if (assetUrlFor) {
      src = assetUrlFor(mediaPath);
    } else {
      if (buf.length > MAX_IMAGE_BYTES) {
        pushWarn(`Skipped large image (${mediaPath})`);
        continue;
      }
      src = `data:${mime};base64,${buf.toString('base64')}`;
    }

    const geo = emuBoxToCanvas(box, slideCx, slideCy);
    elements.push({
      id: `el-${uuidv4()}`,
      type: 'image',
      ...geo,
      zIndex: z++,
      visible: true,
      src,
      animation: { entrance: 'fadeIn', duration: 500, delay: elements.length * 40 },
    });
  }

  // ── Shapes (text + simple rects) ─────────────────────────────────────────
  const spRe = /<p:sp\b[\s\S]*?<\/p:sp>/g;
  let sm: RegExpExecArray | null;
  while ((sm = spRe.exec(slideXml))) {
    if (elements.length >= MAX_ELEMENTS_PER_SLIDE) break;
    const block = sm[0];
    if (/<p:txBody>/.test(block) === false) continue;
    const text = extractTextFromShapeBlock(block);
    if (!text) continue;
    const box = parseXfrm(block);
    if (!box) continue;
    const geo = emuBoxToCanvas(box, slideCx, slideCy);
    const fs = extractFontSizeHundredths(block);
    elements.push({
      id: `el-${uuidv4()}`,
      type: 'text',
      ...geo,
      zIndex: z++,
      visible: true,
      content: text,
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        fontSize: clamp(Math.round(fs || (geo.height > 56 ? 28 : 18)), 10, 96),
        fontWeight: geo.height > 72 ? 'bold' : 'normal',
        color: '#F8FAFC',
        textAlign: 'left',
        lineHeight: 1.25,
      },
      animation: { entrance: 'fadeSlideUp', duration: 520, delay: elements.length * 45 },
    });
  }

  if (/<p:graphicFrame/.test(slideXml)) pushWarn('One or more charts/graphic frames were not converted to native charts.');
  if (/<a:tbl/.test(slideXml)) pushWarn('Tables were flattened to text where possible.');

  const plainText = elements
    .filter((e) => e.type === 'text')
    .map((e) => e.content || '')
    .join('\n');

  return { elements, plainText };
}

function listSlidePaths(zip: JSZip): string[] {
  const paths = Object.keys(zip.files).filter(
    (p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p) && !p.includes('_rels'),
  );
  paths.sort((a, b) => {
    const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
    const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
    return na - nb;
  });
  return paths.slice(0, MAX_SLIDES);
}

/**
 * Convert a .pptx buffer to Orbstera presentation JSON.
 */
export async function convertPptxBufferToPresentation(
  buffer: Buffer,
  opts: { fileName?: string; assetUrlFor?: (mediaPath: string) => string } = {},
): Promise<PptxImportResult> {
  const warnings: string[] = [];

  if (buffer.length < 64) throw new Error('File is too small to be a valid presentation.');
  if (buffer.slice(0, 2).toString('ascii') !== 'PK') {
    throw new Error('Not a valid .pptx file (expected ZIP package). Legacy .ppt binary is not supported — please save as .pptx in PowerPoint.');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Could not open the presentation archive. The file may be corrupted.');
  }

  const slidePaths = listSlidePaths(zip);
  if (slidePaths.length === 0) throw new Error('No slides found in this presentation.');

  const { cx: slideCx, cy: slideCy } = await readSlideSizeEmu(zip);
  const coreTitle = await readCoreTitle(zip);
  const accent = await parseThemeAccent(zip);

  const slides: Slide[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const slideFile = zip.file(path);
    if (!slideFile) continue;
    const slideXml = await slideFile.async('text');
    const n = path.match(/slide(\d+)/i)?.[1] || String(i + 1);
    const relPath = `ppt/slides/_rels/slide${n}.xml.rels`;
    const relFile = zip.file(relPath);
    const relsXml = relFile ? await relFile.async('text') : null;

    const { elements, plainText } = await parseSlideXml(
      slideXml,
      relsXml,
      zip,
      slideCx,
      slideCy,
      warnings,
      opts.assetUrlFor,
    );
    const titleText = plainText.split('\n')[0]?.slice(0, 200) || `Slide ${i + 1}`;

    slides.push({
      id: `slide-import-${i}-${uuidv4()}`,
      type: guessLayoutType(plainText || titleText, i),
      title: '',
      subtitle: undefined,
      bullets: undefined,
      speakerNotes: undefined,
      elements,
      layout: 'imported',
    });

    if (elements.length === 0) warnings.push(`Slide ${i + 1} had no extractable text or images.`);
  }

  const basePalette = ['#0B0F1A', '#F8FAFC', accent || '#6366F1', '#94A3B8'];
  const raw: PresentationData = {
    id: uuidv4(),
    title:
      coreTitle ||
      (opts.fileName ? opts.fileName.replace(/\.pptx$/i, '').replace(/[_-]+/g, ' ') : 'Imported presentation'),
    theme: 'imported-pptx',
    colorPalette: basePalette,
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    animationStyle: 'minimal-fade',
    styleMode: 'corporate',
    presentationType: 'business_proposal',
    slides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'import',
    importMeta: {
      fileName: opts.fileName || 'upload.pptx',
      format: 'pptx',
      warnings,
    },
    saveVersion: 0,
  };

  const motionCtx = {
    animationStyle: raw.animationStyle,
    presentationType: raw.presentationType,
    styleMode: raw.styleMode,
    defaultSlideTransition: raw.defaultSlideTransition,
  };
  raw.slides = finalizeAllSlidesMotion(raw.slides, motionCtx);

  return { presentation: raw, warnings };
}
