import { describe, expect, it } from 'vitest';
import { combinedShapeTransparency, parseColorForPptx } from '../export-colors';

describe('parseColorForPptx', () => {
  it('parses rgba with alpha', () => {
    const p = parseColorForPptx('rgba(4, 4, 17, 0.35)');
    expect(p.color).toBe('040411');
    expect(p.transparency).toBe(65);
  });

  it('parses hex colors', () => {
    expect(parseColorForPptx('#FFFFFF').color).toBe('FFFFFF');
    expect(parseColorForPptx('#fff').color).toBe('FFFFFF');
  });
});

describe('combinedShapeTransparency', () => {
  it('merges fill and element opacity', () => {
    const t = combinedShapeTransparency(20, 0.5);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(100);
  });
});
