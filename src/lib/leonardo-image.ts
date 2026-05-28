/**
 * Server-side Leonardo AI image generation.
 */

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

export async function generateLeonardoImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  apiKey?: string;
}): Promise<{ url: string; imageId: string }> {
  const w = Math.max(512, Math.min(1536, Math.round(params.width) || 1024));
  const h = Math.max(512, Math.min(1536, Math.round(params.height) || 1024));
  
  const token = params.apiKey || process.env.LEONARDO_API_KEY || '1ded889c-1e0d-4235-abb8-7b1589049d8b';

  // Premium Generation: Leonardo Vision XL with Alchemy enabled for best quality
  const reqBody = {
    prompt: params.prompt,
    modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876', // Leonardo Vision XL
    width: 1024,
    height: 1024,
    num_images: 1,
    alchemy: true,
    highResolution: true,
  };

  const initRes = await fetch(`${LEONARDO_API_URL}/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(reqBody)
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Leonardo API generation failed: ${initRes.status} ${errText}`);
  }

  const initData = await initRes.json();
  const generationId = initData?.sdGenerationJob?.generationId;

  if (!generationId) {
    throw new Error('Leonardo API did not return a generation ID.');
  }

  // 2. Poll for results
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2500)); // wait 2.5s between polls

    const pollRes = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!pollRes.ok) {
      continue;
    }

    const pollData = await pollRes.json();
    const generation = pollData?.generations_by_pk;

    if (generation?.status === 'COMPLETE') {
      const img = generation.generated_images?.[0];
      if (img?.url && img?.id) {
        return { url: img.url, imageId: img.id };
      }
    } else if (generation?.status === 'FAILED') {
      throw new Error('Leonardo generation failed.');
    }
  }

  throw new Error('Leonardo generation timed out.');
}

export async function generateLeonardoMotionUrl(params: {
  imageId: string;
  apiKey?: string;
}): Promise<string> {
  const token = params.apiKey || process.env.LEONARDO_API_KEY || '1ded889c-1e0d-4235-abb8-7b1589049d8b';

  const initRes = await fetch(`${LEONARDO_API_URL}/generations-motion-svd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageId: params.imageId,
      isPublic: true,
      motionStrength: 6, // High motion strength for cinematic animations
    })
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Leonardo Motion API failed: ${initRes.status} ${errText}`);
  }

  const initData = await initRes.json();
  const generationId = initData?.motionSvdGenerationJob?.generationId;

  if (!generationId) {
    throw new Error('Leonardo Motion API did not return a generation ID.');
  }

  // Poll for results
  for (let i = 0; i < 40; i++) { // Motion takes longer, up to 100s
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const pollRes = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const generation = pollData?.generations_by_pk;

    if (generation?.status === 'COMPLETE') {
      const videoUrl = generation.generated_images?.[0]?.motionMP4URL;
      if (videoUrl) {
        return videoUrl;
      }
    } else if (generation?.status === 'FAILED') {
      throw new Error('Leonardo motion generation failed.');
    }
  }

  throw new Error('Leonardo motion generation timed out.');
}
