import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';

async function streamToString(stream: unknown): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export type IndexMeta = { version: number };

export async function readIndexMeta(
  client: S3Client,
  bucket: string,
  metaKey: string,
): Promise<IndexMeta> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: metaKey }));
    const parsed = JSON.parse(await streamToString(res.Body)) as IndexMeta;
    return { version: Number(parsed.version) || 0 };
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: unknown }).name) : '';
    if (name === 'NoSuchKey') return { version: 0 };
    throw e;
  }
}

export async function writeIndexWithMeta(args: {
  client: S3Client;
  bucket: string;
  indexKey: string;
  metaKey: string;
  index: unknown[];
  expectedVersion: number;
}): Promise<{ ok: true; version: number } | { ok: false; reason: 'conflict'; version: number }> {
  const current = await readIndexMeta(args.client, args.bucket, args.metaKey);
  if (current.version !== args.expectedVersion) {
    return { ok: false, reason: 'conflict', version: current.version };
  }
  const nextVersion = args.expectedVersion + 1;
  await args.client.send(
    new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.indexKey,
      Body: JSON.stringify(args.index),
      ContentType: 'application/json',
    }),
  );
  await args.client.send(
    new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.metaKey,
      Body: JSON.stringify({ version: nextVersion }),
      ContentType: 'application/json',
    }),
  );
  return { ok: true, version: nextVersion };
}
