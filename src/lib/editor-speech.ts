/**
 * Shared Web Speech setup for editor panels (GeneratePanel, MagicEditToolbar).
 * Mirrors landing HeroSection behavior: incremental results, final/interim handling,
 * accumulation across recognition restarts, and optional prefix when combining with typed text.
 */

export function resolveEditorSpeechLang(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  const list = [...(navigator.languages || []), navigator.language].filter(Boolean);
  for (const raw of list) {
    const tag = String(raw).trim().replace(/_/g, '-');
    const lower = tag.toLowerCase();
    if (lower.startsWith('fil') || lower.startsWith('tl')) return 'fil-PH';
    if (lower.startsWith('en-ph')) return 'en-PH';
    const enMatch = /^en-([a-z]{2})$/i.exec(lower);
    if (enMatch) return `en-${enMatch[1].toUpperCase()}`;
    if (lower === 'en' || lower.startsWith('en-')) break;
  }
  return 'en-US';
}

export interface EditorSpeechOptions {
  /** Called with full transcript (typed prefix + voice finals + live interim) */
  onTranscript: (text: string) => void;
  onListeningEnd: () => void;
  shouldBeListeningRef: { current: boolean };
  speechLangRef: { current: string };
  onErrorMessage?: (message: string) => void;
  /** Set `.current` to the prompt in the field right before `rec.start()` so voice appends to typed text */
  promptPrefixRef?: { current: string };
}

type InternalState = {
  accumulated: string;
  interimLive: string;
  opts: EditorSpeechOptions;
};

const internalByRec = new WeakMap<any, InternalState>();

function applyPrefix(opts: EditorSpeechOptions, voiceText: string): string {
  const p = opts.promptPrefixRef?.current?.trim() ?? '';
  const v = voiceText.replace(/\s+/g, ' ').trim();
  if (!p) return v;
  if (!v) return p;
  return `${p} ${v}`.replace(/\s+/g, ' ').trim();
}

function emitTranscript(st: InternalState, voiceCombined: string) {
  st.opts.onTranscript(applyPrefix(st.opts, voiceCombined));
}

/** Clear per-session voice accumulation (call when opening the mic). */
export function resetEditorSpeechSession(rec: any) {
  const st = internalByRec.get(rec);
  if (st) {
    st.accumulated = '';
    st.interimLive = '';
  }
}

/**
 * Merge pending interim into finals and notify `onTranscript` (call before `stop()` so last words are kept).
 */
export function flushEditorSpeechInterim(rec: any) {
  const st = internalByRec.get(rec);
  if (!st) return;
  const t = st.interimLive.trim();
  st.interimLive = '';
  if (t) {
    const acc = st.accumulated;
    const spacer = acc && !acc.endsWith(' ') ? ' ' : '';
    st.accumulated = `${acc}${spacer}${t} `;
  }
  const voiceOnly = st.accumulated.replace(/\s+/g, ' ').trimEnd();
  emitTranscript(st, voiceOnly);
}

export function createEditorSpeechRecognition(opts: EditorSpeechOptions): any | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognitionAPI =
    (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition ||
    (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition;
  if (!SpeechRecognitionAPI) return null;

  const rec = new SpeechRecognitionAPI();
  rec.continuous = true;
  rec.interimResults = true;
  try {
    rec.maxAlternatives = 5;
  } catch {
    /* older engines */
  }
  rec.lang = opts.speechLangRef.current;

  const st: InternalState = { accumulated: '', interimLive: '', opts };
  internalByRec.set(rec, st);

  rec.onresult = (event: any) => {
    let newFinal = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      let best = result?.[0];
      if (result?.length && result.length > 1) {
        for (let j = 1; j < result.length; j++) {
          const cand = result[j];
          if (
            cand &&
            typeof cand.confidence === 'number' &&
            typeof best?.confidence === 'number' &&
            cand.confidence > best.confidence
          ) {
            best = cand;
          }
        }
      }
      const text = String(best?.transcript || '').trim();
      if (!text) continue;
      if (result.isFinal) newFinal += `${text} `;
      else interimText += `${text} `;
    }

    if (newFinal) {
      st.accumulated += newFinal;
    }

    const finals = st.accumulated.replace(/\s+/g, ' ').trimEnd();
    const interimNorm = interimText.replace(/\s+/g, ' ').trim();
    st.interimLive = interimNorm;
    const voiceCombined = [finals, interimNorm].filter(Boolean).join(' ');
    emitTranscript(st, voiceCombined);
  };

  rec.onerror = (event: any) => {
    if (event.error === 'not-allowed') {
      opts.shouldBeListeningRef.current = false;
      opts.onListeningEnd();
      opts.onErrorMessage?.('Microphone blocked or hardware in use.');
    } else if (event.error === 'language-not-supported') {
      if (opts.speechLangRef.current !== 'en-US') {
        opts.speechLangRef.current = 'en-US';
        try {
          rec.lang = 'en-US';
        } catch {
          /* noop */
        }
        opts.onErrorMessage?.('Switched to English (US) for recognition.');
      }
    } else if (event.error === 'service-not-allowed') {
      opts.shouldBeListeningRef.current = false;
      opts.onListeningEnd();
      opts.onErrorMessage?.('Voice needs HTTPS (or localhost) and a supported browser.');
    } else if (event.error === 'network') {
      opts.onErrorMessage?.('Network error. Check your connection.');
    } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('[EditorSpeech]', event.error);
    }
  };

  rec.onend = () => {
    if (opts.shouldBeListeningRef.current) {
      setTimeout(() => {
        if (!opts.shouldBeListeningRef.current) return;
        try {
          rec.lang = opts.speechLangRef.current;
          rec.start();
        } catch {
          /* already started */
        }
      }, 220);
    } else {
      opts.onListeningEnd();
    }
  };

  return rec;
}
