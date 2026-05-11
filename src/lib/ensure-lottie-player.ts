/** Single global load for @lottiefiles/lottie-player — avoids duplicate <script> and CustomElementRegistry errors. */

const LOTTIE_SCRIPT_ID = 'lottie-player-script';
const LOTTIE_SRC =
  'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';

export function ensureLottiePlayerScript(): void {
  if (typeof window === 'undefined') return;
  if (customElements.get('lottie-player')) return;
  if (document.getElementById(LOTTIE_SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = LOTTIE_SCRIPT_ID;
  script.src = LOTTIE_SRC;
  script.async = true;
  document.body.appendChild(script);
}
