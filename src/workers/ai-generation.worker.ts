import { Worker, Job } from 'bullmq';
import { connection, QUEUE_NAMES } from '../lib/queue/config';
import { buildComposerMessages } from '../lib/ai/orchestration';
import { runOpenRouterOrchestration } from '../lib/ai/prompt-chain';
import { openRouterStream } from '../lib/ai/openrouter';
import { createClient } from '@supabase/supabase-js';
import { getCache, setCache, hashPromptKey } from '../lib/cache';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const aiGenerationWorker = new Worker(QUEUE_NAMES.AI_GENERATION, async (job: Job) => {
  const { prompt, slideCount, tone, language, styleMode, primaryModel, fallbackModel } = job.data;

  const channel = supabaseAdmin.channel(`job-${job.id}`);
  channel.subscribe();

  const sendOrb = async (payload: any) => {
    // Keep BullMQ UI updated
    await job.updateProgress(payload);
    // Broadcast instantly to frontend via Realtime (0 latency, 0 Next.js cost)
    await channel.send({
      type: 'broadcast',
      event: 'progress',
      payload
    });
  };

  // ── Enterprise Semantic Caching ──────────────────────────────────────────
  const cacheKey = hashPromptKey(prompt, { slideCount, tone, language, styleMode });
  const cachedText = await getCache<string>(cacheKey);

  if (cachedText) {
    await sendOrb({ orb: { phase: 'starting', message: 'Cache hit! Reconstructing presentation...' } });
    
    // Simulate streaming the cached raw model text back so the UI parses it properly
    const chunkSize = 150;
    for (let i = 0; i < cachedText.length; i += chunkSize) {
      const piece = cachedText.slice(i, i + chunkSize);
      await sendOrb({ choices: [{ delta: { content: piece } }] });
      await new Promise(r => setTimeout(r, 15)); // Artificial stream delay for UI effect
    }
    
    await channel.send({ type: 'broadcast', event: 'completed', payload: { success: true } });
    supabaseAdmin.removeChannel(channel);
    return { success: true, cached: true };
  }

  // ── Normal Generation ───────────────────────────────────────────────────
  await sendOrb({ orb: { phase: 'starting', message: 'Preparing your presentation…' } });

  const { dossierText, refinedBrief, preflightSummary } = await runOpenRouterOrchestration(
    APP_URL, prompt, { slideCount, tone, language },
    async (phase, message) => {
      await sendOrb({ orb: { phase, message } });
    }
  );

  await sendOrb({ orb: { phase: 'composing', message: 'Translating the brief into slide structure and motion…' } });

  const { system, user: userMessage } = buildComposerMessages({
    preflightSummary: `${preflightSummary}\n\n--- Full dossier ---\n${dossierText}`,
    userPrompt: prompt,
    refinedBrief,
    slideCount,
    tone,
    language,
    styleMode,
  });

  await sendOrb({ orb: { phase: 'streaming', message: 'Rendering your deck…' } });

  let accumulatedText = '';

  async function tryStream(model: string): Promise<boolean> {
    const res = await openRouterStream(APP_URL, {
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
    });
    if (!res.ok || !res.body) return false;
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const json = JSON.parse(dataStr);
              // Accumulate text for caching
              const piece = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
              accumulatedText += piece;

              await sendOrb(json);
            } catch (e) {
              // Ignore invalid JSON chunks
            }
          }
        }
      }
    }
    return true;
  }

  let ok = await tryStream(primaryModel);
  if (!ok && fallbackModel) {
    await sendOrb({ orb: { phase: 'fallback', message: 'Continuing with an alternate composer…' } });
    ok = await tryStream(fallbackModel);
  }
  if (!ok) {
    await channel.send({ type: 'broadcast', event: 'failed', payload: { error: 'Generation failed' } });
    supabaseAdmin.removeChannel(channel);
    throw new Error('Generation could not complete. Try again shortly.');
  }

  // Cache the successful generation result for 7 days
  if (accumulatedText.length > 500) {
    await setCache(cacheKey, accumulatedText, 86400 * 7);
  }

  await channel.send({ type: 'broadcast', event: 'completed', payload: { success: true } });
  supabaseAdmin.removeChannel(channel);

  return { success: true };
}, { connection, concurrency: 10 });

aiGenerationWorker.on('failed', (job, err) => {
  console.error(`[AI Worker] Job ${job?.id} failed:`, err);
});
