/**
 * Immediately persist an AI-generated image URL to R2 so it is:
 *  1. Permanent (Leonardo CDN URLs expire after a few hours)
 *  2. CORS-safe for canvas rendering via /api/presentations/read-asset
 *  3. Server-accessible for PPTX export
 *
 * Returns the persisted public URL, or the original URL if upload fails.
 */
export async function persistGeneratedImage(
  remoteUrl: string,
  presentationId: string,
): Promise<string> {
  if (!remoteUrl?.trim()) return remoteUrl;

  // Already a permanent URL (R2 public, read-asset, or data URL)
  if (
    remoteUrl.startsWith('data:') ||
    remoteUrl.includes('/api/presentations/read-asset') ||
    remoteUrl.startsWith('blob:')
  ) {
    return remoteUrl;
  }

  try {
    // 1. Fetch the image bytes from the CDN
    const fetchRes = await fetch(remoteUrl, {
      // no-cors won't give us the bytes; we need the CDN to allow it
      // Leonardo CDN does allow anonymous fetch from browser
    });
    if (!fetchRes.ok) {
      console.warn('[persistGeneratedImage] Could not fetch from CDN:', remoteUrl.slice(0, 80));
      return remoteUrl;
    }

    const blob = await fetchRes.blob();
    if (blob.size < 16) return remoteUrl;

    const mime = blob.type || 'image/jpeg';

    // 2. Upload via the authenticated /api/presentations/upload-asset endpoint
    const fd = new FormData();
    fd.set('presentationId', presentationId);
    fd.set('mimeType', mime);
    fd.set('file', blob);

    const uploadRes = await fetch('/api/presentations/upload-asset', {
      method: 'POST',
      body: fd,
      cache: 'no-store',
    });

    if (!uploadRes.ok) {
      console.warn('[persistGeneratedImage] Upload failed:', uploadRes.status);
      return remoteUrl;
    }

    const json = (await uploadRes.json().catch(() => ({}))) as { publicUrl?: string };
    if (typeof json.publicUrl === 'string' && json.publicUrl.trim()) {
      return json.publicUrl.trim();
    }

    return remoteUrl;
  } catch (e) {
    console.warn('[persistGeneratedImage] Error persisting image:', e);
    return remoteUrl;
  }
}
