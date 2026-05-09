import { NextResponse } from 'next/server';
import { SlideElement } from '@/types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const SYSTEM_PROMPT = `You are a precision AI design assistant in a presentation software.
The user wants to edit a SPECIFIC element on their slide.
You will be provided with the element's current JSON data, and the user's prompt (e.g. "make it red", "shorten this text", "change to a neon cyberpunk background").
You must return the EXACT SAME JSON structure, but with the requested modifications applied.

ONLY return valid JSON. Do not include markdown code fences.

If the user asks to change an IMAGE, rewrite the \`src\` field with a highly detailed, cinematic DALL-E style image prompt starting with "PROMPT: " (e.g. "PROMPT: Hyper-realistic neon cyberpunk city at night, 8k resolution"). Our system will later convert this prompt into an actual image.

If the user asks to change TEXT, update the \`content\` field and any relevant \`textStyle\` properties (like color, fontSize).

If the user asks to change a SHAPE, update the \`shapeStyle\` properties (like fill, stroke, cornerRadius).`;

export async function POST(req: Request) {
  try {
    const { prompt, element } = await req.json();

    if (!prompt || !element) {
      return NextResponse.json({ error: 'Prompt and element data are required' }, { status: 400 });
    }

    const userMessage = `Current Element JSON:
${JSON.stringify(element, null, 2)}

User Request: "${prompt}"

Return the modified JSON.`;

    const models = [
      'google/gemini-2.0-flash-001',
      'anthropic/claude-3.5-sonnet:beta',
      'google/gemini-pro-1.5',
      'deepseek/deepseek-chat'
    ];

    let response: Response | null = null;
    let lastError = '';

    for (const model of models) {
      try {
        console.log(`[MagicEdit] Trying model: ${model}`);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'PPTMaker AI Magic Edit',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.1, // very low for precision
            max_tokens: 1500,
          }),
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          lastError = await res.text();
          console.error(`[MagicEdit] Model ${model} failed:`, lastError);
        }
      } catch (e) {
        console.error(`[MagicEdit] Error calling ${model}:`, e);
      }
    }

    if (!response) {
      return NextResponse.json({ error: 'All AI models failed to process magic edit' }, { status: 502 });
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const updatedElement: SlideElement = JSON.parse(content);

    // ─── Post-processing for AI-generated images ──────────────────────────
    if (updatedElement.type === 'image' && updatedElement.src?.startsWith('PROMPT:')) {
      const promptText = updatedElement.src.replace('PROMPT:', '').trim();
      console.log(`[MagicEdit] Generating AI image for: ${promptText}`);
      
      const seed = Math.floor(Math.random() * 1_000_000);
      const encoded = encodeURIComponent(promptText);
      // Immediately return the generative URL so the browser can load it in real-time
      updatedElement.src = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
    }

    return NextResponse.json(updatedElement);
  } catch (error) {
    console.error('Magic Edit Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
