import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDeckComposerModels } from '@/lib/ai/models';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { extractJsonObject } from '@/lib/ai/openrouter';

const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  let fullText = '';
  
  // PPTX slides are in ppt/slides/slide[n].xml
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  
  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string');
    // Extract text inside <a:t> tags using regex (simple and effective for PPTX)
    const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
      fullText += `Slide Content: ${slideText}\n\n`;
    }
  }

  return fullText;
}

const SYSTEM_PROMPT = `You are a world-class presentation designer and senior creative director at a top agency. 
The user is providing you with raw text extracted from an old/existing presentation.
Your job is to REDESIGN, ENHANCE, and STRUCTURE this content into a stunning, cinematic, professional modern presentation.

Your output must ALWAYS be valid raw JSON only. Never include markdown code fences, never include text before or after the JSON.

The JSON schema is:
{
  "title": "string — compelling presentation title",
  "theme": "string — e.g. 'cyber-dark', 'neon-gradient', 'minimal-light', 'corporate-blue', 'luxury-dark'",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "fontPairing": {
    "heading": "Space Grotesk",
    "body": "Inter"
  },
  "animationStyle": "kinetic|smooth|fade|none",
  "slides": [
    {
      "id": "slide-001",
      "type": "hero|content|split|media|quote|chart|team|timeline|closing|bullets|stats|comparison",
      "title": "Slide Title",
      "subtitle": "Optional subtitle text",
      "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "imagePrompt": "Hyper-detailed, cinematic image prompt. Describe lighting, style, mood, composition. e.g.: 'Ultra-realistic AI robotics laboratory, glowing cyan holograms, cinematic blue neon lighting, dramatic depth of field, photorealistic, 8K, cinematic composition'",
      "visualDirection": "Brief visual design direction for this slide",
      "backgroundStyle": "animated-gradient-dark|solid-dark|image-overlay|glassmorphism",
      "animation": {
        "entrance": "fadeSlideUp|fadeSlideLeft|fadeIn|zoomIn|slideRight|bounceIn|none",
        "duration": 600,
        "delay": 0
      },
      "speakerNotes": "Optional speaker notes for this slide"
    }
  ]
}

Rules:
1. Keep the core message and data intact, but rewrite poorly written bullets to be punchy and professional.
2. Structure the presentation logically (Start with a Hero slide, end with a Closing).
3. If the original text mentions data/numbers, output a 'stats' or 'chart' slide.
4. Provide beautiful, vivid image prompts to replace old clipart.
5. Maximize the visual layout and slide types (don't just use 'content' type, use 'split', 'quote', 'media' etc.).`;

// Initialize S3 Client for Cloudflare R2
let s3Client: S3Client | null = null;
if (
  process.env.CLOUDFLARE_R2_ENDPOINT &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_SECRET_KEY
) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload Original PPTX to Cloudflare R2
    let fileUrl = '';
    if (s3Client && process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      const fileName = `uploads/${uuidv4()}-${file.name}`;
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          })
        );
        if (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL) {
          fileUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
        }
      } catch (s3Error) {
        console.error('S3 Upload Error:', s3Error);
        // We continue even if upload fails, as long as we can parse it
      }
    }

    // 2. Extract Text using JSZip (Pure JS, no dependencies)
    let extractedText = '';
    try {
      extractedText = await extractTextFromPptx(buffer);
    } catch (parseError) {
      console.error('JSZip Parser Error:', parseError);
      return NextResponse.json({ error: 'Failed to read the PPTX file structure.' }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length < 5) {
      return NextResponse.json({ error: 'The uploaded presentation seems to have no readable text.' }, { status: 400 });
    }

    // --- CACHE LAYER ---
    const cacheKey = `enhance:${crypto
      .createHash('md5')
      .update(JSON.stringify({ text: extractedText.trim() }))
      .digest('hex')}`;

    if (redis) {
      try {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult && typeof cachedResult === 'object' && !Array.isArray(cachedResult)) {
          console.log('Serving ENHANCED PPT from Redis cache:', cacheKey);
          const base = { ...(cachedResult as Record<string, unknown>) };
          return NextResponse.json(fileUrl ? { ...base, originalFileUrl: fileUrl } : base);
        }
      } catch (cacheError) {
        console.error('Redis cache check error:', cacheError);
      }
    }
    // -------------------

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    // 3. Send to OpenRouter — same automatic composer stack as create.
    const { primary: composerPrimary, fallback: composerFallback } = getDeckComposerModels();
    let model = composerPrimary;
    if (extractedText.split(/\s+/).length > 2000) {
      model = composerFallback;
    }
    }

    const userMessage = `Here is the raw text extracted from the user's old presentation:\n\n---\n${extractedText}\n---\n\nPlease enhance this into a stunning modern presentation. Return the JSON.`;

    async function callOpenRouter(targetModel: string) {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': APP_URL,
          'X-Title': 'Orbstera AI Enhancer',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });
    }

    let response = await callOpenRouter(model);

    // Fallback if the selected model fails (e.g. out of credits)
    if (!response.ok && (response.status === 402 || response.status === 400) && model !== composerFallback) {
      console.warn(`[Enhance] ${model} failed, trying configured fallback composer…`);
      response = await callOpenRouter(composerFallback);
    }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', response.status, errorText);
      return NextResponse.json({ error: `AI service error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    const parsedObj = extractJsonObject(content);
    if (!parsedObj || !Array.isArray(parsedObj.slides) || parsedObj.slides.length === 0) {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 502 });
    }

    const parsedJson: Record<string, unknown> = { ...parsedObj };
    parsedJson.originalFileUrl = fileUrl;

    parsedJson.slides = (parsedObj.slides as Record<string, unknown>[]).map((slide, i) => ({
      id: slide.id || `slide-${String(i + 1).padStart(3, '0')}`,
      type: slide.type || 'content',
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      bullets: slide.bullets || [],
      imagePrompt: slide.imagePrompt || '',
      visualDirection: slide.visualDirection || '',
      backgroundStyle: slide.backgroundStyle || 'animated-gradient-dark',
      animation: slide.animation || { entrance: 'fadeSlideUp', duration: 600 },
      speakerNotes: slide.speakerNotes || '',
      elements: [],
    }));

    // --- STORE IN CACHE ---
    if (redis) {
      try {
        await redis.set(cacheKey, parsedJson, { ex: 86400 }); // Cache for 24 hours
        console.log('Saved ENHANCED PPT to Redis cache:', cacheKey);
      } catch (cacheSetError) {
        console.error('Redis cache set error:', cacheSetError);
      }
    }
    // ---------------------

    return NextResponse.json(parsedJson);

  } catch (error: unknown) {
    console.error('Enhancement Error:', error);

    let errorMessage = 'Internal server error';
    if (error instanceof SyntaxError) {
      errorMessage = 'AI returned invalid JSON. Please try again.';
    } else if (error && typeof error === 'object') {
      const e = error as { name?: string; code?: string; message?: string };
      if (e.name === 'NoSuchBucket') {
        errorMessage =
          'Bucket "orbstera-storage" not found. Please create it in your Cloudflare R2 dashboard.';
      } else if (e.name === 'AccessDenied') {
        errorMessage = 'Access denied to Cloudflare R2. Please check your API token permissions.';
      } else if (e.code === 'ECONNREFUSED' || e.name === 'EndpointConnectionError') {
        errorMessage = 'Could not connect to Cloudflare R2. Please check your Endpoint URL.';
      } else if (typeof e.message === 'string' && e.message) {
        errorMessage = e.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
