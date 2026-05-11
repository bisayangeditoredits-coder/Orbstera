import { NextResponse } from 'next/server';
import { AGENT_MODELS } from '@/lib/ai/agent-models';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const DECK_SYSTEM_PROMPT = `You are an expert prompt engineer for an AI presentation maker.
The user will give you a short, brief idea for a presentation.
Your task is to expand, enhance, and professionalize this idea into a detailed, highly descriptive prompt (2-4 sentences max).
Include suggested structure, tone, and key elements to cover. 
DO NOT include any conversational filler (no "Here is the enhanced prompt:"). 
JUST return the raw enhanced prompt text directly.`;

const IMAGE_SYSTEM_PROMPT = `You are an expert prompt engineer for image generation used inside presentation slides.
The user gives a short idea for a rectangular image region.
Expand it into ONE fluent, highly descriptive image prompt (2–3 sentences max): subject, lighting, composition, lens/depth, materials, color harmony.
Requirements: no on-image text, no logos, no watermarks, presentation-ready and tasteful.
Output ONLY the prompt text. No preamble or quotes.`;

export async function POST(req: Request) {
  try {
    const { prompt, purpose } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const system =
      String(purpose) === 'image' ? IMAGE_SYSTEM_PROMPT : DECK_SYSTEM_PROMPT;
    const maxTokens = String(purpose) === 'image' ? 220 : 150;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AGENT_MODELS.gptOrchestrator,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      })
    });

    if (!res.ok) {
      throw new Error('Failed to fetch from AI provider');
    }

    const data = await res.json();
    const enhancedPrompt = data.choices[0]?.message?.content?.trim() || prompt;

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error('Enhance prompt error:', error);
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 });
  }
}
