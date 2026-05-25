import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { deriveDeckIndexThumbFields } from '@/lib/deck-index-meta';
import { readIndexMeta, writeIndexWithMeta } from '@/lib/server/r2-index';

async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
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
          Bucket: bucket,
          Key: key,
          Body: body,
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

export type PresentationSaveResult =
  | { ok: true; id: string; saveVersion: number; updatedAt: string }
  | { ok: false; reason: 'placeholder' }
  | { ok: false; reason: 'conflict'; serverVersion: number };

/**
 * Shared persistence used by POST /api/presentations and large staging uploads.
 * Mutates `presentation` (id, timestamps, saveVersion, userId) like the original route.
 */
export async function runPresentationSaveFromParsed(
  s3Client: S3Client,
  bucket: string,
  userId: string,
  // Parsed JSON — same loose shape as route handler historically used.
  presentation: Record<string, unknown>,
): Promise<PresentationSaveResult> {
  const slides = presentation.slides as unknown[] | undefined;
  if (presentation.title === 'Generating...' || !slides || slides.length === 0) {
    return { ok: false, reason: 'placeholder' };
  }

  if (!presentation.id) presentation.id = uuidv4();
  if (!presentation.createdAt) presentation.createdAt = new Date().toISOString();
  presentation.updatedAt = new Date().toISOString();
  presentation.userId = userId;

  const prefix = `presentations/${userId}`;
  const deckKey = `${prefix}/${presentation.id as string}.json`;

  let serverVersion = 0;
  try {
    const existingRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: deckKey }));
    const existing = JSON.parse(await streamToString(existingRes.Body));
    serverVersion = Number(existing.saveVersion) || 0;
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: unknown }).name) : '';
    if (name !== 'NoSuchKey') throw e;
  }
  const clientVersion = Number(presentation.saveVersion) || 0;
  if (serverVersion > 0 && clientVersion !== serverVersion) {
    return { ok: false, reason: 'conflict', serverVersion };
  }
  presentation.saveVersion = serverVersion + 1;

  await putJsonWithRetry(s3Client, bucket, deckKey, JSON.stringify(presentation));

  const indexKey = `${prefix}/index.json`;
  const metaKey = `${prefix}/index.meta.json`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { version: indexVersion } = await readIndexMeta(s3Client, bucket, metaKey);

      let index: unknown[] = [];
      try {
        const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: indexKey }));
        const body = await streamToString(res.Body);
        index = JSON.parse(body) as unknown[];
      } catch (e: unknown) {
        const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: unknown }).name) : '';
        if (name !== 'NoSuchKey') throw e;
      }

      const thumb = deriveDeckIndexThumbFields(presentation as { slides?: unknown[] });

      const metadata = {
        id: presentation.id,
        title: presentation.title || 'Untitled Presentation',
        date: presentation.updatedAt,
        createdAt: presentation.createdAt,
        slidesCount: slides.length,
        theme: presentation.theme || 'dark',
        colorPalette: presentation.colorPalette || ['#05050A', '#7B61FF', '#FFFFFF', '#A390FF'],
        subtitle: (slides[0] as { subtitle?: string } | undefined)?.subtitle || '',
        ...(presentation.shareAccess === 'private' || presentation.shareAccess === 'public_view'
          ? { shareAccess: presentation.shareAccess }
          : {}),
        ...thumb,
      };

      const existingIndex = index.findIndex((p: unknown) => (p as { id?: string }).id === presentation.id);
      if (existingIndex >= 0) index[existingIndex] = metadata;
      else index.unshift(metadata);

      const written = await writeIndexWithMeta({
        client: s3Client,
        bucket,
        indexKey,
        metaKey,
        index,
        expectedVersion: indexVersion,
      });
      if (!written.ok) {
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
        continue;
      }
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  return {
    ok: true,
    id: presentation.id as string,
    saveVersion: presentation.saveVersion as number,
    updatedAt: presentation.updatedAt as string,
  };
}
