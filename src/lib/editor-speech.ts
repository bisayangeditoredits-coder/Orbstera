/**
 * Shared Web Speech setup for editor panels (GeneratePanel, MagicEditToolbar).
 * Handles full-session transcript, auto-restart on onend, and browser quirks.
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
  /** Called with full transcript (final + interim) each onresult */
  onTranscript: (text: string) => void;
  /** Listening state for UI when session fully ends */
  onListeningEnd: () => void;
  /** User still wants to listen — restart after onend */
  shouldBeListeningRef: { current: boolean };
  speechLangRef: { current: string };
  onErrorMessage?: (message: string) => void;
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
  opts.speechLangRef.current = resolveEditorSpeechLang();
  rec.lang = opts.speechLangRef.current;

  rec.onresult = (event: any) => {
    let full = '';
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      let best = result?.[0];
      if (result?.length > 1) {
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
      full += String(best?.transcript || '');
    }
    const t = full.replace(/\s+/g, ' ').trim();
    opts.onTranscript(t);
  };

  rec.onerror = (event: any) => {
    if (event.error === 'not-allowed') {
      opts.shouldBeListeningRef.current = false;
      opts.onListeningEnd();
      opts.onErrorMessage?.('Microphone blocked. Allow access in browser settings.');
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
