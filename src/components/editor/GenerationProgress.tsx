'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { DeckGenerationLifecycle } from '@/types';

const STEPS = [
  'Analyzing topic',
  'Structuring slides',
  'Writing content',
  'Adding visuals',
  'Finalizing',
] as const;

type GenerationProgressProps = {
  jobId?: string | null;
  onCancel: () => void;
};

function parseSseEvents(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts.filter(Boolean), rest };
}

function parseSseDataLine(block: string): { progress?: number; status?: string } | null {
  for (const line of block.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw) continue;
    try {
      return JSON.parse(raw) as { progress?: number; status?: string };
    } catch {
      return null;
    }
  }
  return null;
}

function stepIndexFromPhase(phase: string, lifecycle: DeckGenerationLifecycle): number {
  const p = phase.toLowerCase();
  if (
    p === 'polishing' ||
    p === 'finishing' ||
    p === 'preflight_complete' ||
    lifecycle === 'polishing' ||
    lifecycle === 'syncing'
  ) {
    return 4;
  }
  if (
    p === 'generating_visuals' ||
    p === 'enhancing_animations' ||
    lifecycle === 'images'
  ) {
    return 3;
  }
  if (
    p === 'streaming' ||
    p === 'building' ||
    p === 'slides_generated' ||
    p === 'synthesis' ||
    lifecycle === 'streaming' ||
    lifecycle === 'building'
  ) {
    return 2;
  }
  if (
    p === 'structure' ||
    p === 'structure_complete' ||
    p === 'director'
  ) {
    return 1;
  }
  if (
    p === 'starting' ||
    p === 'understanding' ||
    p === 'reasoning' ||
    p === 'cache' ||
    lifecycle === 'connecting'
  ) {
    return 0;
  }
  return 0;
}

function stepIndexFromJobProgress(progress: number): number {
  if (progress >= 100) return 4;
  return Math.min(4, Math.max(0, Math.floor(progress / 20)));
}

export function GenerationProgress({ jobId, onCancel }: GenerationProgressProps) {
  const orchestrationPhase = usePresentationStore((s) => s.editor.orchestrationPhase);
  const deckGenerationLifecycle = usePresentationStore((s) => s.editor.deckGenerationLifecycle);
  const [jobStepIndex, setJobStepIndex] = useState(0);

  useEffect(() => {
    if (!jobId) {
      setJobStepIndex(0);
      return;
    }

    const controller = new AbortController();
    let buffer = '';

    (async () => {
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/stream`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSseEvents(buffer);
          buffer = rest;

          for (const block of events) {
            const payload = parseSseDataLine(block);
            if (!payload) continue;
            if (payload.status === 'completed') {
              setJobStepIndex(4);
              continue;
            }
            if (typeof payload.progress === 'number') {
              setJobStepIndex(stepIndexFromJobProgress(payload.progress));
            }
          }
        }
      } catch {
        /* aborted or stream ended */
      }
    })();

    return () => controller.abort();
  }, [jobId]);

  const activeStepIndex = useMemo(() => {
    if (jobId) {
      const fromStore = stepIndexFromPhase(orchestrationPhase, deckGenerationLifecycle);
      return Math.max(jobStepIndex, fromStore);
    }
    return stepIndexFromPhase(orchestrationPhase, deckGenerationLifecycle);
  }, [jobId, jobStepIndex, orchestrationPhase, deckGenerationLifecycle]);

  return (
    <div
      className="mb-3 rounded-2xl border border-black/[0.07] bg-white/90 p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      role="status"
      aria-live="polite"
      aria-label="Generation progress"
    >
      <ul className="space-y-2">
        {STEPS.map((label, i) => {
          const isActive = i === activeStepIndex;
          const isDone = i < activeStepIndex;
          return (
            <li key={label} className="flex items-center gap-2.5">
              <span
                className={`relative flex h-2 w-2 shrink-0 rounded-full transition-colors ${
                  isDone
                    ? 'bg-primary'
                    : isActive
                      ? 'bg-primary gen-progress-pulse'
                      : 'bg-neutral-200'
                }`}
                aria-hidden
              />
              <span
                className={`text-[12px] font-medium transition-colors ${
                  isActive
                    ? 'text-neutral-900'
                    : isDone
                      ? 'text-neutral-500'
                      : 'text-neutral-400'
                }`}
              >
                {label}
                {isActive ? '…' : ''}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full h-8 rounded-lg border border-black/[0.08] bg-neutral-50 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
      >
        Cancel
      </button>
      <style jsx>{`
        @keyframes genProgressPulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(1.35);
          }
        }
        .gen-progress-pulse {
          animation: genProgressPulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
