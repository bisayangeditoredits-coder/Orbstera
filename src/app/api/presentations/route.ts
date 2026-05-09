import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

// Utility to read stream to string
async function streamToString(stream: any): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function getUserId() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || 'anonymous';
}

export async function GET(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const userId = await getUserId();
  const prefix = `presentations/${userId}`;

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
    if (error.name === 'NoSuchKey') {
      return NextResponse.json(id ? null : []); // No presentations yet or not found
    }
    console.error('R2 Get Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  const userId = await getUserId();
  const prefix = `presentations/${userId}`;

  try {
    const presentation = await req.json();
    if (!presentation.id) presentation.id = uuidv4();
    if (!presentation.createdAt) presentation.createdAt = new Date().toISOString();
    presentation.updatedAt = new Date().toISOString();

    // 1. Save full presentation data
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: `${prefix}/${presentation.id}.json`,
        Body: JSON.stringify(presentation),
        ContentType: 'application/json',
      })
    );

    // 2. Update the index file
    let index: any[] = [];
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: `${prefix}/index.json`,
        })
      );
      const body = await streamToString(response.Body);
      index = JSON.parse(body);
    } catch (e: any) {
      // If index doesn't exist, start fresh
      if (e.name !== 'NoSuchKey') throw e;
    }

    // Update or push
    const existingIndex = index.findIndex((p: any) => p.id === presentation.id);
    const metadata = {
      id: presentation.id,
      title: presentation.title || 'Untitled Presentation',
      date: presentation.updatedAt,
      slidesCount: presentation.slides?.length || 0,
      theme: presentation.theme || 'dark',
      colorPalette: presentation.colorPalette || ['#05050A', '#7B61FF', '#FFFFFF', '#A390FF'],
      subtitle: presentation.slides?.[0]?.subtitle || '',
      preview: 'from-primary/20 to-secondary/20', // Fallback
    };

    if (existingIndex >= 0) {
      index[existingIndex] = metadata;
    } else {
      index.unshift(metadata);
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: `${prefix}/index.json`,
        Body: JSON.stringify(index),
        ContentType: 'application/json',
      })
    );

    return NextResponse.json({ success: true, presentation });
  } catch (error) {
    console.error('R2 Save Error:', error);
    return NextResponse.json({ error: 'Failed to save presentation' }, { status: 500 });
  }
}
