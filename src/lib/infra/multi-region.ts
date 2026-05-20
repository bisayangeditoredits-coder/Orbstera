/**
 * Multi-region deployment hints (configure in Vercel / Cloudflare dashboards).
 * This module documents recommended env per region — not active routing yet.
 */
export type RegionProfile = {
  id: string;
  vercelRegion?: string;
  upstashRedisUrl?: string;
  r2Bucket?: string;
  publicAppUrl?: string;
};

export function getConfiguredRegions(): RegionProfile[] {
  const raw = process.env.ORB_MULTI_REGION_CONFIG?.trim();
  if (!raw) {
    return [
      {
        id: 'primary',
        vercelRegion: process.env.VERCEL_REGION,
        publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    ];
  }
  try {
    return JSON.parse(raw) as RegionProfile[];
  } catch {
    return [{ id: 'primary' }];
  }
}
