import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    return NextResponse.json(JSON.parse(body));
  } catch (error: any) {
    if (error.name === 'NoSuchKey') return NextResponse.json(id ? null : []);
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
    const presentation = await req.json();
    
    // ─── VALIDATION ───
    // Prevent "Generating..." placeholders or empty decks from polluting the dashboard index.
    // This handles cases where the user quits before generation finishes.
    if (presentation.title === 'Generating...' || !presentation.slides || presentation.slides.length === 0) {
      return NextResponse.json({ message: 'Placeholder skipped' });
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

        const metadata = {
          id:          presentation.id,
          title:       presentation.title || 'Untitled Presentation',
          date:        presentation.updatedAt,
          createdAt:   presentation.createdAt,
          slidesCount: presentation.slides?.length || 0,
          theme:       presentation.theme || 'dark',
          colorPalette: presentation.colorPalette || ['#05050A', '#7B61FF', '#FFFFFF', '#A390FF'],
          subtitle:    presentation.slides?.[0]?.subtitle || '',
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

    return NextResponse.json({
      success: true,
      id: presentation.id,
      saveVersion: presentation.saveVersion,
      updatedAt: presentation.updatedAt,
    });
  } catch (error) {
    console.error('R2 Save Error:', error);
    return NextResponse.json({ error: 'Failed to save presentation' }, { status: 500 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('R2 Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
  }
}
