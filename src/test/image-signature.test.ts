import { describe, expect, it } from 'vitest';
import { matchesRasterSignature } from '../../cloudflare/workers/api/src/imageSignature';

describe('uploaded raster signatures', () => {
  it('accepts supported image signatures', () => {
    expect(matchesRasterSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')).toBe(true);
    expect(matchesRasterSignature(new Uint8Array([255, 216, 255]), 'image/jpeg')).toBe(true);
    expect(matchesRasterSignature(new TextEncoder().encode('RIFF....WEBP'), 'image/webp')).toBe(true);
    expect(matchesRasterSignature(new TextEncoder().encode('....ftypavif'), 'image/avif')).toBe(true);
  });

  it('rejects content mislabeled as an image', () => {
    const html = new TextEncoder().encode('<script>alert(1)</script>');
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/avif']) {
      expect(matchesRasterSignature(html, type)).toBe(false);
    }
  });
});
