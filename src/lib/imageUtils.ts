/**
 * imageUtils.ts
 * -------------
 * Utility functions for image processing in the canvas editor.
 *
 * - downscaleImage: generates a small data-URL preview (≤ IMAGE_PREVIEW_MAX px)
 *   for any user-uploaded image so the canvas only loads a lightweight version
 *   while editing. The full-size src is preserved for export.
 */

import { IMAGE_PREVIEW_MAX } from '@/constants/editor';

/**
 * Given a File or data-URL string, returns a down-scaled data-URL
 * whose longest dimension is at most `maxPx` pixels.
 *
 * Usage:
 *   const preview = await downscaleImage(file, 800);
 *   addElement(slideId, { ...el, src: file_url, srcPreview: preview });
 */
export async function downscaleImage(
  source: File | string,
  maxPx: number = IMAGE_PREVIEW_MAX,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const draw = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/webp', 0.82));
    };

    img.onload = draw;
    img.onerror = reject;

    if (typeof source === 'string') {
      img.src = source;
    } else {
      // File → object URL, revoke after load
      const objUrl = URL.createObjectURL(source);
      img.src = objUrl;
      img.onload = () => {
        draw();
        URL.revokeObjectURL(objUrl);
      };
    }
  });
}

/**
 * Reads a File as a base-64 data URL (for embedding directly in the canvas).
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
