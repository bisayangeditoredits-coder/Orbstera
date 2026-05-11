/**
 * Map getUserMedia / mic errors to actionable copy (avoid blaming "permissions" for every failure).
 */
export function explainGetUserMediaError(err: unknown): string {
  const e = err as DOMException | undefined;
  const name = e?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone access was denied. Click the lock or tune icon in the address bar → Site settings → allow Microphone, then try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone was found. Plug in a mic or enable one in Windows Sound settings.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The microphone is busy or unavailable. Close other apps using the mic (calls, Discord, OBS), then try again.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'The browser could not use your microphone with these settings. Try Chrome or Edge.';
    case 'AbortError':
      return 'The microphone request was cancelled. Tap again to retry.';
    case 'SecurityError':
      return 'Microphone is blocked by security policy. Use HTTPS (or localhost) with a supported browser.';
    default:
      if (err instanceof TypeError) {
        return 'Microphone API is not available in this browser. Use a current Chrome or Edge.';
      }
      return '';
  }
}

/** SpeechRecognition.start() often throws InvalidStateError if the engine is still running. */
export function explainRecognitionStartError(err: unknown): string {
  const e = err as DOMException | undefined;
  if (e?.name === 'InvalidStateError') {
    return 'Voice recognition was still active. Wait a second and tap again.';
  }
  return '';
}
