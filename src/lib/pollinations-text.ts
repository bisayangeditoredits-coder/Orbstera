/**
 * Server-side Pollinations text generation (text.pollinations.ai).
 * Completely free, no API key required.
 * @see https://github.com/pollinations/pollinations/blob/main/APIDOCS.md
 */

export interface PollinationsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Call the free Pollinations text/chat API.
 * Returns the assistant message content string, or throws on failure.
 */
export async function pollinationsChat(params: {
  messages: PollinationsMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
}): Promise<string> {
  const {
    messages,
    model = 'openai',
    temperature = 0.15,
    maxTokens = 3000,
    seed = Math.floor(Math.random() * 99999),
  } = params;

  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      seed,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pollinations text API error ${res.status}: ${body}`);
  }

  // The API returns OpenAI-compatible JSON
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Pollinations text API returned empty content');
  }

  return content;
}
