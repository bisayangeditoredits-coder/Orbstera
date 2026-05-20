/**
 * Export worker — in-process PPTX by default (no Vercel callback).
 * EXPORT_WORKER_INLINE=false → legacy HTTP callback worker.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.EXPORT_WORKER_INLINE === 'false') {
  await import('./process-export-jobs-legacy.mjs');
} else {
  const tsxScript = path.join(__dirname, 'run-export-worker.ts');
  const child = spawn('npx', ['tsx', tsxScript], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}
