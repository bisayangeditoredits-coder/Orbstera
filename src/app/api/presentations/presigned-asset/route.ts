import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { assertTrustedOrigin, untrustedOriginResponse } from '@/lib/auth/server';
import { getR2PublicBaseTrimmed } from '@/lib/r2-public-url';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';
import { PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

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

export const maxDuration = 30;
const MAX_BODY_BYTES = 8 * 1024;

/**
 * Returns a short-lived presigned PUT URL so the browser can upload large binaries
 * directly to R2 (avoids Next.js / CDN request body limits that cause HTTP 413).
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

  const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.value;
  const presentationId = typeof body.presentationId === 'string' && body.presentationId.trim()
    ? body.presentationId.trim()
    : 'unknown-deck';
  const mimeType = typeof body.mimeType === 'string' && body.mimeType.startsWith('image/')
    ? body.mimeType.split(';')[0].trim()
    : 'application/octet-stream';

  const ext = extFromMime(mimeType);
  const key = `presentations/${user.id}/deck-assets/${presentationId}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const putUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `${publicBase}/${key}`;

  return NextResponse.json({ putUrl, publicUrl, key }, { headers: PRIVATE_NO_STORE });
}
