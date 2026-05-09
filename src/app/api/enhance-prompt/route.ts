import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const SYSTEM_PROMPT = `You are an expert prompt engineer for an AI presentation maker.
The user will give you a short, brief idea for a presentation.
Your task is to expand, enhance, and professionalize this idea into a detailed, highly descriptive prompt (2-4 sentences max).
Include suggested structure, tone, and key elements to cover. 
DO NOT include any conversational filler (no "Here is the enhanced prompt:"). 
JUST return the raw enhanced prompt text directly.`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
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
