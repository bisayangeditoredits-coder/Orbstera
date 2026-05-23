import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';
import { PRIVATE_IMMUTABLE_ASSET } from '@/lib/http/cache-headers';

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

async function streamToBuffer(stream: AsyncIterable<Uint8Array | Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Authenticated GET of an object under the caller's `presentations/{userId}/` prefix.
 * Used by the editor so slide images work without a public R2 bucket.
 */
export async function GET(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'default');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const rawKey = searchParams.get('key');
  if (!rawKey || rawKey.includes('..')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const prefix = `presentations/${user.id}/`;
  if (!key.startsWith(prefix)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  try {
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buf = await streamToBuffer(obj.Body as AsyncIterable<Uint8Array | Buffer>);
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Asset too large' }, { status: 413 });
    }
    const ct = obj.ContentType || 'application/octet-stream';
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': ct,
        ...PRIVATE_IMMUTABLE_ASSET,
      },
    });
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: unknown }).name) : '';
    if (name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[read-asset]', e);
    return NextResponse.json({ error: 'Failed to read asset' }, { status: 500 });
  }
}
