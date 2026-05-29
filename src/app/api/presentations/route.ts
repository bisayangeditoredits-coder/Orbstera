import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { runPresentationSaveFromParsed } from '@/lib/server/run-presentation-save';
import { readIndexMeta, writeIndexWithMeta } from '@/lib/server/r2-index';
import {
  assertTrustedOrigin,
  getApiUser,
  PRIVATE_API_HEADERS,
  untrustedOriginResponse,
} from '@/lib/auth/server';
import { requireApiUserWithRateLimit } from '@/lib/auth/require-api-route';
import {
  enforceApiIpRateLimit,
  requireRateLimitInfrastructure,
} from '@/lib/rate-limit-server';
import {
  readArrayBufferWithLimit,
  readJsonBodyWithLimit,
} from '@/lib/http/request-body-limit';

export const maxDuration = 120;
const MAX_PRESENTATION_POST_BYTES = 25 * 1024 * 1024;
const MAX_PRESENTATION_PATCH_BYTES = 512 * 1024;

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60',
} as const;

function isPublicShareAccess(shareAccess: unknown): boolean {
  return shareAccess === 'public_view';
}

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

const PRIVATE_CACHE_HEADERS = PRIVATE_API_HEADERS;

// ── GET /api/presentations — list all or fetch one by ?id= ─────────────────
export async function GET(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const ownerParam = searchParams.get('owner');

  if (id) {
    const sessionUser = await getApiUser();
    const isOwnerRequest = sessionUser && (!ownerParam || ownerParam === sessionUser.id);

    if (isOwnerRequest && sessionUser) {
      const auth = await requireApiUserWithRateLimit(req, 'default');
      if ('response' in auth) return auth.response;

      const prefix = `presentations/${auth.user.id}`;
      try {
        const response = await s3Client.send(
          new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/${id}.json` }),
        );
        const body = await streamToString(response.Body);
        return NextResponse.json(JSON.parse(body), { headers: PRIVATE_CACHE_HEADERS });
      } catch (error: any) {
        if (error.name === 'NoSuchKey') {
          return NextResponse.json(null, { headers: PRIVATE_CACHE_HEADERS });
        }
        console.error('R2 Get Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
      }
    }

    const ownerId = ownerParam?.trim();
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Missing owner for public fetch' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS },
      );
    }

    const infra = requireRateLimitInfrastructure();
    if (infra) return infra;

    const ipLimited = await enforceApiIpRateLimit(req, 'default');
    if (ipLimited) return ipLimited;

    const prefix = `presentations/${ownerId}`;
    try {
      const response = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/${id}.json` }),
      );
      const body = await streamToString(response.Body);
      const deck = JSON.parse(body) as { shareAccess?: string };
      if (!isPublicShareAccess(deck.shareAccess)) {
        return NextResponse.json(
          { error: 'This presentation is private' },
          { status: 403, headers: PRIVATE_CACHE_HEADERS },
        );
      }
      return NextResponse.json(deck, { headers: PUBLIC_CACHE_HEADERS });
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return NextResponse.json(null, { headers: PRIVATE_CACHE_HEADERS });
      }
      console.error('R2 Public Get Error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
  }

  const auth = await requireApiUserWithRateLimit(req, 'default');
  if ('response' in auth) return auth.response;
  const user = auth.user;
  const prefix = `presentations/${user.id}`;

  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/index.json` }),
    );
    const body = await streamToString(response.Body);
    return NextResponse.json(JSON.parse(body), { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return NextResponse.json([], { headers: PRIVATE_CACHE_HEADERS });
    }
    console.error('R2 Get Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// ── POST /api/presentations — save/update a presentation ───────────────────
export async function POST(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  try {
    const encoding = (req.headers.get('content-encoding') || '').toLowerCase();
    const rawResult = await readArrayBufferWithLimit(req, MAX_PRESENTATION_POST_BYTES);
    if (!rawResult.ok) return rawResult.response;
    const raw = Buffer.from(rawResult.buffer);
    const jsonStr =
      encoding === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    const presentation = JSON.parse(jsonStr) as Record<string, unknown>;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const result = await runPresentationSaveFromParsed(s3Client, bucket, user.id, presentation);

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

// ── DELETE /api/presentations?id= | ?ids=id1,id2 — remove presentation(s) ──
export async function DELETE(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const idParam = searchParams.get('id');
  const ids = idsParam
    ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : idParam
      ? [idParam]
      : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
  }

  const prefix = `presentations/${user.id}`;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const idSet = new Set(ids);

  try {
    for (const id of ids) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key:    `${prefix}/${id}.json`,
      }));
    }

    const indexKey = `${prefix}/index.json`;
    const metaKey = `${prefix}/index.meta.json`;

    for (let attempt = 0; attempt < 5; attempt++) {
      let index: any[] = [];
      let expectedVersion = 0;
      try {
        const idxRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: indexKey }));
        index = JSON.parse(await streamToString(idxRes.Body));
        const meta = await readIndexMeta(s3Client, bucket, metaKey);
        expectedVersion = meta.version;
      } catch (e: any) { if (e.name !== 'NoSuchKey') throw e; }

      const updatedIndex = index.filter((p: any) => !idSet.has(p.id));

      const res = await writeIndexWithMeta({
        client: s3Client,
        bucket,
        indexKey,
        metaKey,
        index: updatedIndex,
        expectedVersion
      });

      if (res.ok) break;
      if (attempt === 4) {
        throw new Error('Failed to update index due to concurrent modifications');
      }
    }

    for (const id of ids) {
      try {
        await deleteDeckAssetsUnderPrefix(
          s3Client,
          bucket,
          `${prefix}/deck-assets/${id}/`,
        );
      } catch (assetErr) {
        console.error('R2 deck-assets cleanup (non-fatal):', assetErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('R2 Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
  }
}

// ── PATCH /api/presentations — update title and/or share access ─────────────
export async function PATCH(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const auth = await requireApiUserWithRateLimit(req, 'write');
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(
    req,
    MAX_PRESENTATION_PATCH_BYTES,
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.value;
  const newTitle =
    typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
  const shareAccessRaw = body.shareAccess;
  const shareAccess =
    shareAccessRaw === 'private' || shareAccessRaw === 'public_view' ? shareAccessRaw : null;

  if (!newTitle && !shareAccess) {
    return NextResponse.json({ error: 'Missing title or shareAccess' }, { status: 400 });
  }

  const prefix = `presentations/${user.id}`;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const deckKey = `${prefix}/${id}.json`;

  try {
    const deckRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: deckKey }));
    const deck = JSON.parse(await streamToString(deckRes.Body));

    if (newTitle) deck.title = newTitle;
    if (shareAccess) deck.shareAccess = shareAccess;
    deck.updatedAt = new Date().toISOString();

    await putJsonWithRetry(s3Client, bucket, deckKey, JSON.stringify(deck));

    const indexKey = `${prefix}/index.json`;
    const metaKey = `${prefix}/index.meta.json`;

    for (let attempt = 0; attempt < 5; attempt++) {
      let index: any[] = [];
      let expectedVersion = 0;
      try {
        const idxRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: indexKey }));
        index = JSON.parse(await streamToString(idxRes.Body));
        const meta = await readIndexMeta(s3Client, bucket, metaKey);
        expectedVersion = meta.version;
      } catch (e: any) { if (e.name !== 'NoSuchKey') throw e; }

      const idx = index.findIndex((p: any) => p.id === id);
      if (idx >= 0) {
        index[idx] = {
          ...index[idx],
          ...(newTitle ? { title: newTitle, date: deck.updatedAt } : { date: deck.updatedAt }),
          ...(shareAccess ? { shareAccess } : {}),
        };
      }

      const res = await writeIndexWithMeta({
        client: s3Client,
        bucket,
        indexKey,
        metaKey,
        index,
        expectedVersion
      });

      if (res.ok) break;
      if (attempt === 4) {
        throw new Error('Failed to update index due to concurrent modifications');
      }
    }

    return NextResponse.json(
      {
        success: true,
        ...(newTitle ? { title: newTitle } : {}),
        ...(shareAccess ? { shareAccess } : {}),
        updatedAt: deck.updatedAt,
      },
      { headers: PRIVATE_CACHE_HEADERS },
    );
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }
    console.error('R2 PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update presentation' }, { status: 500 });
  }
}
