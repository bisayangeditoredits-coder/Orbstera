import { describe, expect, it } from 'vitest';
import { ALLOWED_LEONARDO_DIMS, regionToLeonardoPixels, snapDim } from '@/lib/leonardo-dimensions';

describe('snapDim', () => {
  it('snaps to exact Leonardo bins', () => {
    expect(snapDim(1280)).toBe(1280);
    expect(snapDim(720)).toBe(720);
    expect(snapDim(800)).toBe(832);
  });

  it('only returns allowed dimensions', () => {
    for (const n of [100, 400, 600, 777, 999, 1200, 1500, 2000]) {
      expect(ALLOWED_LEONARDO_DIMS).toContain(snapDim(n, 256));
    }
  });
});

describe('regionToLeonardoPixels', () => {
  it('preserves deck full-bleed dimensions', () => {
    expect(regionToLeonardoPixels(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('snaps odd gen-fill regions to valid bins', () => {
    const { width, height } = regionToLeonardoPixels(600, 400);
    expect(ALLOWED_LEONARDO_DIMS).toContain(width);
    expect(ALLOWED_LEONARDO_DIMS).toContain(height);
    expect(width).toBeGreaterThanOrEqual(256);
    expect(height).toBeGreaterThanOrEqual(256);
  });

  it('snaps split-panel image dimensions', () => {
    const { width, height } = regionToLeonardoPixels(552, 592);
    expect(ALLOWED_LEONARDO_DIMS).toContain(width);
    expect(ALLOWED_LEONARDO_DIMS).toContain(height);
  });
});
