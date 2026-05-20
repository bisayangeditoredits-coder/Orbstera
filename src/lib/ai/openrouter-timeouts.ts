/** Default OpenRouter HTTP timeouts (ms). Override per call via OpenRouterOptions.timeoutMs */
export const OPENROUTER_TIMEOUT = {
  complete: 120_000,
  stream: 180_000,
  orchestrationStep: 90_000,
} as const;

export function openRouterFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
