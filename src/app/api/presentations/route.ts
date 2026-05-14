import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { deriveDeckIndexThumbFields } from '@/lib/deck-index-meta';

let s3Client: S3Client | null = null;
if (
  process.env.CLOUDFLARE_R2_ENDPOINT &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_SECRET_KEY
) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

async function streamToString(stream: any): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

async function putJsonWithRetry(
  client: S3Client,
  bucket: string,
  key: string,
  body: string,
): Promise<void> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket:      bucket,
          Key:         key,
          Body:        body,
          ContentType: 'application/json',
        }),
      );
      return;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 220 * (attempt + 1)));
    }
  }
  throw last;
}

const PRIVATE_CACHE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' } as const;

async function getAuthUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── GET /api/presentations — list all or fetch one by ?id= ─────────────────
export async function GET(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const prefix = `presentations/${user.id}`;

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: id ? `${prefix}/${id}.json` : `${prefix}/index.json`,
      })
    );
    const body = await streamToString(response.Body);
    return NextResponse.json(JSON.parse(body), { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return NextResponse.json(id ? null : [], { headers: PRIVATE_CACHE_HEADERS });
    }
    console.error('R2 Get Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// ── POST /api/presentations — save/update a presentation ───────────────────
export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prefix = `presentations/${user.id}`;

  try {
    const encoding = (req.headers.get('content-encoding') || '').toLowerCase();
    const raw = Buffer.from(await req.arrayBuffer());
    const jsonStr =
      encoding === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    const presentation = JSON.parse(jsonStr);
    
    // ─── VALIDATION ───
    // Prevent "Generating..." placeholders or empty decks from polluting the dashboard index.
    // This handles cases where the user quits before generation finishes.
    if (presentation.title === 'Generating...' || !presentation.slides || presentation.slides.length === 0) {
      return NextResponse.json({ message: 'Placeholder skipped' }, { headers: PRIVATE_CACHE_HEADERS });
    }

    if (!presentation.id)        presentation.id        = uuidv4();
    if (!presentation.createdAt) presentation.createdAt = new Date().toISOString();
    presentation.updatedAt = new Date().toISOString();
    presentation.userId    = user.id;

    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const deckKey = `${prefix}/${presentation.id}.json`;

    // ─── Optimistic concurrency (saveVersion) ───────────────────────────────
    let serverVersion = 0;
    try {
      const existingRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: deckKey }));
      const existing = JSON.parse(await streamToString(existingRes.Body));
      serverVersion = Number(existing.saveVersion) || 0;
    } catch (e: any) {
      if (e.name !== 'NoSuchKey') throw e;
    }
    const clientVersion = Number(presentation.saveVersion) || 0;
    if (serverVersion > 0 && clientVersion !== serverVersion) {
      return NextResponse.json(
        { error: 'Save conflict', code: 'SAVE_CONFLICT', serverVersion },
        { status: 409 },
      );
    }
    presentation.saveVersion = serverVersion + 1;

    // 1. Save full presentation JSON (retried)
    await putJsonWithRetry(s3Client, bucket, deckKey, JSON.stringify(presentation));

    // 2. Read → update → write index (retried; best-effort merge)
    let index: any[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        try {
          const res  = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/index.json` }));
          const body = await streamToString(res.Body);
          index = JSON.parse(body);
        } catch (e: any) {
          if (e.name !== 'NoSuchKey') throw e;
        }

        const thumb = deriveDeckIndexThumbFields(presentation as { slides?: unknown[] });

        const metadata = {
          id:          presentation.id,
          title:       presentation.title || 'Untitled Presentation',
          date:        presentation.updatedAt,
          createdAt:   presentation.createdAt,
          slidesCount: presentation.slides?.length || 0,
          theme:       presentation.theme || 'dark',
          colorPalette: presentation.colorPalette || ['#05050A', '#7B61FF', '#FFFFFF', '#A390FF'],
          subtitle:    presentation.slides?.[0]?.subtitle || '',
          ...thumb,
        };

        const existingIndex = index.findIndex((p: any) => p.id === presentation.id);
        if (existingIndex >= 0) index[existingIndex] = metadata;
        else index.unshift(metadata);

        await putJsonWithRetry(s3Client, bucket, `${prefix}/index.json`, JSON.stringify(index));
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: presentation.id,
        saveVersion: presentation.saveVersion,
        updatedAt: presentation.updatedAt,
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('R2 Save Error:', error);
    return NextResponse.json({ error: 'Failed to save presentation' }, { status: 500 });
  }
}

async function deleteDeckAssetsUnderPrefix(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<void> {
  let continuationToken: string | undefined;
  for (;;) {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    const keys = (list.Contents || []).map((o) => o.Key).filter((k): k is string => Boolean(k));
    if (keys.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
    if (!list.IsTruncated) break;
    continuationToken = list.NextContinuationToken;
  }
}

// ── DELETE /api/presentations?id= — remove a presentation ──────────────────
export async function DELETE(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const prefix = `presentations/${user.id}`;

  try {
    // Delete the presentation file
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key:    `${prefix}/${id}.json`,
    }));

    // Remove from index
    let index: any[] = [];
    try {
      const res  = await s3Client.send(new GetObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME, Key: `${prefix}/index.json` }));
      const body = await streamToString(res.Body);
      index = JSON.parse(body);
    } catch (e: any) { if (e.name !== 'NoSuchKey') throw e; }

    index = index.filter((p: any) => p.id !== id);

    await s3Client.send(new PutObjectCommand({
      Bucket:      process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key:         `${prefix}/index.json`,
      Body:        JSON.stringify(index),
      ContentType: 'application/json',
    }));

    try {
      await deleteDeckAssetsUnderPrefix(
        s3Client,
        process.env.CLOUDFLARE_R2_BUCKET_NAME,
        `${prefix}/deck-assets/${id}/`,
      );
    } catch (assetErr) {
      console.error('R2 deck-assets cleanup (non-fatal):', assetErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('R2 Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
  }
}

// ── PATCH /api/presentations — rename a presentation title ──────────────────
export async function PATCH(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const newTitle = typeof body.title === 'string' ? body.title.trim() : null;
  if (!newTitle) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const prefix = `presentations/${user.id}`;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const deckKey = `${prefix}/${id}.json`;

  try {
    // 1. Update deck JSON
    const deckRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: deckKey }));
    const deck = JSON.parse(await streamToString(deckRes.Body));
    deck.title = newTitle;
    deck.updatedAt = new Date().toISOString();
    await putJsonWithRetry(s3Client, bucket, deckKey, JSON.stringify(deck));

    // 2. Patch index.json entry
    let index: any[] = [];
    try {
      const idxRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/index.json` }));
      index = JSON.parse(await streamToString(idxRes.Body));
    } catch (e: any) { if (e.name !== 'NoSuchKey') throw e; }

    const idx = index.findIndex((p: any) => p.id === id);
    if (idx >= 0) {
      index[idx] = { ...index[idx], title: newTitle, date: deck.updatedAt };
    }
    await putJsonWithRetry(s3Client, bucket, `${prefix}/index.json`, JSON.stringify(index));

    return NextResponse.json({ success: true, title: newTitle, updatedAt: deck.updatedAt }, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }
    console.error('R2 Rename Error:', error);
    return NextResponse.json({ error: 'Failed to rename presentation' }, { status: 500 });
  }
}
