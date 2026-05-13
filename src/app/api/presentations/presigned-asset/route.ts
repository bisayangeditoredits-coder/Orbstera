import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createServerClient } from '@supabase/ssr';
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
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

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

function extFromMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/svg+xml') return 'svg';
  return 'bin';
}

/**
 * Returns a short-lived presigned PUT URL so the browser can upload large binaries
 * directly to R2 (avoids Next.js / CDN request body limits that cause HTTP 413).
 */
export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const publicBase = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '');
  if (!publicBase) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL so saved decks can load images on other devices.' },
      { status: 501 },
    );
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
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

  return NextResponse.json({ putUrl, publicUrl, key }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
