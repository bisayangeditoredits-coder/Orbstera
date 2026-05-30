import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import type { Slide } from '@/types';
import { convertPptxBufferToPresentation } from '@/lib/import/pptxToPresentation';
import {
  REFERENCE_TEMPLATE_CATALOG,
  type ReferenceTemplateId,
  selectReferenceTemplate,
} from './catalog';

const REFERENCE_DIR = path.join(process.cwd(), 'reference-templates');

type CachedPack = {
  slides: Slide[];
  loadedAt: number;
};

const packCache = new Map<ReferenceTemplateId, CachedPack>();
const zipCache = new Map<ReferenceTemplateId, JSZip>();

function assetUrlFor(packId: ReferenceTemplateId, mediaPath: string): string {
  const normalized = mediaPath.replace(/^ppt\//, '');
  return `/api/reference-templates/assets/${packId}/${normalized}`;
}

async function readZipBuffer(packId: ReferenceTemplateId): Promise<Buffer> {
  const meta = REFERENCE_TEMPLATE_CATALOG.find((t) => t.id === packId);
  if (!meta) throw new Error(`Unknown reference template: ${packId}`);
  const zipPath = path.join(REFERENCE_DIR, meta.zipFile);
  try {
    return await fs.readFile(zipPath);
  } catch {
    throw new Error(
      `Reference template "${packId}" not found at ${zipPath}. Add ${meta.zipFile} under reference-templates/.`,
    );
  }
}

export async function getReferenceTemplateZip(packId: ReferenceTemplateId): Promise<JSZip> {
  const cached = zipCache.get(packId);
  if (cached) return cached;
  const buf = await readZipBuffer(packId);
  const zip = await JSZip.loadAsync(buf);
  zipCache.set(packId, zip);
  return zip;
}

export async function loadReferenceTemplatePack(
  packId: ReferenceTemplateId,
): Promise<{ packId: ReferenceTemplateId; slides: Slide[] }> {
  const hit = packCache.get(packId);
  if (hit) return { packId, slides: hit.slides };

  const buf = await readZipBuffer(packId);
  const { presentation } = await convertPptxBufferToPresentation(buf, {
    fileName: `${packId}.pptx`,
    assetUrlFor: (mediaPath) => assetUrlFor(packId, mediaPath),
  });

  const slides = presentation.slides.map((s) => ({
    ...s,
    title: '',
    subtitle: undefined,
    bullets: undefined,
  }));

  packCache.set(packId, { slides, loadedAt: Date.now() });
  return { packId, slides };
}

export async function resolveReferenceTemplateForPrompt(
  prompt: string,
  layoutCategory?: string,
): Promise<{ packId: ReferenceTemplateId; slides: Slide[] }> {
  const packId = selectReferenceTemplate(prompt, layoutCategory);
  return loadReferenceTemplatePack(packId);
}

export function listReferenceTemplates() {
  return REFERENCE_TEMPLATE_CATALOG.map(({ id, label, description }) => ({ id, label, description }));
}

export async function readReferenceTemplateAsset(
  packId: ReferenceTemplateId,
  assetPath: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const zip = await getReferenceTemplateZip(packId);
  const safe = assetPath.replace(/\\/g, '/').replace(/\.\./g, '');
  const fullPath = safe.startsWith('ppt/') ? safe : `ppt/${safe}`;
  const file = zip.file(fullPath);
  if (!file) return null;
  const body = Buffer.from(await file.async('nodebuffer'));
  const ext = fullPath.split('.').pop()?.toLowerCase() || 'png';
  const contentType =
    ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'gif'
        ? 'image/gif'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/png';
  return { body, contentType };
}
