import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { assertTrustedOrigin, untrustedOriginResponse } from '@/lib/auth/server';
import { enforceContentLengthLimit } from '@/lib/http/request-body-limit';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';
import { getR2PublicBaseTrimmed } from '@/lib/r2-public-url';

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

function extFromMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/svg+xml') return 'svg';
  return 'bin';
}

const MAX_BYTES = 32 * 1024 * 1024;
export const maxDuration = 60;
const MAX_MULTIPART_BYTES = 35 * 1024 * 1024;

/**
 * Same-origin upload of a deck image to R2 (server PutObject).
 * Use when browser presigned PUT to R2 fails (e.g. missing bucket CORS).
 */
export async function POST(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const publicBase = getR2PublicBaseTrimmed();
  if (!publicBase) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL so saved decks can load images on other devices.' },
      { status: 501 },
    );
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const sizeCheck = enforceContentLengthLimit(req, MAX_MULTIPART_BYTES);
  if (sizeCheck) return sizeCheck;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read upload body.' }, { status: 400 });
  }

  const presentationIdRaw = form.get('presentationId');
  const presentationId =
    typeof presentationIdRaw === 'string' && presentationIdRaw.trim()
      ? presentationIdRaw.trim()
      : 'unknown-deck';

  const mimeField = form.get('mimeType');
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds maximum size of ${Math.round(MAX_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    );
  }

  let mimeType =
    typeof mimeField === 'string' && mimeField.startsWith('image/')
      ? mimeField.split(';')[0].trim()
      : file.type && file.type.startsWith('image/')
        ? file.type.split(';')[0].trim()
        : '';
  if (!mimeType) {
    return NextResponse.json({ error: 'Expected an image mime type' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(mimeType);
  const key = `presentations/${user.id}/deck-assets/${presentationId}/${uuidv4()}.${ext}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        Body: buf,
        ContentType: mimeType,
      }),
    );
  } catch (e) {
    console.error('[upload-asset] R2 PutObject:', e);
    return NextResponse.json({ error: 'Failed to store image' }, { status: 500 });
  }

  const publicUrl = `${publicBase}/${key}`;
  return NextResponse.json(
    { publicUrl, key },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
