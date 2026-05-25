import { S3Client } from '@aws-sdk/client-s3';

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (r2Client) return r2Client;
  if (
    !process.env.CLOUDFLARE_R2_ENDPOINT?.trim() ||
    !process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim() ||
    !process.env.CLOUDFLARE_R2_SECRET_KEY?.trim()
  ) {
    return null;
  }
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT.trim(),
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY.trim(),
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY.trim(),
    },
  });
  return r2Client;
}

export function getR2BucketName(): string | undefined {
  return process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || undefined;
}

export function isR2Configured(): boolean {
  return Boolean(getR2Client() && getR2BucketName());
}
