/**
 * Claid.ai text-to-image (Generative Fill, Magic Edit image prompts).
 * @see https://docs.claid.ai/image-generation-api/api-reference
 */

const CLAID_IMAGE_GENERATE = 'https://api.claid.ai/v1/image/generate';

type ClaidGenerateResponse = {
  data?: {
    input?: { text?: string };
    output?: Array<{ tmp_url?: string }>;
  };
};

export async function generateClaidImageUrl(params: {
  prompt: string;
  polish?: boolean;
  width?: number;
  height?: number;
}): Promise<string> {
  const apiKey = process.env.CLAID_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing CLAID_API_KEY environment variable');
  }

  let input = String(params.prompt).trim();
  if (input.length < 3) {
    input = `${input}${'.'.repeat(Math.max(0, 3 - input.length))}`.slice(0, 1024);
  }
  if (input.length > 1024) {
    input = input.slice(0, 1024);
  }

  const guidance_scale = params.polish ? 10 : 6;

  const res = await fetch(CLAID_IMAGE_GENERATE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      options: {
        number_of_images: 1,
        guidance_scale,
        ...(params.width && params.height ? { width: params.width, height: params.height } : {}),
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Claid image API error ${res.status}: ${rawText.slice(0, 400)}`);
  }

  let parsed: ClaidGenerateResponse;
  try {
    parsed = JSON.parse(rawText) as ClaidGenerateResponse;
  } catch {
    throw new Error('Invalid JSON from Claid image API');
  }

  const tmpUrl = parsed.data?.output?.[0]?.tmp_url;
  if (!tmpUrl || typeof tmpUrl !== 'string') {
    throw new Error('Claid returned no image URL (tmp_url missing)');
  }
  return tmpUrl;
}
