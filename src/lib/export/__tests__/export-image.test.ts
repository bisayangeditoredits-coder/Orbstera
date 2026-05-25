import { describe, expect, it } from 'vitest';
import { extractR2KeyFromImageSrc } from '../export-image';

describe('extractR2KeyFromImageSrc', () => {
  it('extracts key from read-asset URL', () => {
    const key = extractR2KeyFromImageSrc(
      '/api/presentations/read-asset?key=presentations%2Fuser-1%2Fdeck%2Fimg.png',
    );
    expect(key).toBe('presentations/user-1/deck/img.png');
  });

  it('extracts key from legacy presentations path in URL', () => {
    const key = extractR2KeyFromImageSrc(
      'https://cdn.example.com/presentations/abcdef12/deck/slide.png',
    );
    expect(key).toBe('presentations/abcdef12/deck/slide.png');
  });
});
