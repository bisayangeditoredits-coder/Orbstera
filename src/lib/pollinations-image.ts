/**
 * Server-side Pollinations image generation (gen.pollinations.ai).
 * @see https://github.com/pollinations/pollinations/blob/main/APIDOCS.md
 */

export function buildPollinationsDirectUrl(params: {
  prompt: string;
  width: number;
  height: number;
  seed?: number;
}): string {
  const w = Math.max(256, Math.min(1536, Math.round(params.width) || 1024));
  const h = Math.max(256, Math.min(1536, Math.round(params.height) || 1024));
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(params.prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
}

export async function generatePollinationsImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  polish?: boolean;
  model?: string;
}): Promise<string> {
  const w = Math.max(256, Math.min(1536, Math.round(params.width) || 1024));
  const h = Math.max(256, Math.min(1536, Math.round(params.height) || 1024));
  const url = buildPollinationsDirectUrl({ prompt: params.prompt, width: w, height: h });

  const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) {
    throw new Error(`Pollinations image fetch error: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return `data:${contentType};base64,${base64}`;
}
