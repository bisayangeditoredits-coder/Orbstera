import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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

// GET /api/reviews — fetch reviews from R2
export async function GET() {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ reviews: [] }); // Fallback to empty or hardcoded
  }

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: 'reviews/index.json',
      })
    );
    const body = await streamToString(response.Body);
    return NextResponse.json({ reviews: JSON.parse(body) });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ reviews: [] });
    }
    console.error('R2 Reviews Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews — store a new review to R2
export async function POST(req: Request) {
  if (!s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
  }

  try {
    const reviewData = await req.json();
    const { name, handle, role, body, rating, image } = reviewData;

    if (!name || !body || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newReview = {
      id: uuidv4(),
      name,
      handle: handle || `@${name.toLowerCase().replace(/\s+/g, '_')}`,
      role: role || 'User',
      body,
      rating: Number(rating),
      image: image || null,
      createdAt: new Date().toISOString(),
    };

    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const indexKey = 'reviews/index.json';

    // Best-effort index update
    let index: any[] = [];
    try {
      const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: indexKey }));
      const bodyStr = await streamToString(res.Body);
      index = JSON.parse(bodyStr);
    } catch (e: any) {
      if (e.name !== 'NoSuchKey') throw e;
    }

    index.unshift(newReview);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: indexKey,
        Body: JSON.stringify(index),
        ContentType: 'application/json',
      })
    );

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error('R2 Review Save Error:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}
