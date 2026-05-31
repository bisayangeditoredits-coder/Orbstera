import { NextResponse } from 'next/server';
import {
  listReferenceTemplates,
  resolveReferenceTemplateForPrompt,
} from '@/lib/reference-templates/load-server';
import type { ReferenceTemplateId } from '@/lib/reference-templates/catalog';
import { REFERENCE_TEMPLATE_CATALOG } from '@/lib/reference-templates/catalog';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const prompt = url.searchParams.get('prompt') || '';
    const layoutCategory = url.searchParams.get('layoutCategory') || undefined;
    const packId = url.searchParams.get('packId') as ReferenceTemplateId | null;

    if (!packId && !prompt.trim()) {
      return NextResponse.json({
        templates: listReferenceTemplates(),
        useReferenceTemplates: true,
      });
    }

    const resolved = packId
      ? await (async () => {
          const meta = REFERENCE_TEMPLATE_CATALOG.find((t) => t.id === packId);
          if (!meta) {
            return NextResponse.json({ error: 'Unknown template pack' }, { status: 404 });
          }
          const { loadReferenceTemplatePack } = await import('@/lib/reference-templates/load-server');
          return loadReferenceTemplatePack(packId);
        })()
      : await resolveReferenceTemplateForPrompt(prompt, layoutCategory);

    if (resolved instanceof NextResponse) return resolved;

    return NextResponse.json({
      packId: resolved.packId,
      slideCount: resolved.slides.length,
      slides: resolved.slides,
    });
  } catch (e) {
    console.error('[reference-templates]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load reference templates' },
      { status: 500 },
    );
  }
}
