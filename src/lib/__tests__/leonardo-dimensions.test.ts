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
  it('preserves deck full-bleed dimensions by snapping to closest SDXL bin', () => {
    // 1280x720 (16:9) should map to the closest allowed combo, which is 1392x752 or 1456x720
    const { width, height } = regionToLeonardoPixels(1280, 720);
    expect([{ width: 1392, height: 752 }, { width: 1456, height: 720 }]).toContainEqual({ width, height });
  });

  it('snaps odd gen-fill regions to exact valid SDXL combinations', () => {
    const { width, height } = regionToLeonardoPixels(600, 400); // 1.5 ratio
    // Closest is 1248x832 (1.5 ratio)
    expect({ width, height }).toEqual({ width: 1248, height: 832 });
  });

  it('snaps split-panel image dimensions', () => {
    const { width, height } = regionToLeonardoPixels(552, 592); // ~0.93 ratio
    // Closest is 1024x1024 (1:1) or 944x1104 (~0.85)
    // 552/592 = 0.932. 944/1104 = 0.855. 1024/1024 = 1.
    const isValid = [
      { width: 1024, height: 1024 },
      { width: 944, height: 1104 }
    ].some(c => c.width === width && c.height === height);
    expect(isValid).toBe(true);
  });
});
