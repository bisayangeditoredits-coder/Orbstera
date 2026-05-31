import { NextResponse } from 'next/server';
import { readReferenceTemplateAsset } from '@/lib/reference-templates/load-server';
import type { ReferenceTemplateId } from '@/lib/reference-templates/catalog';
import { REFERENCE_TEMPLATE_CATALOG } from '@/lib/reference-templates/catalog';

export const runtime = 'nodejs';

type RouteContext = { params: { pack: string; path: string[] } };

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const pack = ctx.params.pack as ReferenceTemplateId;
    if (!REFERENCE_TEMPLATE_CATALOG.some((t) => t.id === pack)) {
      return NextResponse.json({ error: 'Unknown template pack' }, { status: 404 });
    }

    const assetPath = (ctx.params.path || []).join('/');
    const asset = await readReferenceTemplateAsset(pack, assetPath);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(asset.body), {
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    console.error('[reference-templates/assets]', e);
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 500 });
  }
}
