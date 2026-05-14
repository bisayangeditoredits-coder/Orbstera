import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runPresentationSaveFromParsed } from '@/lib/server/run-presentation-save';
import { isValidDeckStagingKey } from '@/lib/server/deck-staging-key';

export const maxDuration = 60;

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
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

const PRIVATE_CACHE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' } as const;

async function getAuthUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * Reads staged deck bytes from R2 (from presign-deck-upload + client PUT), runs the normal save pipeline, deletes staging.
 */
export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const body = await req.json().catch(() => ({}));
  const stagingKey = body.stagingKey;
  const gzip = Boolean(body.gzip);

  if (!isValidDeckStagingKey(user.id, stagingKey)) {
    return NextResponse.json({ error: 'Invalid staging key' }, { status: 400 });
  }

  let raw: Buffer;
  try {
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: stagingKey }));
    raw = await streamToBuffer(obj.Body);
  } catch (e: unknown) {
    console.error('[complete-deck-upload] GetObject:', e);
    return NextResponse.json({ error: 'Staging object not found' }, { status: 404 });
  }

  let jsonStr: string;
  try {
    jsonStr = gzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  } catch (e) {
    console.error('[complete-deck-upload] gunzip:', e);
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })).catch(() => {});
    return NextResponse.json({ error: 'Invalid compressed payload' }, { status: 400 });
  }

  let presentation: Record<string, unknown>;
  try {
    presentation = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })).catch(() => {});
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await runPresentationSaveFromParsed(s3Client, bucket, user.id, presentation);

    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })).catch((err) => {
      console.error('[complete-deck-upload] staging delete:', err);
    });

    if (!result.ok && result.reason === 'placeholder') {
      return NextResponse.json({ message: 'Placeholder skipped' }, { headers: PRIVATE_CACHE_HEADERS });
    }
    if (!result.ok && result.reason === 'conflict') {
      return NextResponse.json(
        { error: 'Save conflict', code: 'SAVE_CONFLICT', serverVersion: result.serverVersion },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        saveVersion: result.saveVersion,
        updatedAt: result.updatedAt,
      },
      { headers: PRIVATE_CACHE_HEADERS },
    );
  } catch (e) {
    console.error('[complete-deck-upload] save:', e);
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })).catch(() => {});
    return NextResponse.json({ error: 'Failed to save presentation' }, { status: 500 });
  }
}
