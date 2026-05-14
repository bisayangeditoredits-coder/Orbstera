/**
 * Writes electron/generated/load-url.json for packaged Electron builds.
 * Reads ORBSTERA_LOAD_URL or NEXT_PUBLIC_APP_URL from the environment.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const url = (process.env.ORBSTERA_LOAD_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
if (!url) {
  console.error('[write-electron-load-url] Set ORBSTERA_LOAD_URL or NEXT_PUBLIC_APP_URL before packaging.');
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error('[write-electron-load-url] Invalid URL:', url);
  process.exit(1);
}

const dir = path.join(root, 'electron', 'generated');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'load-url.json');
fs.writeFileSync(out, `${JSON.stringify({ loadUrl: url }, null, 2)}\n`, 'utf8');
console.log('[write-electron-load-url] Wrote', out);
