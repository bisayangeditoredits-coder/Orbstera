import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';

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

function safeDeckFolderId(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'deck';
  return raw.replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 120);
}

/**
 * Presigned PUT for a staging object holding raw deck JSON (optionally gzip).
 * Lets clients bypass Vercel ~4.5 MB request limits on POST /api/presentations.
 */
export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  const presentationId = safeDeckFolderId(body.presentationId);
  const gzip = Boolean(body.gzip);

  const stagingKey = `presentations/${user.id}/deck-staging/${presentationId}/${uuidv4()}.bin`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: stagingKey,
    ContentType: gzip ? 'application/gzip' : 'application/json',
  });

  const putUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return NextResponse.json(
    { putUrl, stagingKey },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
