/**
 * Server-side Pollinations image generation (gen.pollinations.ai).
 * @see https://github.com/pollinations/pollinations/blob/main/APIDOCS.md
 */

const POLLINATIONS_IMAGE_URL = 'https://gen.pollinations.ai/v1/images/generations';

export async function generatePollinationsImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  polish?: boolean;
  model?: string;
}): Promise<string> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing POLLINATIONS_API_KEY environment variable');
  }

  const w = Math.max(256, Math.min(1536, Math.round(params.width) || 1024));
  const h = Math.max(256, Math.min(1536, Math.round(params.height) || 1024));

  const res = await fetch(POLLINATIONS_IMAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model ?? 'flux',
      prompt: params.prompt,
      n: 1,
      size: `${w}x${h}`,
      quality: params.polish ? 'high' : 'medium',
      response_format: 'url',
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Pollinations image API error ${res.status}: ${rawText.slice(0, 400)}`);
  }

  let data: { data?: Array<{ url?: string }> };
  try {
    data = JSON.parse(rawText) as { data?: Array<{ url?: string }> };
  } catch {
    throw new Error('Invalid JSON from Pollinations image API');
  }

  const url = data.data?.[0]?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Pollinations returned no image URL');
  }
  return url;
}
